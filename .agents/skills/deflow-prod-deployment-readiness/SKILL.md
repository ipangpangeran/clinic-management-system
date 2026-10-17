---
name: deflow-prod-deployment-readiness
description: >-
  Standard Operating Procedure (SOP) dan checklist kesiapan rilis produksi DEFLOW.
  Wajib digunakan saat mempersiapkan deployment ke server live, audit file .env,
  sanitasi kode debug/console.log, migrasi SQLite zero data loss, dan verifikasi build final.
---

# DEFLOW Production Deployment Readiness SOP

Dokumen ini adalah gerbang kendali mutu (Quality Gate) sebelum DEFLOW dideploy ke server produksi (live clinic environment). Kegagalan mematuhi checklist ini dapat menyebabkan insiden keamanan data medis pasien, kegagalan booting server, atau hilangnya data operasional klinik.

---

## 1. Core Invariants (Aturan Absolut Pra-Rilis)

1. **Environment Variables Audit**:
   - `NODE_ENV` **WAJIB** diset ke `'production'`.
   - `JWT_SECRET`: **HARAM MENGGUNAKAN DEFAULT VALUE** (misal `'deflow_secret_jwt_key_2026'`). Wajib digenerate menggunakan string acak kriptografis dengan entropi tinggi (minimal 64 karakter hex/base64).
   - Pastikan variabel penting terkonfigurasi di `.env` produksi:
     ```env
     NODE_ENV=production
     PORT=5000
     JWT_SECRET=super_secret_high_entropy_random_hash_production_only
     DB_PATH=/var/data/deflow/deflow.db
     WHATSAPP_API_URL=https://api.gateway.provider/send
     WHATSAPP_API_TOKEN=prod_token_here
     CORS_ORIGIN=https://app.deflowclinic.com
     ```
   - File `.env` **DILARANG KERAS** dicommit ke repositori Git.

2. **Kode Sanitasi & Audit Debugging**:
   - Bersihkan seluruh pernyataan `debugger;` dan `console.log()` berlebihan yang mencetak data sensitif pasien (nomor telepon, rekam medis, password, token).
   - Pastikan tidak ada credential testing yang tertinggal (misal `admin:admin123` hardcoded atau bypass password).
   - Pastikan error handler Express tidak mengekspos stack trace mentah ke client saat terjadi error 500 (kembalikan pesan generik yang aman: `{ message: 'Terjadi kesalahan sistem internal. Silakan hubungi tim IT.' }`).

3. **Protokol Migrasi SQLite Tanpa Kehilangan Data (Zero Data Loss Protocol)**:
   Sebelum menjalankan server versi baru yang membawa perubahan skema database pada server produksi:
   1. **Stop Aplikasi / Aktifkan Maintenance Mode**:
      Hentikan proses server Express (via PM2 / systemd) untuk memastikan tidak ada request menulis baru.
   2. **Buat Snapshot Database Fisik**:
      Salin file database utama beserta file WAL:
      ```bash
      cp /var/data/deflow/deflow.db /var/data/deflow/backups/deflow_backup_$(date +%Y%m%d_%H%M%S).db
      # Jika ada WAL file:
      [ -f /var/data/deflow/deflow.db-wal ] && cp /var/data/deflow/deflow.db-wal /var/data/deflow/backups/
      ```
   3. **Jalankan Skrip Migrasi dalam Transaksi**:
      Setiap perubahan skema wajib idempotent (bisa dijalankan berulang tanpa error) dan berbalut transaksi.
   4. **Verifikasi Integritas Database**:
      Jalankan perintah integritas:
      ```bash
      sqlite3 /var/data/deflow/deflow.db "PRAGMA integrity_check;"
      ```
      Hasil wajib mengembalikan output string `ok`. Jika tidak `ok`, segera rollback ke file snapshot cadangan!

4. **Verifikasi Build Frontend (Vite) & Backend (Express)**:
   - Direktori `client/`:
     - Jalankan `npm run build`.
     - Output folder `client/dist/` harus bersih tanpa error modul hilang atau path broken.
     - Pastikan size chunk JavaScript wajar dan tidak ada aset statis yang mengarah ke `localhost:5000`.
   - Backend `server/`:
     - Jalankan uji sintaks: `node --check server/server.js` dan `node --check server/db.js`.
     - Pastikan static file serving pada Express menunjuk ke path `client/dist` produksi yang benar.

