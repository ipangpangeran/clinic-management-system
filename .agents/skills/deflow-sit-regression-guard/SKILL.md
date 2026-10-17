---
name: deflow-sit-regression-guard
description: >-
  Panduan wajib dan guardrail teknis sebelum melakukan commit, merge, atau push perbaikan
  bug hasil temuan System Integration Testing (SIT) DEFLOW. Mengatur isolasi scope perubahan,
  analisis dampak cascading effect antar modul, serta larangan refactoring liar di luar tiket.
---

# DEFLOW SIT Regression Guard

Selama fase System Integration Testing (SIT) dan stabilisasi pra-rilis, stabilitas sistem adalah prioritas nomor satu. Bug fix yang ceroboh atau refactoring tanpa batas sering memicu *ripple effects* yang merusak modul lain yang sebelumnya sudah disetujui (sign-off) oleh QA dan user klinik.

---

## 1. Core Invariants (Aturan Absolut)

1. **Prinsip Isolasi Scope Perubahan (Strict Ticket Scope)**:
   - Developer/AI Agent **HANYA BOLEH** mengubah kode yang berhubungan langsung dengan akar masalah pada tiket temuan SIT.
   - **DILARANG MELAKUKAN "OPPORTUNISTIC REFACTORING"**: Dilarang merombak arsitektur, mengubah nama fungsi global, mengganti library, atau memformat ulang seluruh file (formatting massal) di luar lingkup tiket bug yang sedang dikerjakan.
   - Satu branch / commit hanya menyelesaikan satu isu atau satu kelompok isu yang berelasi erat.

2. **Dilarang Merombak Kontrak API Tanpa Backward Compatibility**:
   - Jika mengubah respons endpoint Express (`server/server.js`), field lama **DILARANG DIHAPUS** jika masih dikonsumsi oleh komponen frontend lain.
   - Jika perlu menambah data, tambahkan sebagai field baru (*additive changes*).

3. **Verifikasi Matriks Dampak Cascading (Cascading Effect Matrix)**:
   Sebelum menyentuh satu modul, wajib mengidentifikasi ketergantungan silang:
   
   | Modul yang Diubah | Modul Terdampak yang Wajib Diuji Ulang | Potensi Risiko Regresi |
   | :--- | :--- | :--- |
   | **Registrasi & Antrean** | Doingan Petugas, Rekam Medis, Kasir | Status pasien tidak sinkron, petugas tidak muncul di dropdown, data RM hilang. |
   | **Doingan Petugas** | Antrean Pasien, Matriks Komisi, Sisa Kuota Paket | Status `is_busy` nyangkut, komisi tindakan tidak tercatat, kuota paket terpotong ganda. |
   | **Kasir & Billing POS** | Laporan Keuangan, Stok Obat/Produk, Poin MGM, Komisi Staf | Selisih kas, stok negatif, dobel komisi, perhitungan PPN/diskon salah. |
   | **Paket Treatment** | Kasir POS, Antrean Doingan, Riwayat Pasien | Sisa kuota minus, invoice klaim tertagih biaya, expired date tidak terdeteksi. |
   | **Master Data (User/Layanan)** | Semua Dropdown, Otorisasi Role, Formula Komisi | Error null pointer di frontend saat lookup ID lama. |

4. **Verifikasi Integritas Tipe Data & Format Uang**:
   - Seluruh kalkulasi yang melibatkan nominal uang, poin, diskon, dan kuota wajib diverifikasi agar tidak menghasilkan tipe `NaN`, `null`, `undefined`, atau angka floating point anomali.

---

## 2. File & Area Sensitif yang Memerlukan Validasi Ganda

- `server/server.js`:
  - Route `/api/transactions/checkout` (Jantung billing kasir)
  - Route `/api/patient-packages/claim` (Pemotongan kuota & pemicu doingan)
  - Route `/api/patients` & `/api/appointments/status` (Pergeseran status antrean)
- `server/db.js`:
  - Inisialisasi skema tabel & query helper
- `client/src/pages/PatientManagement.jsx`:
  - State antrean & registrasi pasien
- `client/src/pages/CashierBilling.jsx`:
  - State cart, multi-payment, dan kalkulasi diskon/PPN
- `client/src/pages/DoinganActivity.jsx`:
  - Status kesibukan staff (`is_busy`) dan penyelesaian tindakan

---

## 3. SIT Anti-Regression Checklist (Wajib Dicek Sebelum Commit)

> [!CAUTION]
> Jangan lakukan commit perbaikan sebelum seluruh checklist ini dijawab "YA" atau "VERIFIED".

- [ ] **Scope Isolation Verified**: Apakah perubahan kode hanya menyentuh file yang relevan dengan tiket bug? (Pastikan tidak ada file yang tidak sengaja termodifikasi).
- [ ] **Cascading Verification**: Apakah alur sebelum dan sesudah modul yang diperbaiki sudah dites?
  - *Contoh: Jika memperbaiki bug diskon kasir, apakah pembuatan komisi staf dan pengurangan stok obat setelah checkout tetap berjalan normal?*
- [ ] **Zero Console Error**: Buka DevTools console di browser; pastikan tidak ada React warning seperti *uncontrolled to controlled input*, *missing key prop*, atau unhandled Promise rejection.
- [ ] **Frontend Build Verification**: Jalankan perintah `npm run build` di direktori `client/`. Pastikan build Vite sukses tanpa error linting atau syntax.
- [ ] **Backend Runtime Check**: Pastikan server Express dapat start secara bersih tanpa error query SQLite atau dependency hilang.
- [ ] **Data Safety**: Apakah ada perubahan skema database? Jika ya, apakah tabel eksisting tetap utuh dan data lama tidak terhapus?

---

## 4. Format Laporan Fixing Tiket SIT (Commit & PR Standard)

Setiap penyelesaian bug SIT wajib menyertakan ringkasan singkat dalam format:

```markdown
### [SIT FIX] <Nomor Tiket / Deskripsi Singkat>
- **Akar Masalah**: Penjelasan teknis singkat penyebab bug terjadi.
- **Solusi yang Diterapkan**: Kode/logika yang diperbaiki.
- **Area Terisolasi**: Daftar file yang dimodifikasi.
- **Uji Dampak (Cascading Test)**:
  - Modul Kasir: [PASSED / NOT APPLICABLE]
  - Modul Doingan: [PASSED / NOT APPLICABLE]
  - Modul Pasien: [PASSED / NOT APPLICABLE]
- **Status Build**: `npm run build` client lolos 100%.
```

---

## 5. Do's & Don'ts

### Do's:
- Selalu uji alur "Happy Path" dan "Edge Case / Error Path" setelah menerapkan fix.
- Buat snapshot cadangan database lokal sebelum menguji skenario ekstrem.
- Komunikasikan ke tim jika sebuah fix berpotensi memerlukan migrasi data historis.

### Don'ts:
- **JANGAN** pernah mengabaikan error kecil di console dengan asumsi "nanti saja diperbaiki".
- **JANGAN** mengubah logika validasi role pengguna tanpa konfirmasi Tech Lead.
- **JANGAN** melakukan bypass validasi backend hanya karena di frontend sudah ada validasi visual.
