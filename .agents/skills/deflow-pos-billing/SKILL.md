---
name: deflow-pos-billing
description: "Panduan dan aturan bisnis transaksi kasir (POS), pembayaran split/DP, diskon, penggunaan poin MGM, dan pencetakan invoice di DEFLOW."
---

# DEFLOW POS & Billing Counter Playbook

## Files Terkait
- Frontend: `client/src/pages/PosBillingCounter.jsx`
- Backend: `server/server.js` (Endpoint `/api/pos/*`, `/api/billing/*`)
- Database: Tabel `transactions`, `payment_methods`, `dp_records`, `mgm_points`

## Aturan Bisnis & Validasi (Business Invariants)
1. **Perhitungan DP & Pelunasan:**
   - Transaksi dengan DP wajib mencatat `dp_amount`, `remaining_amount`, dan status `PARTIAL`.
   - Pelunasan DP harus memvalidasi ID transaksi awal dan tidak boleh menghasilkan sisa tagihan negatif.
2. **Poin MGM (Member Get Member):**
   - 1 poin = nilai nominal rupiah yang terdaftar di konfigurasi klinik.
   - Poin hanya bisa dipotong jika saldo poin pasien cukup dan status pasien aktif.
   - Log penggunaan poin wajib tersimpan di tabel riwayat poin pasien.
3. **Pencatatan Multi-Payment:**
   - Jika pembayaran kombinasi (Tunai + Transfer / QRIS / Kartu), breakdown masing-masing metode bayar harus tersimpan presisi di database.
4. **Pembatalan / Void:**
   - Void transaksi wajib mengembalikan kuota paket / stok produk yang sempat terpotong dan merestore poin MGM bila ada.

## Instruksi untuk Antigravity Agent
- Setiap perubahan pada kalkulasi total di `PosBillingCounter.jsx`, pastikan sinkron dengan validasi backend di `server.js`.
- Gunakan formatter rupiah standar dari `client/src/utils/formatters.js`.