5. **Keamanan Jaringan & Aksesibilitas**:
   - Batasi CORS hanya untuk domain resmi klinik (`CORS_ORIGIN`).
   - Terapkan rate limiter pada endpoint autentikasi (`/api/auth/login`) untuk mencegah brute force attack.

---

## 2. Production Readiness Checklist

> [!IMPORTANT]
> Seluruh tim IT dan AI Assistant wajib memverifikasi checklist ini sebelum menekan tombol deploy.

### A. Environment & Konfigurasi
- [ ] File `.env` produksi telah dibuat di server dengan secret acak.
- [ ] Folder penyimpanan database (`DB_PATH`) dan folder upload foto medis memiliki hak akses read/write aman (`chmod 700 /var/data/deflow`).
- [ ] Backup otomatis harian database SQLite via cron system telah aktif.

### B. Sanitasi Kode & Cleanliness
- [ ] Tidak ada statement `debugger;` di seluruh file `.js` dan `.jsx`.
- [ ] Tidak ada password atau API token pihak ketiga (WhatsApp/Payment) yang tertulis statis (hardcoded) di dalam file source code.
- [ ] Pesan error API backend ramah pengguna dan tidak menampilkan SQL stack trace ke browser.

### C. Database & Migrasi
- [ ] Snapshot file `.db` pra-migrasi telah berhasil dibuat dan disimpan di folder cadangan.
- [ ] Seluruh migrasi skema tabel baru bersifat non-destructive (menggunakan `ALTER TABLE ADD COLUMN` atau table copy).
- [ ] `PRAGMA integrity_check` mengembalikan hasil `ok`.

### D. Build & Server Runtime
- [ ] Build frontend (`npm run build`) selesai dengan status `exit code 0`.
- [ ] Server Express dapat booting dalam mode `NODE_ENV=production` tanpa warning fatal.
- [ ] Endpoint health check (`/api/health` atau `/api/status`) merespons status `200 OK` dengan informasi koneksi database yang sehat.
- [ ] Konfigurasi process manager (PM2 / Systemd) diset dengan restart policy `restart: always` atau `autorestart: true`.

---

## 3. Runbook Deployment Langkah Demi Langkah (Ubuntu/Linux Server)

```bash
# 1. Masuk ke direktori project di server
cd /var/www/deflow

# 2. Tarik kode versi rilis terbaru
git pull origin main

# 3. Freeze & Backup Database SQLite
pm2 stop deflow-app || sudo systemctl stop deflow
cp /var/data/deflow/deflow.db /var/data/deflow/backups/deflow_$(date +%Y%m%d_%H%M%S).db

# 4. Install dependency backend & jalankan migrasi database
npm install --omit=dev
node server/migrate.js

# 5. Verifikasi integritas database
sqlite3 /var/data/deflow/deflow.db "PRAGMA integrity_check;"

# 6. Build Client Frontend
cd client
npm install
npm run build
cd ..

# 7. Start / Restart Layanan Aplikasi
pm2 restart deflow-app || sudo systemctl restart deflow

# 8. Uji Endpoint Health & Log
curl -I http://localhost:5000/api/health
pm2 logs deflow-app --lines 50
```

---

## 4. Rencana Pemulihan Darurat (Rollback Plan)

Jika setelah deployment terjadi kegagalan fatal pada server produksi:
1. Hentikan aplikasi: `pm2 stop deflow-app`.
2. Kembalikan file database dari snapshot backup terakhir:
   ```bash
   cp /var/data/deflow/backups/deflow_<timestamp_sebelum_deploy>.db /var/data/deflow/deflow.db
   rm -f /var/data/deflow/deflow.db-wal /var/data/deflow/deflow.db-shm
   ```
3. Kembalikan kode aplikasi ke commit stabil sebelumnya:
   ```bash
   git reset --hard <commit_hash_stabil_sebelumnya>
   cd client && npm run build && cd ..
   ```
4. Jalankan kembali aplikasi dan verifikasi kestabilan data.
