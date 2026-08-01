# PRD - APLIKASI DEFLOW - AESTHETIC CLINIC MANAGEMENT SYSTEM

---

## 1. PENDAHULUAN & TUJUAN UTAMA (EXECUTIVE SUMMARY)

### 1.1 Latar Belakang
Klinik Kecantikan DEFLOW membutuhkan sistem manajemen internal berbasis web terintegrasi untuk menyelaraskan alur kerja operasional antar divisi (Resepsionis, Terapis, Dokter, Perawat, Manajemen, dan Logistik). 

### 1.2 Tujuan Utama (Core Objectives)
* **Peningkatan Efisiensi Alur Kerja:** Mempercepat proses pendaftaran pasien dan pengerjaan tindakan medis hingga 50%.
* **Reduksi Antrean Pasien:** Meminimalisir *bottle-neck* di meja kasir/front desk melalui validasi instan dan otomatisasi pencetakan nota.
* **Akurasi & Penataan Data:** Mengeliminasi duplikasi data pasien, pemantauan kuota paket treatment secara presisi, dan otomatisasi kalkulasi insentif/komisi 5 lini karyawan.
* **Otomatisasi Retention:** Mengirimkan pesan pengingat (reminder) kontrol berkala secara otomatis via WhatsApp Gateway.

---

## 2. PENGGUNA & HAK AKSES SISTEM (USER AUTHENTICATION)

### 2.1 Default User Credentials (Environment Setup)
Aplikasi ini ditujukan khusus untuk **Internal Klinik DEFLOW**. Pengguna default saat deployment awal adalah:

| Role / Jabatan | Username | Password | Default Scope |
| :--- | :--- | :--- | :--- |
| **Admin System** | `admin-ipang` | `admin1234` | Full System Access & Infrastructure Config |
| **Admin Klinik** | `admin-gifary` | `admin1234` | Full Operational Access & Dynamic ACL Management |
| **Resepsionis / Cashier** | `resepsionis` | `admin1234` | Patient Intake, POS, Package Tracking, Reminders |
| **Assistant Manager (ASM)**| `asm` | `admin1234` | Stock Management, Clinic Consumables, Stock Audit |
| **Manager** | `mgr` | `admin1234` | Financial Control, Price Books, Commission Formulas |

---

## 3. DETAIL SPESIFIKASI MODUL & BUSA BISNIS

### 3.1 Modul 1: Pengguna & Manajemen Hak Akses (User & Role Management)

#### A. Admin (Super Admin System & Admin Klinik)
* **Akses:** Full Access (All Roles & Dynamic Configuration).
* **Fitur Utama:**
  * **Pengaturan Profile Klinik:** Mengubah variabel dinamis profil utama:
    * Nama Klinik (misal: `DEFLOW`)
    * Tagline Klinik (misal: `AESTHETIC CLINIC`)
    * Alamat Lengkap & Titik Koordinat Peta
    * Kontak Resmi (No. Telepon & WhatsApp Business)
    * Email & Logo Resmi Klinik
  * **Dynamic ACL (Access Control List):** Menambah, mengubah, mengaktifkan, atau membatasi menu spesifik pada setiap role jika ada perubahan struktur organisasi.

#### B. Resepsionis / Front Desk (FD)
* **Akses:** Operational Intake & Point of Sales (POS).
* **Fitur Utama:**
  * **Pendaftaran Pasien Baru - Tipe Trial:** Form minimalis khusus promo/uji coba. Input Wajib: No. KTP dan No. Handphone.
  * **Pendaftaran Pasien Baru - Tipe Non-Trial (Reguler):** Form registrasi medis lengkap. Input Wajib: No. KTP dan No. Handphone. Input Opsional: Alamat, Tgl Lahir, Riwayat Alergi, Jenis Kulit, Rekomendasi Dokter.
  * **Manajemen Paket Stok Pembelian Pasien:** Tracking kuota tersisa, riwayat pemakaian paket treatment berbasis waktu presisi (Tanggal, Bulan, Tahun, Jam).
  * **Sistem Reminder Jadwal Kembali:** Input estimasi tanggal pasien harus kontrol/treatment ulang yang otomatis terintegrasi ke cron-job WhatsApp Gateway.

