---
name: deflow-patient-packages
description: "Aturan pengelolaan data pasien (Trial vs Reguler), kuota paket treatment, histori klaim tindakan, point dari member get member (MGM) dan integrasi WhatsApp reminder."
---

# DEFLOW Patient Intake & Package Management Playbook

## Files Terkait
- Frontend: `client/src/pages/PatientManagement.jsx`, `client/src/pages/StaffMobilePortal.jsx`
- Backend: `server/server.js` (`/api/patients/*`, `/api/packages/*`, `/api/treatments/*`)
- Database: Tabel `patients`, `patient_packages`, `treatment_claims`, `reminders`

## Aturan Bisnis & Validasi
1. **Identitas Pasien:**
   - No. HP dan No. KTP adalah unik.
   - Pasien Trial hanya memerlukan minimal data kontak & nama. Jika beralih ke Reguler, update record yang ada, jangan buat record duplikat.
2. **Paket Treatment & Quota Claim:**
   - Kuota paket berkurang hanya ketika tindakan sudah berstatus `SELESAI / CLAIMED`.
   - Pencatatan klaim tindakan wajib menyertakan ID petugas medis (Dokter / Terapis / Perawat) yang mengerjakan untuk dasar komisi.
   - Sisa sesi treatment tidak boleh minus (`quantity >= 1`).
3. **Export & Laporan:**
   - Detail riwayat klaim tindakan yang di-export ke Excel harus menampilkan nama exact paket/tindakan (gunakan utility `excelExport.js`).
4. **Pencatatan di Database:**
   - Selalu gunakan transaksi database untuk memastikan konsistensi data.
   - Selalu gunakan timezone `Asia/Jakarta` (GMT+7) untuk pencatatan timestamp.

## Instruksi untuk Antigravity Agent
- Jika memodifikasi flow pendaftaran di `PatientManagement.jsx`, pastikan field mandatory form tidak memblokir intake pasien tipe Trial.
- Jangan mengubah logika timestamp klaim tanpa memastikan format konsisten (`YYYY-MM-DD HH:mm:ss`).