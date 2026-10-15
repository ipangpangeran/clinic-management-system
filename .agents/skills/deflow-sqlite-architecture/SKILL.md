---
name: deflow-sqlite-architecture
description: "Standar penulisan schema, indexing, transaksi, dan migrasi tabel aman untuk database SQLite di DEFLOW."
---

# DEFLOW SQLite & Backend Architecture Playbook

## Files Terkait
- Database init: `server/db.js`
- Database file: `server/deflow.db`
- Migration runner: `server/migrations.js`
- Backup & restore service: `server/backupService.js`
- Backups directory: `server/backups/`
- Server endpoints: `server/server.js`

## Aturan Teknis (Architecture Guardrails)
1. **Safety Migration & Tracking:**
   - JANGAN PERNAH menjalankan `DROP TABLE` pada tabel operasional (`pasien`, `transaksi`, `stok_produk`, `pasien_paket`, `doingan`).
   - Gunakan `server/migrations.js` dengan tracking tabel `_migrations` untuk setiap evolusi skema baru.
   - Penambahan kolom baru wajib menggunakan pattern `ALTER TABLE ... ADD COLUMN` dengan pengecekan `IF NOT EXISTS` atau `try/catch`.
2. **Atomic Transactions:**
   - Operasi yang menyentuh >1 tabel (misal: transaksi kasir + potong paket + komisi doingan + mutasi stok) WAJIB dibungkus `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`.
3. **Foreign Keys & PRAGMA:**
   - Selalu aktifkan `PRAGMA foreign_keys = ON;`.
4. **Disiplin Timestamp (WIB / GMT+7 Asia/Jakarta):**
   - Selalu gunakan `datetime('now', '+7 hours')` untuk nilai default timestamp.
   - Seluruh tabel operasional dilengkapi SQLite Trigger fail-safe (`trg_..._created_at_gmt7`) agar jika query insert tidak menyertakan timestamp, database otomatis mengisinya dengan waktu GMT+7.
5. **Indexing Standards:**
   - Selalu buat indeks untuk foreign keys dan kolom pencarian (`no_hp`, `nama_lengkap`, `created_at`, `pasien_id`, `petugas_id`, `status_pembayaran`, dll.).
6. **Backup & Restore Standards:**
   - Gunakan SQLite native `VACUUM INTO` untuk hot backup transaksional tanpa memutus server atau mengunci database.
   - Verifikasi integritas dengan `PRAGMA integrity_check` sebelum memulihkan (restore).
   - Selalu buat safety pre-restore backup sebelum proses penimpaan file database aktif.