#### C. Assistant Manager (ASM)
* **Akses:** Logistics, Stock, & Consumable Management.
* **Fitur Utama:**
  * **CRUD Stok Produk Skin Care:** Kelola katalog inventori produk retail.
  * **Monitoring & Approval Stok BTC / Terapis:** Memantau dan menyetujui mutasi/pemakaian bahan medis dan skin care untuk tindakan langsung ke pasien.
  * **Monitoring Stok Operasional Non-Medis:** Mengelola barang habis pakai (tisu, kapas, cairan pembersih, sarung tangan, ATK, dll).

#### D. Manager
* **Akses:** Financial, Pricing & Payroll Commission Authority.
* **Fitur Utama:**
  * **Manajemen Harga:** Mengatur harga jual produk skincare, paket treatment, dan jasa tindakan medis.
  * **Formula & Aturan Komisi (5 Lini Profesi):** Mengatur persentase/nominal tetap insentif untuk 5 lini karyawan.

---

## 4. UI/UX BLUEPRINT & FLOW MATRIX

### 4.1 Tabel Matriks Hak Akses (ACL Matrix)

| Modul / Menu Fitur | Admin | Resepsionis (FD) | Assistant Manager (ASM) | Manager | Nurse / Therapist / Dokter |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Detail Profil Klinik** | C, R, U, D | R | R | R | No Access |
| **Konfigurasi Hak Akses (ACL)**| C, R, U, D | No Access | No Access | No Access | No Access |
| **Pendaftaran Pasien (Trial/Non)**| C, R, U, D | C, R, U | R | R | R |
| **Paket Stok Pembelian Pasien**| C, R, U, D | C, R, U | R | R | R (Read Only) |
| **Reminder Jadwal Kembali** | C, R, U, D | C, R, U, D | R | R | R |
| **Stok Produk BTC & Non-Medis**| C, R, U, D | R | C, R, U, D | R | R (Request Stok) |
| **Input & Manajemen Harga** | C, R, U, D | R | R | C, R, U, D | No Access |
| **Manajemen Aturan Komisi (5 Lini)**| C, R, U, D | No Access | No Access | C, R, U, D | No Access |
| **Laporan Payroll & Komisi** | C, R, U, D | No Access | R (Overview) | C, R, U, D | R (Masing-masing) |

*Keterangan: C = Create, R = Read, U = Update, D = Delete, No Access = Menu Disembunyikan.*

---

### 4.2 User Flow: Pendaftaran Pasien (Trial vs Non-Trial)

FLOW
[Mulai: Pasien Datang]
│
▼
[FD Klik Menu "Tambah Pasien Baru"]
│
▼
[FD Pilih Tipe Pasien]
├──► JIKA TIPE: TRIAL
│       │
│       ▼
│    [Sistem memunculkan Form Minimalis]
│    [FD Input: No. KTP & No. Handphone (Wajib)]
│       │
│       ▼
│    [FD Klik "Simpan"] ──► [Sistem validasi unik No. KTP/HP]
│                                     │
│                                     ▼
│                        [Pasien Tersimpan: Status TRIAL]
│
└──► JIKA TIPE: NON-TRIAL
│
▼
[Sistem memunculkan Form Lengkap]
[FD Input: No. KTP & No. Handphone (Wajib)]
[FD Input: Alamat, Tgl Lahir, Riwayat Alergi, Jenis Kulit (Opsional)]
│
▼
[FD Klik "Simpan"] ──► [Sistem validasi unik No. KTP/HP]
│
▼
[Pasien Tersimpan: Status REGULER]


