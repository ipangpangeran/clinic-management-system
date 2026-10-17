---
name: deflow-pos-billing
description: >-
  Aturan bisnis dan guardrail teknis modul POS & Billing DEFLOW. Wajib digunakan saat
  memodifikasi logika kasir, perhitungan subtotal/diskon/PPN, Down Payment (DP),
  penggunaan dan akrual poin MGM, multi-payment, cetak struk, serta void transaksi.
---

# DEFLOW POS & Billing Guardrail

Modul Point of Sale (POS) dan Billing adalah pusat transaksi finansial klinik kecantikan DEFLOW. Perubahan logika pada modul ini memiliki dampak langsung pada kepatuhan pajak, akurasi laporan kas, komisi staf, dan saldo poin loyalitas pasien.

---

## 1. Core Invariants (Aturan Absolut)

1. **Formula Baku Perhitungan Transaksi**:
   ```
   gross_total   = SUM(item_price * quantity)
   item_discount = SUM(item_discount_amount)
   subtotal      = gross_total - item_discount
   bill_discount = global_voucher_or_manual_discount
   taxable_base  = subtotal - bill_discount
   ppn_amount    = (taxable_base * ppn_rate) [jika status PPN aktif]
   net_payable   = taxable_base + ppn_amount
   final_due     = net_payable - dp_deducted - point_redeemed_value
   ```
   - `final_due` **TIDAK BOLEH** menghasilkan angka negatif. Jika `point_redeemed_value + dp_deducted > net_payable`, sistem wajib membatasi potongan maksimal sebatas `net_payable`.
   - Pembulatan wajib dilakukan di level akhir atau per baris secara konsisten menggunakan pembulatan standar (`Math.round` ke satuan Rupiah terdekat, bukan truncation/`Math.floor`).

2. **Aturan Down Payment (DP / Uang Muka)**:
   - DP yang telah disetor pasien saat booking dicatat sebagai kewajiban titipan (liabilitas).
   - Saat pelunasan di kasir, DP dipotongkan sebagai pengurang `final_due`.
   - **DILARANG**: Menghitung DP dua kali (sebagai pendapatan baru di hari H pelunasan DAN sebagai potongan saldo).
   - Status invoice DP yang sudah dikonsumsi wajib ditandai `dp_used = 1` dengan relasi ke `final_transaction_id` agar tidak bisa dipakai ulang di transaksi lain.

3. **Aturan Poin Loyalitas MGM (Member Get Member)**:
   - Nilai tukar poin: 1 Point = nilai rupiah tetap (konfigurasi sistem).
   - Penggunaan poin (`points_redeemed`) memotong langsung tagihan kasir.
   - Akrual poin baru (`points_earned`): **HANYA** dihitung dari pembayaran uang riil (tunai, transfer, QRIS, kartu), **BUKAN** dari porsi tagihan yang dibayar menggunakan poin atau klaim paket prepaid.

4. **Multi-Payment & Split Bill**:
   - Total pembayaran (`SUM(payment_amounts)`) wajib **sama persis** dengan `final_due`.
   - Setiap rincian split payment wajib tercatat di tabel `transaction_payments` lengkap dengan metode (`Cash`, `QRIS`, `Transfer_BCA`, `Debit_Card`, `Credit_Card`, dll) dan nomor referensi.

5. **Void & Refund Transaksi**:
   - Transaksi yang sudah lunas (`PAID`) **DILARANG DIHAPUS (HARD DELETE)** dari database.
   - Pembatalan wajib menggunakan status `VOID` dengan mencatat `void_reason`, `voided_by`, dan timestamp.
   - Aksi VOID wajib melakukan **Atomic Reversal**:
     1. Kembalikan stok inventori/obat/produk yang terjual.
     2. Kembalikan saldo kuota paket jika ada klaim paket di dalam transaksi.
     3. Batalkan komisi staf yang sudah tergenerate (`status = 'VOIDED'`).
     4. Tarik kembali poin MGM yang baru saja dihadiahkan dari transaksi tersebut.
     5. Kembalikan poin MGM yang sempat dihabiskan pasien di transaksi tersebut.

---

## 2. File & Tabel Terkait

- **Backend Controller / Routes**:
  - `server/server.js` (Endpoint `/api/transactions`, `/api/transactions/checkout`, `/api/transactions/void/:id`)
  - `server/db.js` (Query transaksi, prepared statements)
- **Frontend Pages & Components**:
  - `client/src/pages/CashierBilling.jsx` atau `client/src/pages/PosTerminal.jsx`
  - Modal pembayaran, cetak invoice/thermal receipt
- **Database Tables**:
  - `transactions` (`id`, `invoice_no`, `patient_id`, `subtotal`, `discount_amount`, `ppn_amount`, `dp_amount`, `final_amount`, `payment_method`, `payment_status`, `cashier_id`, `created_at`)
  - `transaction_items` (`id`, `transaction_id`, `item_type`, `item_id`, `quantity`, `price`, `discount`, `subtotal`, `staff_id`)
  - `transaction_payments` (`id`, `transaction_id`, `payment_method`, `amount`, `reference_no`)
  - `patient_points` / `patient_point_logs` (`id`, `patient_id`, `points_change`, `type`, `reference_id`)
  - `down_payments` (`id`, `patient_id`, `amount`, `status`, `consumed_at`)

---

## 3. Anti-Regression Checklist (Wajib Lolos Sebelum Merge)

> [!CAUTION]
> Dilarang mengubah baris kode kalkulasi kasir dan skema tabel transaksi tanpa memverifikasi daftar sensitif di bawah ini.

- [ ] **Kalkulasi Net Payable**: Verifikasi bahwa urutan `subtotal -> diskon -> PPN -> DP -> Poin` tidak bergeser urutannya.
- [ ] **Zero Negative Amount**: Uji input diskon atau poin yang melebihi nilai transaksi; pastikan total bayar tidak pernah menjadi minus.
- [ ] **Pemberian Komisi Trigger**: Pastikan pembuatan komisi staf (`commissions`) hanya tertrigger jika `payment_status === 'PAID'`.
- [ ] **Stok Terpotong Sekali**: Pastikan item produk medis/skincare memotong stok tepat 1x saat checkout berstatus `PAID`.
- [ ] **Cetak Thermal Receipt**: Pastikan payload JSON untuk printer thermal/struk cetak tetap sinkron dan tidak mengalami `undefined` saat item berupa treatment vs produk vs paket klaim.
- [ ] **Concurrency Lock**: Pastikan klik ganda tombol "Bayar / Checkout" di UI dinonaktifkan (`disabled={isSubmitting}`) untuk mencegah double transaction.

---

## 4. Do's & Don'ts

### Do's:
- Selalu bungkus proses checkout multi-tabel (`transactions`, `transaction_items`, `commissions`, `stock_logs`) dalam satu blok transaksi database SQLite: `db.transaction(() => { ... })()`.
- Catat user ID kasir yang aktif login (`req.user.id`) pada kolom `cashier_id` di setiap transaksi.
- Berikan alert konfirmasi eksplisit dengan rincian total uang sebelum kasir memproses pembayaran.

### Don'ts:
- **JANGAN** menggunakan floating point math tanpa pembulatan (`0.1 + 0.2 = 0.30000000000000004`). Selalu bulatkan nominal rupiah ke integer terdekat.
- **JANGAN** pernah mengubah data transaksi yang sudah `PAID` via API update langsung tanpa mekanisme Void/Credit Note.
- **JANGAN** izinkan kasir melakukan checkout jika status antrean pasien belum berada di fase billing yang valid.
