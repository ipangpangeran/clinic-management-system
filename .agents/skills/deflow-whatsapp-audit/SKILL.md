---
name: deflow-whatsapp-audit
description: >-
  Aturan bisnis dan guardrail teknis integrasi WhatsApp Gateway & Cron Reminder DEFLOW.
  Wajib digunakan saat mengonfigurasi cron job reminder jadwal, template pesan WhatsApp,
  pencegahan double-blast/spam, validasi status antrean sebelum pengiriman, serta normalisasi nomor telepon.
---

# DEFLOW WhatsApp Integration & Reminder Audit Guardrail

Sistem notifikasi WhatsApp di DEFLOW berfungsi mengirimkan konfirmasi reservasi, pengingat jadwal appointment (H-1 / H-Day), ucapan pasca-treatment, serta pengingat kuota paket. Kesalahan pada modul ini dapat menyebabkan nomor WhatsApp resmi klinik diblokir (*banned*), pasien terganggu oleh pesan ganda (*double-blast*), atau kebocoran pesan nyasar kepada pasien yang jadwalnya sudah dibatalkan (*cancelled*).

---

## 1. Core Invariants (Aturan Absolut)

1. **Idempotency & Anti Double-Blast (Pencegahan Pesan Duplikat)**:
   - Setiap pesan otomatis yang dikirim oleh cron atau sistem **WAJIB MEMILIKI KUNCI IDEMPOTENSI UNIK** sebelum dikirim ke gateway.
   - Format kunci idempotensi:
     ```
     idempotency_key = `${patient_id}_${appointment_id}_${reminder_type}_${target_date_ymd}`
     ```
   - Sebelum mengirim, sistem wajib memeriksa tabel `whatsapp_logs`:
     ```sql
     SELECT id, status FROM whatsapp_logs WHERE idempotency_key = ?;
     ```
     Jika record sudah ada dengan status `'SENT'` atau status `'PENDING'` dalam kurun waktu kurang dari 12 jam, pengiriman **WAJIB DIBATALKAN / DILEWATI (SKIPPED)**.

2. **Status Transition Guard (Pencegahan Pesan Nyasar)**:
   - Sebelum pesan dikirim ke gateway (bahkan jika sudah masuk antrean cron), sistem **WAJIB MELAKUKAN REAL-TIME CHECK** ke status terkini appointment:
     ```javascript
     const appointment = await getQuery('SELECT status FROM appointments WHERE id = ?', [apptId]);
     if (!['CONFIRMED', 'SCHEDULED'].includes(appointment.status)) {
       // Status berubah jadi CANCELLED, NO_SHOW, RESCHEDULED, atau COMPLETED
       // DILARANG KIRIM PESAN! Batalkan pengiriman.
       return markLogAsCancelled(logId, 'Status appointment sudah tidak aktif: ' + appointment.status);
     }
     ```
   - **DILARANG KERAS**: Mengirim pesan pengingat jadwal kepada pasien yang sudah membatalkan janji temu (*cancelled*).

3. **Normalisasi Nomor Telepon Indonesia (E.164 Clean Format)**:
   - Semua nomor telepon wajib dibersihkan dari spasi, tanda strip, titik, dan karakter non-angka:
     ```javascript
     function normalizeIndonesianPhone(phone) {
       if (!phone) return null;
       let cleaned = String(phone).replace(/\D/g, ''); // hanya angka
       if (cleaned.startsWith('0')) {
         cleaned = '62' + cleaned.slice(1);
       } else if (cleaned.startsWith('62')) {
         // sudah benar
       } else if (cleaned.startsWith('8')) {
         cleaned = '62' + cleaned;
       }
       // Validasi panjang nomor HP Indonesia (10 - 14 digit)
       if (/^628[1-9][0-9]{7,11}$/.test(cleaned)) {
         return cleaned;
       }
       return null; // Nomor tidak valid
     }
     ```

4. **Rate Limiting & Queue Throttling (Anti Banned / Anti Spam)**:
   - Pengiriman pesan massal via cron **DILARANG MENGGUNAKAN `Promise.all()` TANPA JEDA**.
   - Setiap pengiriman antar pesan wajib diberi jeda minimal 2 sampai 5 detik (*delay throttling*):
     ```javascript
     for (const reminder of pendingReminders) {
       await sendWhatsAppMessage(reminder);
       await new Promise(resolve => setTimeout(resolve, 3000)); // Delay 3 detik antar pesan
     }
     ```
   - Batasi pengiriman harian sesuai kuota provider gateway (misal Fonnte/Wablas/Twilio).