#### Aturan Bisnis Validation Rules:
1. **Pencegahan Duplikasi:** Sistem menolak pendaftaran jika No. KTP atau No. HP sudah terdaftar (`Duplicate Entry Error`). Buat pengecekan NIK atau No HP jika sudah ada langsung muncul "data sudah terdaftar".
2. **Upgrade Status:** Pasien berstatus Trial dapat di-upgrade menjadi Non-Trial/Reguler kapan saja oleh FD dengan melengkapi data profil.

---

### 4.3 Skema Rumus Input Komisi (Sisi Manager)

#### A. Komisi Penjualan Produk Retail
$$\\text{Komisi Produk} = (\\text{Harga Jual Produk} \\times \\text{Persentase Komisi } \\%) \\times \\text{Jumlah Barang}$$
*(Atau menggunakan Flat Rate Nominal Tetap per Item Produk).*

#### B. Skema Komisi 5 Lini Profesi Spesifik
1. **Therapist / BTC (Beauty Consultant):**
   $$\\text{Komisi} = \\text{Insentif Fix Per Tindakan} + (\\text{Harga Paket} \\times \\% \\text{ Bonus BTC})$$
2. **Marketing:**
   $$\\text{Komisi} = \\text{Nominal Tetap Per Kepala Pasien Baru} + (\\text{Total Transaksi Pertama} \\times \\% \\text{ Bonus})$$
3. **Dokter:**
   $$\\text{Komisi} = \\text{Tarif Konsultasi Fix} + (\\text{Harga Tindakan Medis} \\times \\% \\text{ Jasa Medis})$$
4. **Nurse (Perawat Pendamping):**
   $$\\text{Komisi} = \\text{Nominal Per Tindakan yang Didampingi}$$
5. **FD (Front Desk / Kasir):**
   $$\\text{Komisi} = \\text{Total Omset Kasir Per Hari} \\times \\% \\text{ Komisi FD}$$

---

## 5. ARCHITECTURE & SPECIFICATIONS

### 5.1 Skema Database Relasional (Entity Diagram & Tables)

+--------------------+        +-------------------------+        +-----------------------+
|       pasien       |        |       stok_produk       |        |      riwayat_gaji     |
+--------------------+        +-------------------------+        +-----------------------+
| id (PK, UUID)      |<---+   | id (PK, UUID)           |        | id (PK, UUID)         |
| no_ktp (VARCHAR)   |    |   | nama_produk (VARCHAR)   |        | user_id (FK, UUID)----+
| no_hp (VARCHAR)    |    |   | tipe_stok (ENUM)        |        | bulan (INT)           |
| tipe_pasien (ENUM) |    |   | harga_jual (DECIMAL)    |        | tahun (INT)           |
| ...                |    |   | sisa_stok (INT)         |        | gaji_pokok (DECIMAL)  |
+--------------------+    |   +-------------------------+        | total_komisi (DECIMAL)|
|               |                                      +-----------------------+
▼               +-------------------+
+--------------------+                        |
|   pasien_reminder  |                        ▼
+--------------------+              +-------------------+
| id (PK, UUID)      |              |  transaksi_detail |
| pasien_id (FK) ----+              +-------------------+
| tgl_kembali (DATE) |              | id (PK, UUID)     |
| status (ENUM)      |              | produk_id (FK) ---+
+--------------------+              +-------------------+


#### Tabel Data Utama:
* **`pasien`**: `id` (UUID, PK), `no_ktp` (VARCHAR, Unique, Nullable), `no_hp` (VARCHAR, Unique, Not Null), `nama_lengkap` (VARCHAR), `tipe_pasien` (ENUM: 'TRIAL', 'NON-TRIAL'), `total_poin` (INT), `created_at` (TIMESTAMP).
* **`stok_produk`**: `id` (UUID, PK), `nama_produk` (VARCHAR), `tipe_stok` (ENUM: 'THERAPIST_BTC', 'KLINIK_NON_MEDIS'), `harga_jual` (DECIMAL), `sisa_stok` (INT), `minimum_stok` (INT), `updated_by` (UUID, FK users).
* **`riwayat_gaji`**: `id` (UUID, PK), `user_id` (UUID, FK users), `bulan` (INT), `tahun` (INT), `gaji_pokok` (DECIMAL), `total_komisi_produk` (DECIMAL), `total_komisi_tindakan` (DECIMAL), `grand_total` (DECIMAL), `status_pembayaran` (ENUM: 'PENDING', 'PAID').

