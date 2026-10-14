---
name: deflow-sqlite-architecture
description: "Standar penulisan schema, indexing, transaksi, dan migrasi tabel aman untuk database SQLite di DEFLOW."
---

# DEFLOW SQLite & Backend Architecture Playbook

## Files Terkait
- Database init: `server/db.js`
- Database file: `server/deflow.db`
- Server endpoints: `server/server.js`

## Aturan Teknis (Architecture Guardrails)
1. **Safety Migration:**
   - JANGAN PERNAH menjalankan `DROP TABLE` pada tabel operasional (`patients`, `transactions`, `stock`, `patient_packages`).
   - Penambahan kolom baru wajib menggunakan pattern `ALTER TABLE ... ADD COLUMN` dengan pengecekan `IF NOT EXISTS` atau `try/catch` di `db.js`.
2. **Atomic Transactions:**
   - Operasi yang menyentuh >1 tabel (misal: buat transaksi kasir + potong kuota paket + catat poin MGM + mutasi stok) WAJIB dibungkus transaksi database agar tidak ada data *orphan* bila ada error di tengah proses.
3. **Foreign Keys & PRAGMA:**
   - Selalu aktifkan `PRAGMA foreign_keys = ON;`.