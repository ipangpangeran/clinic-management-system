---
name: deflow-patient-packages
description: >-
  Aturan bisnis dan guardrail teknis modul Paket Treatment Pasien DEFLOW. Wajib digunakan
  saat mengelola pembelian paket sesi treatment, tracking kuota, eksekusi klaim paket
  (prepaid Rp 0), integrasi antrean doingan petugas, serta masa berlaku paket.
---

# DEFLOW Patient Packages Guardrail

Modul Paket Treatment memungkinkan pasien membeli serangkaian sesi treatment (misal Paket 5x Laser Rejuvenation / Paket 3x Peeling Glow) di muka dengan harga paket khusus. Pengelolaan kuota dan klaim treatment harus dijaga ketat agar tidak terjadi kehilangan pendapatan klinik, kuota minus, atau komisi ganda.

---

## 1. Core Invariants (Aturan Absolut)

1. **Pembelian Paket (Initial Purchase)**:
   - Terjadi di Kasir POS sebagai item tipe `package`.
   - Menghasilkan record baru di tabel `patient_packages`:
     - `total_quota`: jumlah sesi yang dibeli (misal: 5).
     - `remaining_quota`: awalnya bernilai sama dengan `total_quota`.
     - `expired_at`: tanggal kadaluarsa (sesuai konfigurasi paket, misal 6 atau 12 bulan dari tanggal beli).
     - `status`: `'ACTIVE'`.
   - **Komisi Marketing/Penjualan**: Diberikan pada saat transaksi pembelian awal paket ini (jika ada marketing yang terasosiasi).

2. **Klaim Paket (Session Redemption)**:
   - Pasien datang untuk menjalani 1 sesi treatment dari paket yang sudah dibeli sebelumnya.
   - **Pemotongan Kuota Bersifat Atomic**:
     ```sql
     UPDATE patient_packages 
     SET remaining_quota = remaining_quota - 1,
         status = CASE WHEN remaining_quota - 1 = 0 THEN 'COMPLETED' ELSE 'ACTIVE' END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND remaining_quota > 0 AND status = 'ACTIVE';
     ```
   - Jika kuota sudah 0 atau paket kadaluarsa, transaksi klaim **WAJIB DITOLAK** dengan pesan error yang jelas.

3. **Status Finansial Klaim Paket di POS**:
   - Invoice klaim paket di POS bernilai **Rp 0 (Prepaid)**.
   - Pasien **TIDAK BOLEH** ditagih biaya lagi untuk sesi paket yang diklaim (kecuali ada pembelian produk atau treatment tambahan di luar paket pada kunjungan yang sama).
   - DILARANG mengenakan PPN ulang pada invoice Rp 0 ini (pajak sudah diselesaikan pada saat pembelian paket awal).

4. **Aturan Komisi saat Klaim Paket**:
   - **Petugas Pelaksana (Beautician / Nurse / Dokter)**: **BERHAK** mendapatkan komisi pengerjaan tindakan sesuai rate standar jasa pengerjaan treatment tersebut.
   - **Marketing**: **TIDAK MENDAPATKAN KOMISI** saat klaim paket berlangsung (karena komisi marketing sudah dibayarkan di awal saat paket terjual).

5. **Integrasi ke Antrean Doingan Petugas**:
   - Klaim paket langsung memicu antrean pengerjaan (Doingan) ke petugas yang dipilih.
   - Cek status kesibukan petugas (`is_busy`): Petugas yang sedang melayani pasien lain (`is_busy = 1` / `🔴`) dilarang di-assign tanpa validasi atau antrean tunggu berurutan.

---

## 2. File & Tabel Terkait

- **Backend Controller / Logic**:
  - `server/server.js` (Endpoint `/api/patient-packages`, `/api/patient-packages/claim`, `/api/patients/:id/packages`)
  - `server/db.js` (Stored queries / transaction logic)
- **Frontend Pages & Components**:
  - `client/src/pages/PatientManagement.jsx` (Modal Klaim Paket & Riwayat Paket Pasien)
  - `client/src/pages/DoinganActivity.jsx` (Daftar antrean pengerjaan tindakan dari klaim paket)
  - `client/src/pages/PackageManagement.jsx` (Katalog master paket)
- **Database Tables**:
  - `packages` (`id`, `name`, `treatment_id`, `session_count`, `price`, `validity_days`, `is_active`)
  - `patient_packages` (`id`, `patient_id`, `package_id`, `transaction_id`, `total_quota`, `remaining_quota`, `expired_at`, `status`, `created_at`)
  - `package_claims` (`id`, `patient_package_id`, `patient_id`, `staff_id`, `session_number`, `claim_notes`, `claimed_at`)
  - `commissions` (`staff_id`, `commission_type = 'PACKAGE_CLAIM'`, `nominal`)

---

## 3. Anti-Regression Checklist (Wajib Lolos Sebelum Merge)

> [!CAUTION]
> Dilarang mengubah alur klaim paket tanpa memverifikasi poin-poin krusial berikut.

- [ ] **Atomic Quota Decrement**: Pastikan query update kuota menggunakan klausul `WHERE remaining_quota > 0`. Jangan pernah melakukan `read in memory -> modify -> write back` tanpa transaction lock di SQLite.
- [ ] **Masa Kadaluarsa Paket**: Verifikasi paket dengan `expired_at < CURRENT_DATE` tidak dapat diklaim tanpa override izin Super Admin.
- [ ] **Komisi Petugas vs Marketing**: Pastikan tabel komisi hanya membuat entri untuk `staff_id` (petugas pelaksana), dan mengabaikan marketing ID pada aksi klaim paket.
- [ ] **Doingan Queue Sync**: Pastikan saat paket berhasil diklaim, record antrean doingan masuk ke dashboard `DoinganActivity.jsx` dengan badge `[KLAIM PAKET]` dan nominal Rp 0.
- [ ] **Reversal saat Pembatalan Klaim**: Jika sesi klaim dibatalkan sebelum tindakan dimulai, kuota `remaining_quota` wajib bertambah kembali (+1) dan status paket kembali menjadi `'ACTIVE'`.

---

## 4. Do's & Don'ts

### Do's:
- Selalu tampilkan sisa kuota dan tanggal expired secara jelas di UI profil pasien: `Sisa Kuota: 3 / 5 Sesi (Exp: 24 Des 2026)`.
- Validasi keberadaan paket aktif sebelum menampilkan opsi klaim di frontend.
- Log setiap aksi klaim lengkap dengan `user_id` yang memproses, `staff_id` pelaksana tindakan, dan catatan area pengerjaan.

### Don'ts:
- **JANGAN** pernah membiarkan `remaining_quota` bernilai negatif (< 0).
- **JANGAN** membuat transaksi klaim paket mengubah status tagihan pasien menjadi piutang.
- **JANGAN** mengubah harga paket master secara retrospektif mempengaruhi saldo/kuota paket yang sudah dibeli sebelumnya oleh pasien.