---

### 5.2 Dynamic POS Receipt Wireframe (Cetak Struk Termal 58mm/80mm)

Semua header nama klinik, tagline, alamat, dan kontak diambil secara dinamis dari tabel konfigurasi aplikasi (`{{CLINIC_NAME}}`, `{{CLINIC_TAGLINE}}`, dst).

```text
========================================
           {{CLINIC_NAME}}
         {{CLINIC_TAGLINE}}
         {{CLINIC_ADDRESS}}
      TELP/WA: {{CLINIC_PHONE}}
========================================
No. Nota : INV/{{YYYYMMDD}}/{{TRANSACTION_ID}}
Tanggal  : {{TRANSACTION_DATE}} {{TRANSACTION_TIME}}
Kasir    : {{CASHIER_NAME}}
Pelanggan: {{PATIENT_NAME}} ({{PATIENT_TYPE}})
----------------------------------------
1x {{ITEM_NAME_1}}         Rp {{ITEM_PRICE_1}}
1x {{ITEM_NAME_2}}         Rp {{ITEM_PRICE_2}}
   (Ref Terapis: {{THERAPIST_NAME}})
----------------------------------------
Subtotal:                    Rp {{SUBTOTAL}}
Diskon:                      Rp {{DISCOUNT}}
Pajak (PPN 11%):             Rp {{TAX_AMOUNT}}
----------------------------------------
TOTAL:                       Rp {{GRAND_TOTAL}}
BAYAR (Cash):                Rp {{PAYMENT_AMOUNT}}
KEMBALI:                     Rp {{CHANGE_AMOUNT}}
----------------------------------------
Poin Diperoleh:              +{{EARNED_POINTS}} Poin
Total Poin Sekarang:         {{TOTAL_POINTS}} Poin
----------------------------------------
   Terima Kasih Atas Kunjungan Anda
   Jadwal Kontrol Anda: {{NEXT_CONTROL_DATE}}
========================================


##5.3 Arsitektur & Integration WhatsApp Gateway
Workflow Architecture:
[ Database Klinik ] 
       │ (Membaca data pasien_reminder harian pada pukul 08:00 AM)
       ▼
[ Backend / Cron Job Service ]
       │ 1. Filter: Tgl Kembali == (Hari Ini + 1 Hari)
       │ 2. Cek Status: 'PENDING'
       │ 3. Generate Dynamic Template Pesan WA
       ▼
[ API Payload (JSON) ] 
       │ 
       ▼
[ Third-Party WA Gateway ] ──► (Kirim API Request via HTTPS POST)
       │
       ▼
[ Smartphone Pasien ] (Menerima Pesan Reminder)

Technical API Contract:
Endpoint: POST https://api-wa.ipangpangeran.com/send?api_key=ipang-super-secret-key-123456

Content-Type: application/json
Request Payload JSON Example:
{
  "number": "6285297532050",
  "message": "Halo Kak Budi, kami dari DEFLOW AESTHETIC CLINIC. Menandai kalender Anda, besok tanggal 15-08-2026 ada jadwal perawatan kembali untuk Anda. Konfirmasi kedatangan dengan membalas pesan ini ya Kak. Sampai jumpa!"
}


Dynamic Message Template:
"Halo Kak {{PATIENT_NAME}}, kami dari {{CLINIC_NAME}} {{CLINIC_TAGLINE}}. Menandai kalender Anda, besok tanggal {{NEXT_CONTROL_DATE}} ada jadwal perawatan kembali untuk Anda. Konfirmasi kedatangan dengan membalas pesan ini ya Kak. Sampai jumpa!"


## LOGO
Gunakan logo DEFLOW_LOGO_ONLY.png untuk favicon