5. **Proteksi Privasi Medis (Medical Privacy Guard)**:
   - Template pesan WhatsApp **TIDAK BOLEH MEMUAT INFORMASI MEDIS SPESIFIK YANG MEMALUKAN / PRIVAT** (misal: diagnosa penyakit kulit sensitif, keluhan genital, resep obat keras) di teks terbuka tanpa enkripsi.
   - Gunakan bahasa sopan klinik estetika standar:
     *Contoh Baik*: *"Halo Kak {nama}, ini pengingat janji temu treatment estetika Anda di DEFLOW Clinic besok pada jam {jam} bersama {dokter/beautician}."*

6. **Non-Blocking Execution (Graceful Degradation)**:
   - Jika layanan gateway WhatsApp mengalami *timeout*, down, atau error saldo habis, **DILARANG MEMBIARKAN ERROR MERUSAK (CRASH) FLOW UTAMA KLINIK** (seperti proses pendaftaran pasien atau checkout kasir).
   - Seluruh pemanggilan fungsi kirim WA wajib dibungkus dalam blok `try { ... } catch (err) { logger.warn('WA gateway failed', err); }` secara asynchronous di background.

---

## 2. File & Tabel Terkait

- **Backend Logic & Workers**:
  - `server/server.js` (Inisialisasi cron job scheduler via `node-cron`)
  - `server/whatsappService.js` (Fungsi integrasi HTTP ke provider WhatsApp)
  - `server/cron/reminderCron.js` (Worker pengingat jadwal H-1 dan H-0)
- **Database Tables**:
  - `whatsapp_logs` (`id`, `idempotency_key`, `patient_id`, `phone_number`, `message_type`, `template_name`, `message_payload`, `status`, `response_log`, `sent_at`, `created_at`)
  - `appointments` (`id`, `patient_id`, `doctor_id`, `schedule_date`, `schedule_time`, `status`)
  - `whatsapp_templates` (`id`, `name`, `template_body`, `variables_json`, `is_active`)

---

## 3. Anti-Regression Checklist (Wajib Lolos Sebelum Merge)

> [!CAUTION]
> Dilarang menyentuh cron worker dan template WA tanpa memverifikasi daftar cek berikut.

- [ ] **Idempotency Key Active**: Pastikan kolom `idempotency_key` di tabel `whatsapp_logs` memiliki constraint `UNIQUE` atau dicek ketat sebelum request HTTP dibuat.
- [ ] **Pre-Send Status Check**: Pastikan ada query verifikasi status appointment sesaat sebelum fungsi `sendWhatsAppMessage` dipanggil di dalam loop cron.
- [ ] **Delay Throttling Active**: Pastikan ada interval jeda minimal 2000ms antar iterasi pengiriman pesan pada worker cron.
- [ ] **Variable Sanitization**: Uji template dengan nama pasien atau dokter yang mengandung karakter kutip atau `undefined`; pastikan pesan tidak terkirim dengan teks mentah `Halo {patient_name}, undefined`.
- [ ] **Phone Number Sanitization**: Verifikasi bahwa nomor dengan awalan `+62`, `08`, `628`, spasi, atau tanda strip berhasil dinormalisasi ke format `628xxxxxxxx`.
- [ ] **Catch All Gateway Errors**: Matikan koneksi internet / simulasikan error gateway; pastikan API reservasi di frontend tetap berhasil dan mengembalikan respons sukses bagi pasien dengan log warning di backend.

---

## 4. Do's & Don'ts

### Do's:
- Simpan ID pesan dan respons log mentah dari gateway WhatsApp di tabel `whatsapp_logs` untuk audit jejak pengiriman jika pasien komplain.
- Sediakan tombol switch `is_whatsapp_enabled` di pengaturan klinik agar admin dapat mematikan seluruh blast WA seketika jika terjadi keadaan darurat.
- Jadwalkan cron pengingat appointment H-1 di jam kerja yang ramah pasien (misal jam 09:00 - 18:00 WIB), jangan jalankan blast di tengah malam (22:00 - 06:00 WIB).

### Don'ts:
- **JANGAN** pernah mengirimkan blast promosi atau marketing secara membabi buta tanpa fitur opt-out (pemberian pilihan berhenti berlangganan kepada pasien).
- **JANGAN** membuat cron job yang melakukan `SELECT * FROM appointments` tanpa memfilter tanggal dan status (`WHERE schedule_date = DATE('now', '+1 day') AND status = 'CONFIRMED'`).
- **JANGAN** menyimpan token / API Key gateway WhatsApp di dalam script JavaScript atau git repository. Selalu gunakan `process.env.WHATSAPP_API_TOKEN`.
