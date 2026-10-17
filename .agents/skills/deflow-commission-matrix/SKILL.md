---
name: deflow-commission-matrix
description: >-
  Aturan bisnis dan guardrail teknis kalkulasi Matriks Komisi DEFLOW. Wajib digunakan saat
  mengubah formula komisi dokter, beautician, nurse, front office, dan marketing, baik
  berupa persentase, nominal flat, bagi hasil tindakan bersama, maupun komisi penjualan produk/paket.
---

# DEFLOW Commission Matrix Guardrail

Sistem komisi klinik DEFLOW mengatur remunerasi performa bagi seluruh lini profesi (Dokter, Nurse, Beautician, Front Office/Kasir, dan Marketing). Integritas kalkulasi ini sangat krusial karena berhubungan langsung dengan penggajian bulanan staf dan kepuasan tim klinik.

---

## 1. Core Invariants (Aturan Absolut)

1. **Prinsip Pembayaran Lunas (PAID Only)**:
   - Komisi **HANYA BOLEH DIHITUNG & DIKREDITKAN** jika transaksi kasir berstatus `'PAID'`.
   - Transaksi dengan status `PENDING`, `DRAFT`, `CANCELLED`, atau `VOID` **TIDAK BERHAK** menghasilkan komisi aktif.
   - Jika transaksi berstatus `PAID` kemudian di-`VOID`, seluruh baris komisi yang terhubung wajib diubah statusnya menjadi `'VOIDED'` atau dibuatkan jurnal pembalik (reversal).

2. **Lini Profesi & Skema Komisi Standar**:
   - **Dokter**:
     - *Jasa Medis Tindakan*: Persentase (misal 15-30% dari harga nett tindakan) ATAU nominal flat per jenis tindakan dokter.
     - *Komisi Resep/Produk*: Persentase atas produk skincare/obat resep yang direkomendasikan dokter dalam sesi konsultasi.
   - **Beautician**:
     - *Tindakan Treatment Non-Medis (Facial/Body)*: Nominal flat per treatment atau persentase jasa pengerjaan.
     - *Klaim Paket Treatment*: Berhak atas fee pengerjaan standar sesuai tindakan yang dikerjakan.
   - **Nurse**:
     - *Tindakan Medis / Asistensi Dokter*: Fee pengerjaan mandiri atau fee asisten tindakan dokter.
   - **Marketing**:
     - *Komisi Pasien Baru (MGM)*: Bonus referral pertama kali pasien bertransaksi.
     - *Komisi Penjualan Paket & Produk*: Diberikan saat pembelian awal paket di kasir berstatus `PAID`. **TIDAK DAPAT** komisi saat pasien melakukan klaim sesi paket di kemudian hari.
   - **Kasir / FO**:
     - Fee administrasi / insentif omset harian sesuai target klinik (jika aktif).

3. **Aturan Tandem / Pembagian Tindakan Bersama**:
   - Jika satu tindakan dikerjakan oleh lebih dari satu orang petugas (misal Beautician Utama + Asisten), pembagian komisi wajib mengikuti persentase baku matriks (contoh: 70% Pelaksana Utama, 30% Asisten).
   - Total komisi yang dibagikan **TIDAK BOLEH MELEBIHI 100%** dari alokasi budget komisi item tersebut.

4. **Basis Perhitungan (Gross vs Net)**:
   - Standar klinik DEFLOW: Komisi persentase dihitung dari **Nett Item Price** (harga jual setelah dikurangi diskon item), **BUKAN** dari harga kotor sebelum diskon.
   - Pajak PPN **TIDAK BOLEH** dimasukkan ke dalam basis perhitungan komisi dokter/staf.

5. **Dilarang Hardcoding**:
   - **HARAM HUKUMNYA** menuliskan ID staf spesifik atau nama individu di dalam logika kode program (contoh: `if (staffName === 'dr. Sarah') commission = 50000`).
   - Semua parameter komisi wajib dibaca dari tabel konfigurasi `commission_rules` / `commission_matrix` berdasarkan `role`, `tier`, `item_type`, dan `treatment_id`.

---

## 2. File & Tabel Terkait

- **Backend Controller / Logic**:
  - `server/server.js` (Endpoint `/api/commissions`, generator komisi saat checkout `POST /api/transactions/checkout`)
  - `server/db.js` (Logika kalkulasi dan laporan rekap komisi)
- **Frontend Pages & Components**:
  - `client/src/pages/CommissionReport.jsx` atau modul Rekap Komisi Staf
  - `client/src/pages/StaffManagement.jsx` (Konfigurasi role, lini profesi, dan rate komisi)
- **Database Tables**:
  - `commissions` (`id`, `transaction_id`, `transaction_item_id`, `staff_id`, `role`, `commission_type`, `base_amount`, `rate_percentage`, `nominal`, `status`, `created_at`)
  - `commission_rules` (`id`, `role`, `item_type`, `target_id`, `rate_type`, `rate_value`, `is_active`)
  - `users` (`id`, `full_name`, `role`, `lini_profesi`, `commission_tier`)

---

## 3. Anti-Regression Checklist (Wajib Lolos Sebelum Merge)

> [!CAUTION]
> Dilarang mengubah kode komisi tanpa memeriksa dan memastikan 6 poin berikut.

- [ ] **Status Filter Check**: Pastikan query rekap komisi bulanan memfilter `WHERE status = 'ACTIVE'` atau `WHERE status = 'PAID'` dan secara ketat mengecualikan status `'VOIDED'`.
- [ ] **Klaim Paket Exclusion for Marketing**: Verifikasi pada saat eksekusi klaim paket (`POST /api/patient-packages/claim`), marketing ID **tidak** dimasukkan ke tabel `commissions`.
- [ ] **Net vs Gross Base**: Pastikan jika ada diskon item (misal diskon 20%), komisi dokter/beautician dihitung dari nominal setelah diskon.
- [ ] **Atomic Creation**: Generator komisi wajib berada di dalam satu transaksi database dengan update status pembayaran `transactions`.
- [ ] **Double Assignment Prevention**: Pastikan jika satu item transaksi sudah di-generate komisinya, tidak ada script cron atau worker yang men-generate ulang komisi untuk `transaction_item_id` yang sama.
- [ ] **Pemberian Asisten/Tandem**: Jika ada 2 staff terlampir pada 1 tindakan, pastikan nominal komisi terpisah menjadi 2 baris terpisah di tabel `commissions` dengan label role yang tepat (`Pelaksana` vs `Asisten`).

---

## 4. Do's & Don'ts

### Do's:
- Selalu simpan `rate_percentage` dan `nominal` historis saat transaksi terjadi di tabel `commissions`, sehingga perubahan master rate di masa depan tidak mengubah histori komisi masa lalu.
- Sediakan endpoint audit trail komisi untuk keperluan verifikasi oleh bagian Keuangan/Finance.
- Gunakan integer rounding untuk nominal komisi (tidak ada pecahan desimal Rupiah).

### Don'ts:
- **JANGAN** membuat komisi menjadi floating balance yang berubah setiap kali master treatment diedit.
- **JANGAN** pernah mengizinkan staf mengedit atau meng-approve komisinya sendiri tanpa wewenang Admin/Super Admin.
- **JANGAN** mencampuradukkan komisi tindakan dengan reimbursement kas kecil operasional.
