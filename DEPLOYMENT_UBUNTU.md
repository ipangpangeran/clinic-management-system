# Panduan Deployment Application DEFLOW (Linux Ubuntu Preprod Server)

Panduan ini berisi langkah-langkah *step-by-step* untuk mendepoloy aplikasi **DEFLOW - Aesthetic Clinic Management System** pada VPS Server Linux Ubuntu (Ubuntu 20.04 / 22.04 LTS).

---

## 📋 Prasyarat Server (Prerequisites)

Sebelum memulai, pastikan Anda memiliki akses SSH sebagai `root` atau user dengan hak akses `sudo` di server Ubuntu Anda.

---

## 🛠️ Langkah 1: Update Server & Install Node.js LTS (v20)

Jalankan perintah berikut untuk meng-update repository dan menginstall Node.js v20 LTS serta Git:

```bash
# 1. Update paket server
sudo apt update && sudo apt upgrade -y

# 2. Install Curl & Git
sudo apt install -y curl git build-essential

# 3. Setup NodeSource repository untuk Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 4. Install Node.js & npm
sudo apt install -y nodejs

# 5. Verifikasi versi
node -v   # Output minimal v20.x.x
npm -v    # Output minimal 10.x.x
```

---

## 🛠️ Langkah 2: Install Process Manager (PM2) & Nginx Web Server

```bash
# Install PM2 secara global untuk menjaga aplikasi Node.js tetap running di background
sudo npm install -y -g pm2

# Install Nginx Web Server & UFW Firewall helper
sudo apt install -y nginx
```

---

## 🛠️ Langkah 3: Clone Repository GitHub & Install Dependencies

```bash
# 1. Masuk ke direktori aplikasi (misal di /var/www)
cd /var/www

# 2. Clone repository dari GitHub Anda
sudo git clone https://github.com/ipangpangeran/clinic-management-system.git deflow

# 3. Masuk ke folder proyek & ubah kepemilikan direktori
cd /var/www/deflow
sudo chown -R $USER:$USER /var/www/deflow

# 4. Install Backend Dependencies
npm install

# 5. Install Frontend Dependencies & Build Production Bundle
cd client
npm install
npm run build
cd ..
```

---

## 🛠️ Langkah 4: Config & Jalankan Express Backend dengan PM2

```bash
# Masuk ke root direktori /var/www/deflow
cd /var/www/deflow

# Jalankan server Express menggunakan PM2
pm2 start server/server.js --name "deflow-backend"

# Simpan status PM2 agar otomatis berjalan saat server Ubuntu direstart
pm2 save
pm2 startup
```

*Catatan: Jalankan perintah tambahan yang diberikan oleh `pm2 startup` (jika diminta).*

---

## 🛠️ Langkah 5: Konfigurasi Nginx Reverse Proxy & SSL (HTTPS)

```bash
# 1. Buat file konfigurasi Nginx baru untuk DEFLOW
sudo nano /etc/nginx/sites-available/deflow
```

Tempelkan (*paste*) konfigurasi berikut (sesuaikan `server_name` dengan IP / Domain preprod Anda):

```nginx
server {
    listen 80;
    server_name clinic.ipangpangeran.com; # Ganti dengan domain / IP Server Anda

    # Limit ukuran upload jika diperlukan
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi Nginx:

```bash
# Enable site & restart Nginx
sudo ln -s /etc/nginx/sites-available/deflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Langkah 6: Enable HTTPS dengan Let's Encrypt (Certbot - Opsional & Direkomendasikan)

```bash
# Install Certbot & Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Dapatkan sertifikat SSL gratis
sudo certbot --nginx -d clinic.ipangpangeran.com
```

---

## 🔄 Cara Update Kode Aplikasi di Masa Mendatang

Setiap kali Anda me-push update kode baru ke GitHub, jalankan perintah ini di server:

```bash
cd /var/www/deflow
git pull origin main

# Rebuild frontend jika ada perubahan UI
cd client
npm install
npm run build
cd ..

# Restart backend process di PM2
pm2 restart deflow-backend
```

---

## ✅ Verifikasi & Monitoring

- **Status PM2**: `pm2 status`
- **Logs Backend**: `pm2 logs deflow-backend`
- **Status Nginx**: `sudo systemctl status nginx`
