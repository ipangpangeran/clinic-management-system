# 🌸 DEFLOW — Aesthetic Clinic Management System

<p align="center">
  <img src="client/public/logo/DEFLOW_LOGO_TAGLINE_BIG.png" alt="DEFLOW Logo" width="360" />
</p>

<p align="center">
  <b>Sistem Manajemen Operasional & Kasir Terintegrasi untuk Klinik Estetika & Kecantikan</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-Express-green?logo=nodedotjs" alt="Express" />
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite" alt="SQLite" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success" alt="Status" />
</p>

---

## 📌 Tentang DEFLOW
**DEFLOW** adalah sistem internal klinik kecantikan untuk menyelaraskan alur kerja operasional antar divisi: Resepsionis, Terapis, Dokter, Perawat, Manajemen, dan Logistik. Sistem dirancang untuk mempercepat intake pasien, memantau kuota treatment, mengotomatisasi komisi karyawan, dan menyajikan laporan keuangan secara real-time.

---

## ✨ Fitur Utama

- 💳 **Point of Sale (POS) & Billing:**
  - Multi-payment (Tunai, QRIS, Transfer, Kartu).
  - Pembayaran DP (Down Payment) & pelunasan bertahap.
  - Program Referral / Poin MGM (*Member Get Member*) dengan riwayat mutasi transparan.
  - Cetak struk termal otomatis.

- 💆‍♀️ **Manajemen Pasien & Paket Treatment:**
  - Pendaftaran pasien Trial & Reguler.
  - Tracking sisa kuota sesi treatment dan riwayat klaim tindakan per petugas medis.
  - Pengingat kontrol/jadwal kunjungan ulang otomatis via WhatsApp Gateway.

- 📊 **Matriks Komisi & Keuangan (5 Lini Profesi):**
  - Formula insentif otomatis untuk Dokter, Perawat, Terapis, Marketing, dan Kasir.
  - Dashboard keuangan, omzet, dan export laporan tindakan ke Excel.

- 📦 **Logistik & Back-To-Cabin (BTC):**
  - Pemisahan stok retail skincare vs bahan medis/habis pakai untuk tindakan.
  - Monitoring mutasi dan approval pengeluaran barang.

- 🔐 **Dynamic ACL & Role Based Access:**
  - Hak akses modular untuk 5 role: Super Admin, Admin Klinik, Resepsionis, ASM (Logistik), dan Manager.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons, ExcelJS
- **Backend:** Node.js, Express.js (v5), SQLite (Better-SQLite3 & sqlite3), node-cron
- **AI Agent Skills:** Google Antigravity IDE (`.agents/skills/`)

---

## 🚀 Memulai (Local Setup)

### Prasyarat
- Node.js (v18+)
- npm

### 1. Clone Repository
bash
git clone https://github.com/ipangpangeran/clinic-management-system.git
cd clinic-management-system


### 2. Install Dependencies
bash
Install backend root dependencies
npm install
Install frontend client dependencies
npm run dev:fe --prefix client -- install
atau
cd client && npm install && cd ..


### 3. Menjalankan Aplikasi
Cukup jalankan satu perintah untuk menjalankan Backend & Frontend sekaligus:
bash
npm run dev


- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:5000`

---

## 👥 Akun Default (Development)

| Role | Username | Default Scope |
| :--- | :--- | :--- |
| **Admin System** | `admin-ipang` | Full System Access |
| **Admin Klinik** | `admin-gifary` | Full Operational & ACL |
| **Resepsionis** | `resepsionis` | Intake Pasien, Kasir POS, MGM |
| **Logistik / ASM** | `asm` | Stok BTC & Non-Medis |
| **Manager** | `mgr` | Pricing & Matriks Komisi |

---

<p align="center">
  Dibuat dengan ❤️ untuk operasional <b>DEFLOW Aesthetic Clinic</b>.
</p>
