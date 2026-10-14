---
name: deflow-commission-matrix
description: "Aturan kalkulasi insentif, komisi 5 lini karyawan, matriks keuangan, dan ketersediaan petugas di DEFLOW."
---

# DEFLOW Financial & Commission Matrix Playbook

## Files Terkait
- Frontend: `client/src/pages/FinancialCommissionMatrix.jsx`, `client/src/pages/DoinganActivity.jsx`
- Backend: `server/server.js` (`/api/commissions/*`, `/api/staff-availability/*`)
- Database: Tabel `commissions`, `commission_rules`, `staff_roles`

## Aturan Bisnis & Validasi
1. **Pemisahan Role & Ketersediaan Ruangan:**
   - Role administratif (Kasir, Front Desk, ASM, Manager, Marketing) HARUS diexclude dari *Live Availability & Status Ruangan Petugas*.
   - Hanya tenaga medis aktif (Dokter, Terapis, Nurse) yang muncul pada slot status ruangan.
2. **Formula Komisi 5 Lini:**
   - Nilai komisi bisa berupa nominal tetap (flat) atau persentase dari harga netto tindakan/penjualan produk.
   - Hitungan komisi hanya dieksekusi dari transaksi yang sudah lunas (`PAID`).
   - Perubahan matriks parameter komisi dipusatkan di modul Keuangan/Manager, bukan di level resepsionis.

## Instruksi untuk Antigravity Agent
- Hati-hati saat refactor query laporan keuangan; kalkulasi komisi harus selalu memiliki fallback 0 jika rule tidak terpasang, tanpa membatalkan query utama.