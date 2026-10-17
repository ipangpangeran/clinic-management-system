---
name: deflow-sqlite-architecture
description: >-
  Arsitektur, standard query, dan guardrail database SQLite (better-sqlite3) di DEFLOW.
  Wajib digunakan saat mengubah skema tabel, menjalankan migrasi, menulis query transaksi,
  mengatur concurrency/WAL mode, serta melakukan backup data klinik.
---

# DEFLOW SQLite Architecture Guardrail

DEFLOW menggunakan SQLite via library `better-sqlite3` sebagai basis data utama. Meskipun SQLite sangat cepat dan efisien, karakteristik single-writer dan file-based menuntut arsitektur yang sangat disiplin untuk mencegah issue locking (`SQLITE_BUSY`), rusaknya integritas referensial, atau kehilangan data pasien saat migrasi.

---

## 1. Core Invariants (Aturan Absolut)

1. **Pragma Wajib (Connection Bootstrap)**:
   Setiap kali koneksi database diinisialisasi di `server/db.js`, konfigurasi pragma berikut **WAJIB DIJALANKAN**:
   ```javascript
   const db = require('better-sqlite3')(DB_PATH, { verbose: null });
   db.pragma('journal_mode = WAL');       // Write-Ahead Logging untuk concurrency tinggi
   db.pragma('foreign_keys = ON');         // Memaksa integritas foreign key
   db.pragma('synchronous = NORMAL');      // Keseimbangan optimal performa vs durabilitas
   db.pragma('busy_timeout = 5000');       // Menunggu hingga 5 detik sebelum melempar SQLITE_BUSY
   ```

2. **Zero Data Loss Migration Policy**:
   - **DILARANG KERAS** menggunakan `DROP TABLE` pada tabel operasional yang sudah berisi data (`patients`, `transactions`, `users`, `medical_records`, `patient_packages`).
   - Penambahan kolom baru **WAJIB** menggunakan:
     ```sql
     ALTER TABLE table_name ADD COLUMN new_col_name DATA_TYPE DEFAULT default_value;
     ```
   - Jika perlu mengubah constraint atau tipe kolom (yang tidak didukung `ALTER TABLE` standar SQLite):
     Wajib menggunakan metode **Table Re-creation Pattern**:
     1. `CREATE TABLE table_name_new (...)`
     2. `INSERT INTO table_name_new SELECT ... FROM table_name`
     3. `DROP TABLE table_name`
     4. `ALTER TABLE table_name_new RENAME TO table_name`
     *Seluruh 4 langkah di atas WAJIB dijalankan dalam satu transaksi eksklusif.*

3. **Atomic Operations via `db.transaction()`**:
   - Seluruh mutasi data yang melibatkan lebih dari satu tabel (contoh: Checkout Kasir, Klaim Paket, Void Transaksi) **WAJIB** menggunakan fungsi transaksi bawaan `better-sqlite3`:
     ```javascript
     const executeCheckout = db.transaction((payload) => {
       // Query 1: Insert transactions
       // Query 2: Insert transaction_items
       // Query 3: Update stock / packages
       // Query 4: Insert commissions
     });
     executeCheckout(payload);
     ```
   - Jika ada error di dalam fungsi, `better-sqlite3` secara otomatis melakukan `ROLLBACK`.

4. **100% Parameterized Statements (Anti SQL Injection)**:
   - **HARAM HUKUMNYA** melakukan konkatenasi atau template string literal ke dalam query SQL:
     ```javascript
     // SALAH BESAR (VULNERABLE & DILARANG):
     db.prepare(`SELECT * FROM users WHERE username = '${username}'`);

     // BENAR & WAJIB:
     db.prepare('SELECT * FROM users WHERE username = ?').get(username);
     // ATAU
     db.prepare('SELECT * FROM users WHERE username = :username').get({ username });
     ```

5. **Penanganan Concurrency & Menghindari Long-Running Transaction**:
   - SQLite hanya mengizinkan satu koneksi penulis (*single writer*) dalam satu waktu.
   - Jangan pernah meletakkan operasi asynchronous berat (seperti request HTTP ke WhatsApp gateway, pembacaan file besar, atau hashing bcrypt ratusan iterasi) **di dalam** blok transaksi database.
   - Lakukan perhitungan/hashing terlebih dahulu, buka transaksi, simpan data, lalu segera tutup transaksi (`COMMIT`).

---

## 2. File & Tabel Terkait

- **Database Files**:
  - `server/db.js` (Inisialisasi koneksi, helpers `runQuery`, `getQuery`, `allQuery`, script `initDatabase`)
  - `server/deflow.db` (File database SQLite lokal/production)
  - `server/backups/` (Direktori snapshot backup harian/sebelum migrasi)
- **Modul Kritis Pemanggil Query**:
  - `server/server.js` (Semua route API CRUD dan transaksi)

---

## 3. Anti-Regression Checklist (Wajib Lolos Sebelum Merge)

> [!CAUTION]
> Dilarang melakukan merge perubahan skema database tanpa memverifikasi daftar cek berikut.

- [ ] **WAL Mode Verified**: Pastikan file `deflow.db-wal` dan `deflow.db-shm` terkelola normal dan mode WAL aktif (`PRAGMA journal_mode;` mengembalikan `wal`).
- [ ] **Foreign Keys Enforcement**: Uji coba menghapus data parent yang memiliki relasi child; pastikan SQLite menolak dengan error `FOREIGN KEY constraint failed`.
- [ ] **Pre-Migration Backup Step**: Pastikan ada prosedur pembuatan file backup `deflow_backup_<timestamp>.db` sebelum script migrasi dijalankan.
- [ ] **Zero SQL Injection**: Lakukan grep ke seluruh codebase `server/` memastikan tidak ada sintaks query dengan backtick `${...}` yang memasukkan input user.
- [ ] **Transaction Integrity**: Pastikan tidak ada query mutasi multi-langkah yang dibiarkan tanpa pembungkus `db.transaction()`.
- [ ] **Date/Time Standard**: Pastikan semua timestamp disimpan dalam format ISO 8601 UTC atau format konsisten SQLite: `YYYY-MM-DD HH:MM:SS`.

---

## 4. Do's & Don'ts

### Do's:
- Selalu gunakan `db.prepare(...).get()` untuk 1 baris hasil, `db.prepare(...).all()` untuk banyak baris, dan `db.prepare(...).run()` untuk INSERT/UPDATE/DELETE.
- Jalankan `PRAGMA integrity_check;` secara berkala atau pada script audit pra-rilis.
- Tambahkan index pada kolom-kolom yang sering difilter atau di-JOIN: `patient_id`, `invoice_no`, `created_at`, `status`, `phone`.

### Don'ts:
- **JANGAN** pernah melakukan commit file database `.db`, `.db-wal`, atau `.db-shm` ke dalam repositori Git (pastikan selalu ada di `.gitignore`).
- **JANGAN** menyimpan file biner besar (foto pasien before-after resolusi penuh, scan KTP) langsung sebagai BLOB di SQLite. Simpan foto di filesystem lokal/object storage dan simpan path URL-nya saja di database.
- **JANGAN** memanggil `db.close()` di setiap handler request API Express; biarkan koneksi database persisten selama proses server berjalan.
