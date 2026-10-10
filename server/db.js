const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'deflow.db');
const db = new sqlite3.Database(dbPath);

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDb() {
  try {
    await runQuery('PRAGMA foreign_keys = ON');

    // 1. Clinic Profile Table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS clinic_profile (
        id INTEGER PRIMARY KEY DEFAULT 1,
        clinic_name TEXT NOT NULL,
        tagline TEXT,
        address TEXT,
        map_latitude REAL,
        map_longitude REAL,
        phone TEXT,
        whatsapp TEXT,
        email TEXT,
        logo_url TEXT,
        tax_rate_percent REAL DEFAULT 11.0,
        is_tax_enabled INTEGER DEFAULT 1,
        wa_api_url TEXT DEFAULT 'https://api-wa.ipangpangeran.com/send?api_key=ipang-super-secret-key-123456',
        idle_timeout_minutes INTEGER DEFAULT 15
      )
    `);

    // Migration: Add wa_api_url, idle_timeout_minutes, and is_tax_enabled if missing in existing DB
    try {
      await runQuery(`ALTER TABLE clinic_profile ADD COLUMN wa_api_url TEXT DEFAULT 'https://api-wa.ipangpangeran.com/send?api_key=ipang-super-secret-key-123456'`);
    } catch (e) { }

    try {
      await runQuery(`ALTER TABLE clinic_profile ADD COLUMN idle_timeout_minutes INTEGER DEFAULT 15`);
    } catch (e) { }

    try {
      await runQuery(`ALTER TABLE clinic_profile ADD COLUMN is_tax_enabled INTEGER DEFAULT 1`);
    } catch (e) { }


    // 2. Users Table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        lini_profesi TEXT DEFAULT 'Beautician',
        phone TEXT,
        gaji_pokok REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      await runQuery(`ALTER TABLE users ADD COLUMN gaji_pokok REAL DEFAULT 0`);
    } catch (e) { }

    try {
      await runQuery(`ALTER TABLE users ADD COLUMN is_training INTEGER DEFAULT 0`);
    } catch (e) { }

    try {
      await runQuery(`UPDATE users SET lini_profesi = 'Nurse' WHERE role = 'Nurse' OR username LIKE '%nurse%'`);
      await runQuery(`UPDATE users SET lini_profesi = 'Beautician' WHERE role = 'Beautician' OR username LIKE '%beautician%'`);
    } catch (e) { }

    // 3. Dynamic ACL Table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        module_key TEXT NOT NULL,
        can_create INTEGER DEFAULT 1,
        can_read INTEGER DEFAULT 1,
        can_update INTEGER DEFAULT 1,
        can_delete INTEGER DEFAULT 1,
        UNIQUE(role, module_key)
      )
    `);

    // 4. Patients Table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS pasien (
        id TEXT PRIMARY KEY,
        no_ktp TEXT UNIQUE,
        no_hp TEXT UNIQUE NOT NULL,
        nama_lengkap TEXT NOT NULL,
        tipe_pasien TEXT NOT NULL CHECK(tipe_pasien IN ('TRIAL', 'NON-TRIAL', 'MEMBER')),
        alamat TEXT,
        tgl_lahir DATE,
        riwayat_alergi TEXT,
        jenis_kulit TEXT,
        rekomendasi_dokter TEXT,
        total_poin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Automatic Migration: Upgrade existing pasien table CHECK constraint in SQLite
    try {
      const pasienTableSql = await getQuery("SELECT sql FROM sqlite_master WHERE type='table' AND name='pasien'");
      if (pasienTableSql && pasienTableSql.sql && !pasienTableSql.sql.includes("'MEMBER'")) {
        console.log('[DB Migration] Upgrading pasien table CHECK constraint to include MEMBER...');
        await runQuery('PRAGMA foreign_keys = OFF');
        await runQuery(`
          CREATE TABLE pasien_new (
            id TEXT PRIMARY KEY,
            no_ktp TEXT UNIQUE,
            no_hp TEXT UNIQUE NOT NULL,
            nama_lengkap TEXT NOT NULL,
            tipe_pasien TEXT NOT NULL CHECK(tipe_pasien IN ('TRIAL', 'NON-TRIAL', 'MEMBER')),
            alamat TEXT,
            tgl_lahir DATE,
            riwayat_alergi TEXT,
            jenis_kulit TEXT,
            rekomendasi_dokter TEXT,
            total_poin INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await runQuery(`
          INSERT INTO pasien_new (id, no_ktp, no_hp, nama_lengkap, tipe_pasien, alamat, tgl_lahir, riwayat_alergi, jenis_kulit, rekomendasi_dokter, total_poin, created_at)
          SELECT id, no_ktp, no_hp, nama_lengkap, CASE WHEN tipe_pasien = 'NON-TRIAL' OR tipe_pasien = 'Reguler' THEN 'MEMBER' ELSE tipe_pasien END, alamat, tgl_lahir, riwayat_alergi, jenis_kulit, rekomendasi_dokter, total_poin, created_at FROM pasien
        `);
        await runQuery('DROP TABLE pasien');
        await runQuery('ALTER TABLE pasien_new RENAME TO pasien');
        await runQuery('PRAGMA foreign_keys = ON');
        console.log('[DB Migration] pasien table upgraded successfully!');
      }
    } catch (e) {
      // ignore table migration error if already migrated
    }

    try {
      await runQuery(`ALTER TABLE pasien ADD COLUMN referrer_pasien_id TEXT`);
    } catch (e) { }

    try {
      await runQuery(`ALTER TABLE pasien ADD COLUMN marketing_id TEXT`);
    } catch (e) { }

    try {
      await runQuery(`ALTER TABLE pasien ADD COLUMN has_trial_history INTEGER DEFAULT 0`);
    } catch (e) { }

    try {
      await runQuery(`ALTER TABLE pasien ADD COLUMN initial_tipe_pasien TEXT`);
    } catch (e) { }

    try {
      await runQuery(`UPDATE pasien SET initial_tipe_pasien = tipe_pasien WHERE initial_tipe_pasien IS NULL OR initial_tipe_pasien = ''`);
      await runQuery(`UPDATE pasien SET initial_tipe_pasien = 'TRIAL' WHERE has_trial_history = 1`);
    } catch (e) { }

    // 5a. Master Paket Templates
    await runQuery(`
      CREATE TABLE IF NOT EXISTS master_paket (
        id TEXT PRIMARY KEY,
        nama_paket TEXT NOT NULL,
        item_a_name TEXT,
        item_a_kuota INTEGER DEFAULT 0,
        item_b_name TEXT,
        item_b_kuota INTEGER DEFAULT 0,
        harga_paket REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sync official master_paket templates
    const defaultMasterPakets = [
      { id: 'mp-glowup-1', nama_paket: 'Glow up 1', item_a_name: '', item_a_kuota: 0, item_b_name: 'Facial Premium', item_b_kuota: 3, harga_paket: 800000 },
      { id: 'mp-glowup-2', nama_paket: 'Glow up 2', item_a_name: 'Tindakan Dokter', item_a_kuota: 1, item_b_name: 'Facial Premium', item_b_kuota: 2, harga_paket: 900000 },
      { id: 'mp-ultimate-1', nama_paket: 'Ultimate 1', item_a_name: 'Tindakan Dokter', item_a_kuota: 2, item_b_name: 'Facial Premium', item_b_kuota: 3, harga_paket: 1600000 },
      { id: 'mp-ultimate-2', nama_paket: 'Ultimate 2', item_a_name: 'Tindakan Dokter', item_a_kuota: 4, item_b_name: 'Facial Premium', item_b_kuota: 4, harga_paket: 2300000 },
      { id: 'mp-premium-1', nama_paket: 'Premium 1', item_a_name: 'Tindakan Dokter', item_a_kuota: 8, item_b_name: 'Facial Premium', item_b_kuota: 8, harga_paket: 4100000 },
      { id: 'mp-premium-2', nama_paket: 'Premium 2', item_a_name: 'Tindakan Dokter', item_a_kuota: 12, item_b_name: 'Facial Premium', item_b_kuota: 12, harga_paket: 6100000 }
    ];

    try {
      // Remove old dummy seed records if still present
      await runQuery(`DELETE FROM master_paket WHERE id IN ('mp-1', 'mp-2', 'mp-3') AND (item_a_name LIKE '%Tindakan Dokter A%' OR item_a_name LIKE '%Tindakan Dokter B%' OR item_a_name LIKE '%Botox%')`);

      for (const dmp of defaultMasterPakets) {
        const existing = await getQuery('SELECT id FROM master_paket WHERE LOWER(TRIM(nama_paket)) = LOWER(TRIM(?)) OR id = ?', [dmp.nama_paket, dmp.id]);
        if (existing) {
          await runQuery(`
            UPDATE master_paket
            SET nama_paket = ?, item_a_name = ?, item_a_kuota = ?, item_b_name = ?, item_b_kuota = ?, harga_paket = ?
            WHERE id = ?
          `, [dmp.nama_paket, dmp.item_a_name, dmp.item_a_kuota, dmp.item_b_name, dmp.item_b_kuota, dmp.harga_paket, existing.id]);
        } else {
          await runQuery(`
            INSERT INTO master_paket (id, nama_paket, item_a_name, item_a_kuota, item_b_name, item_b_kuota, harga_paket)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [dmp.id, dmp.nama_paket, dmp.item_a_name, dmp.item_a_kuota, dmp.item_b_name, dmp.item_b_kuota, dmp.harga_paket]);
        }
      }
    } catch (e) {
      console.error('[DB] Error syncing default master packages:', e);
    }

    // 5b. Patient Packages
    await runQuery(`
      CREATE TABLE IF NOT EXISTS pasien_paket (
        id TEXT PRIMARY KEY,
        pasien_id TEXT NOT NULL,
        nama_paket TEXT NOT NULL,
        item_a_name TEXT,
        item_a_kuota INTEGER DEFAULT 0,
        item_a_total INTEGER DEFAULT 0,
        item_b_name TEXT,
        item_b_kuota INTEGER DEFAULT 0,
        item_b_total INTEGER DEFAULT 0,
        sisa_kuota INTEGER NOT NULL,
        total_kuota INTEGER NOT NULL,
        harga_paket REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pasien_id) REFERENCES pasien(id) ON DELETE CASCADE
      )
    `);

    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN item_a_name TEXT`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN item_a_kuota INTEGER DEFAULT 0`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN item_a_total INTEGER DEFAULT 0`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN item_b_name TEXT`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN item_b_kuota INTEGER DEFAULT 0`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN item_b_total INTEGER DEFAULT 0`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN is_billed INTEGER DEFAULT 0`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN transaksi_id TEXT`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN marketing_id TEXT`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket ADD COLUMN komisi_marketing REAL DEFAULT 0`); } catch (e) { }

    // 6. Patient Package Usage History
    await runQuery(`
      CREATE TABLE IF NOT EXISTS pasien_paket_usage (
        id TEXT PRIMARY KEY,
        pasien_paket_id TEXT NOT NULL,
        pasien_id TEXT,
        item_claimed TEXT,
        doingan_id TEXT,
        petugas_id TEXT,
        petugas_nama TEXT,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_by_user_id TEXT,
        notes TEXT,
        FOREIGN KEY(pasien_paket_id) REFERENCES pasien_paket(id) ON DELETE CASCADE
      )
    `);

    try { await runQuery(`ALTER TABLE pasien_paket_usage ADD COLUMN pasien_id TEXT`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket_usage ADD COLUMN item_claimed TEXT`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket_usage ADD COLUMN doingan_id TEXT`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket_usage ADD COLUMN petugas_id TEXT`); } catch (e) { }
    try { await runQuery(`ALTER TABLE pasien_paket_usage ADD COLUMN petugas_nama TEXT`); } catch (e) { }

    // 6b. System Settings (Feature Toggles) & Role Commission Matrix
    await runQuery(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await runQuery(`INSERT OR IGNORE INTO system_settings (setting_key, setting_value) VALUES ('wa_reminder_enabled', '0')`);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS role_commissions (
        role_key TEXT PRIMARY KEY,
        role_name TEXT NOT NULL,
        nominal_komisi REAL NOT NULL DEFAULT 0,
        keterangan TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Patient Reminders
    await runQuery(`
      CREATE TABLE IF NOT EXISTS pasien_reminder (
        id TEXT PRIMARY KEY,
        pasien_id TEXT NOT NULL,
        tgl_kembali DATE NOT NULL,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'CANCELLED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,
        message_text TEXT,
        FOREIGN KEY(pasien_id) REFERENCES pasien(id) ON DELETE CASCADE
      )
    `);

    // 8. Product & Stock Inventory
    await runQuery(`
      CREATE TABLE IF NOT EXISTS stok_produk (
        id TEXT PRIMARY KEY,
        nama_produk TEXT NOT NULL,
        kode_sku TEXT UNIQUE,
        tipe_stok TEXT NOT NULL CHECK(tipe_stok IN ('RETAIL', 'THERAPIST_BTC', 'KLINIK_NON_MEDIS')),
        harga_jual REAL DEFAULT 0,
        sisa_stok INTEGER DEFAULT 0,
        minimum_stok INTEGER DEFAULT 10,
        satuan TEXT DEFAULT 'pcs',
        updated_by TEXT
      )
    `);

    // 9. Stock Mutation / Requests
    await runQuery(`
      CREATE TABLE IF NOT EXISTS stok_mutasi (
        id TEXT PRIMARY KEY,
        produk_id TEXT NOT NULL,
        tipe TEXT NOT NULL CHECK(tipe IN ('IN', 'OUT', 'REQUEST', 'USAGE')),
        jumlah INTEGER NOT NULL,
        requester_user_id TEXT NOT NULL,
        approver_user_id TEXT,
        status TEXT DEFAULT 'APPROVED' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(produk_id) REFERENCES stok_produk(id) ON DELETE CASCADE
      )
    `);

    // 9b. Product Name, Price & Stock Approval Requests (Admin FO Approval Flow)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS produk_approval_requests (
        id TEXT PRIMARY KEY,
        produk_id TEXT NOT NULL,
        old_nama_produk TEXT,
        new_nama_produk TEXT,
        old_harga_jual REAL,
        new_harga_jual REAL,
        old_sisa_stok INTEGER,
        new_sisa_stok INTEGER,
        requester_user_id TEXT NOT NULL,
        approver_user_id TEXT,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(produk_id) REFERENCES stok_produk(id) ON DELETE CASCADE
      )
    `);

    // 10. Medical Treatments & Services Catalog
    await runQuery(`
      CREATE TABLE IF NOT EXISTS tindakan_medis (
        id TEXT PRIMARY KEY,
        nama_tindakan TEXT NOT NULL,
        kategori_petugas TEXT DEFAULT 'NURSE' CHECK(kategori_petugas IN ('NURSE', 'BEAUTICIAN')),
        tarif_konsul_dokter REAL DEFAULT 0,
        tarif_tindakan_medis REAL DEFAULT 0,
        komisi_fix_therapist REAL DEFAULT 0,
        percent_btc_bonus REAL DEFAULT 0,
        percent_jasa_medis_dokter REAL DEFAULT 0,
        nominal_nurse_tindakan REAL DEFAULT 0
      )
    `);

    try {
      await runQuery(`ALTER TABLE tindakan_medis ADD COLUMN kategori_petugas TEXT DEFAULT 'NURSE'`);
    } catch (e) { }

    try {
      await runQuery(`ALTER TABLE tindakan_medis ADD COLUMN is_per_benang INTEGER DEFAULT 0`);
    } catch (e) { }

    try {
      await runQuery(`ALTER TABLE tindakan_medis ADD COLUMN satuan_hitung TEXT DEFAULT 'sesi'`);
    } catch (e) { }

    // 11. Transactions
    await runQuery(`
      CREATE TABLE IF NOT EXISTS transaksi (
        id TEXT PRIMARY KEY,
        no_nota TEXT UNIQUE NOT NULL,
        pasien_id TEXT NOT NULL,
        kasir_id TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        grand_total REAL NOT NULL,
        payment_amount REAL NOT NULL,
        change_amount REAL DEFAULT 0,
        earned_points INTEGER DEFAULT 0,
        therapist_id TEXT,
        doctor_id TEXT,
        nurse_id TEXT,
        marketing_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pasien_id) REFERENCES pasien(id)
      )
    `);

    // 12. Transaction Details
    await runQuery(`
      CREATE TABLE IF NOT EXISTS transaksi_detail (
        id TEXT PRIMARY KEY,
        transaksi_id TEXT NOT NULL,
        produk_id TEXT,
        tindakan_id TEXT,
        jenis_item TEXT NOT NULL CHECK(jenis_item IN ('RETAIL', 'PAKET', 'TINDAKAN')),
        nama_item TEXT NOT NULL,
        jumlah INTEGER NOT NULL,
        harga_satuan REAL NOT NULL,
        subtotal_item REAL NOT NULL,
        therapist_id TEXT,
        FOREIGN KEY(transaksi_id) REFERENCES transaksi(id) ON DELETE CASCADE
      )
    `);

    // 13. Payroll History
    await runQuery(`
      CREATE TABLE IF NOT EXISTS riwayat_gaji (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        bulan INTEGER NOT NULL,
        tahun INTEGER NOT NULL,
        gaji_pokok REAL DEFAULT 0,
        total_komisi_produk REAL DEFAULT 0,
        total_komisi_tindakan REAL DEFAULT 0,
        bonus_lain REAL DEFAULT 0,
        grand_total REAL DEFAULT 0,
        status_pembayaran TEXT DEFAULT 'PENDING' CHECK(status_pembayaran IN ('PENDING', 'PAID')),
        paid_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, bulan, tahun)
      )
    `);

    // 14. WA Gateway Logs
    await runQuery(`
      CREATE TABLE IF NOT EXISTS wa_logs (
        id TEXT PRIMARY KEY,
        recipient_number TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT NOT NULL,
        response_data TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 15. Doingan / Treatment & Marketing Activity Log
    await runQuery(`
      CREATE TABLE IF NOT EXISTS doingan (
        id TEXT PRIMARY KEY,
        pasien_id TEXT NOT NULL,
        petugas_id TEXT NOT NULL,
        role_petugas TEXT NOT NULL,
        kategori_layanan TEXT DEFAULT 'Facial (Beautician)',
        tindakan_id TEXT,
        nama_tindakan TEXT NOT NULL,
        status_pengerjaan TEXT DEFAULT 'IN_PROGRESS',
        status_doingan TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        nominal_dp REAL DEFAULT 0,
        nominal_membership REAL DEFAULT 0,
        komisi REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pasien_id) REFERENCES pasien(id),
        FOREIGN KEY(petugas_id) REFERENCES users(id)
      )
    `);

    try {
      await runQuery(`ALTER TABLE doingan ADD COLUMN kategori_layanan TEXT DEFAULT 'Facial (Beautician)'`);
    } catch (e) {
      // column already exists
    }
    try {
      await runQuery(`ALTER TABLE doingan ADD COLUMN status_pengerjaan TEXT DEFAULT 'IN_PROGRESS'`);
    } catch (e) {
      // column already exists
    }
    try {
      await runQuery(`ALTER TABLE doingan ADD COLUMN started_at DATETIME`);
    } catch (e) {
      // column already exists
    }
    try {
      await runQuery(`ALTER TABLE doingan ADD COLUMN completed_at DATETIME`);
    } catch (e) {
      // column already exists
    }
    try {
      await runQuery(`ALTER TABLE doingan ADD COLUMN is_billed INTEGER DEFAULT 0`);
    } catch (e) {
      // column already exists
    }
    try {
      await runQuery(`ALTER TABLE doingan ADD COLUMN marketing_id TEXT`);
    } catch (e) {
      // column already exists
    }
    try {
      await runQuery(`ALTER TABLE doingan ADD COLUMN qty_benang INTEGER DEFAULT 1`);
    } catch (e) {
      // column already exists
    }
    try {
      await runQuery(`ALTER TABLE doingan ADD COLUMN total_tarif REAL DEFAULT 0`);
    } catch (e) {
      // column already exists
    }

    try {
      await runQuery(`UPDATE doingan SET started_at = created_at WHERE started_at IS NULL`);
      await runQuery("UPDATE doingan SET created_at = datetime(created_at, '+7 hours') WHERE created_at < '2026-10-06 00:00:00' AND strftime('%H', created_at) >= '17'");
      await runQuery("UPDATE doingan SET started_at = datetime(started_at, '+7 hours') WHERE started_at < '2026-10-06 00:00:00' AND strftime('%H', started_at) >= '17'");
      await runQuery("UPDATE doingan SET completed_at = datetime(completed_at, '+7 hours') WHERE completed_at < '2026-10-06 00:00:00' AND strftime('%H', completed_at) >= '17'");
    } catch (e) {
      // ignore
    }

    // Migration: Fix any negative sisa_stok in stok_produk & remove Marketing dummy doingan records
    try {
      await runQuery(`UPDATE stok_produk SET sisa_stok = 1 WHERE sisa_stok < 0 OR id = 'prod-5'`);
      await runQuery(`UPDATE doingan SET komisi = 17000 WHERE (komisi IS NULL OR komisi = 0) AND (status_doingan = 'Mbr' OR status_doingan = 'Member')`);
      await runQuery(`UPDATE doingan SET komisi = 13000 WHERE (komisi IS NULL OR komisi = 0) AND status_doingan = 'Trial' AND role_petugas != 'Marketing'`);
      await runQuery(`UPDATE doingan SET komisi = 10000 WHERE (komisi IS NULL OR komisi = 0) AND status_doingan = 'Trial' AND role_petugas = 'Marketing'`);
      await runQuery(`UPDATE doingan SET komisi = 15000 WHERE (komisi IS NULL OR komisi = 0)`);
      await runQuery(`UPDATE pasien SET tipe_pasien = 'MEMBER' WHERE tipe_pasien = 'NON-TRIAL' OR tipe_pasien = 'Reguler'`);
      await runQuery(`UPDATE pasien SET has_trial_history = 1 WHERE tipe_pasien = 'TRIAL' OR tipe_pasien = 'Trial'`);
      await runQuery(`DELETE FROM doingan WHERE role_petugas = 'Marketing' OR kategori_layanan = 'Marketing Referral' OR id LIKE 'doi-mkt-%'`);
      await runQuery(`UPDATE pasien_paket_usage SET used_at = datetime(used_at, '+7 hours') WHERE used_at < '2026-10-08 00:00:00'`);
    } catch (e) {
      // ignore
    }

    await seedDefaultData();
    console.log('[DB] Database schema and column migration completed.');

  } catch (err) {
    console.error('[DB Error]', err);
  }
}

async function seedDefaultData() {
  const commCount = await getQuery('SELECT COUNT(*) as count FROM role_commissions');
  if (commCount.count === 0) {
    await runQuery(`INSERT INTO role_commissions (role_key, role_name, nominal_komisi, keterangan) VALUES ('MARKETING', 'Marketing (Pasien Trial)', 10000, 'Komisi per akuisisi pasien trial')`);
    await runQuery(`INSERT INTO role_commissions (role_key, role_name, nominal_komisi, keterangan) VALUES ('BTC_TRIAL', 'Beautician / Nurse Pasien Trial', 13000, 'Komisi per treatment pasien trial')`);
    await runQuery(`INSERT INTO role_commissions (role_key, role_name, nominal_komisi, keterangan) VALUES ('BTC_MEMBER', 'Beautician / Nurse Pasien Member', 17000, 'Komisi per treatment pasien member')`);
    await runQuery(`INSERT INTO role_commissions (role_key, role_name, nominal_komisi, keterangan) VALUES ('BTC_TRAINING', 'Beautician / Nurse Training', 10000, 'Komisi per treatment untuk staff status training')`);
  }

  const profileRow = await getQuery('SELECT COUNT(*) as count FROM clinic_profile');
  if (profileRow.count === 0) {
    await runQuery(`
      INSERT INTO clinic_profile (id, clinic_name, tagline, address, map_latitude, map_longitude, phone, whatsapp, email, logo_url, tax_rate_percent, wa_api_url)
      VALUES (1, 'DEFLOW', 'AESTHETIC CLINIC', 'Citraland - Jl. Soekarno - Hatta No.45, Tengkerang Bar., Marpoyan Damai, Kota Pekanbaru, Riau 28124', -6.2088, 106.8456, '021-5551234', '6285121301755', 'info@deflowclinic.com', '/logo/DEFLOW_LOGO_ONLY.png', 11.0, 'https://api-wa.ipangpangeran.com/send?api_key=ipang-super-secret-key-123456')
    `);
  }

  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('admin1234', salt);

  const defaultUsers = [
    { id: 'usr-1', username: 'superadmin', password: defaultPasswordHash, full_name: 'Ipang Super Admin', role: 'Super Admin', phone: '081234567890', gaji_pokok: 0 },
    { id: 'usr-2', username: 'adminklinik', password: defaultPasswordHash, full_name: 'Gifary Admin Klinik', role: 'Admin Klinik', phone: '081234567891', gaji_pokok: 0 },
    { id: 'usr-3', username: 'manager', password: defaultPasswordHash, full_name: 'Fitria Duwita', role: 'Manager', phone: '081234567892', gaji_pokok: 5000000 },
    { id: 'usr-5', username: 'marketing1', password: defaultPasswordHash, full_name: 'Team Marketing DEFLOW', role: 'Marketing', phone: '081234567894', gaji_pokok: 3500000 },
    { id: 'usr-6', username: 'admin', password: defaultPasswordHash, full_name: 'Rani Yolanda Putri', role: 'Admin FO', phone: '081234567895', gaji_pokok: 4000000 },
    { id: 'usr-7', username: 'indah.khairun', password: defaultPasswordHash, full_name: 'Indah Khairun Nisa', role: 'Beautician', phone: '081234567896', gaji_pokok: 3500000 },
    { id: 'usr-8', username: 'riska.yulia', password: defaultPasswordHash, full_name: 'Riska Yulia Dewi', role: 'Nurse', phone: '081234567897', gaji_pokok: 3800000 },
    { id: 'usr-9', username: 'henni.mariani', password: defaultPasswordHash, full_name: 'Henni Mariani', role: 'Beautician', phone: '081234567896', gaji_pokok: 3500000 },
    { id: 'usr-10', username: 'anggun.aprilia', password: defaultPasswordHash, full_name: 'Anggun Aprilia Sofyani', role: 'Beautician', phone: '081234567896', gaji_pokok: 3500000 }
  ];

  for (const u of defaultUsers) {
    const existingByUsername = await getQuery('SELECT id FROM users WHERE username = ?', [u.username]);
    const existingById = await getQuery('SELECT id FROM users WHERE id = ?', [u.id]);

    if (!existingByUsername && !existingById) {
      await runQuery(
        'INSERT INTO users (id, username, password, full_name, role, phone, gaji_pokok) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.username, u.password, u.full_name, u.role, u.phone, u.gaji_pokok]
      );
    }
  }

  // Backfill default salary for roles if not set
  try {
    await runQuery(`UPDATE users SET gaji_pokok = 5000000 WHERE role = 'Manager' AND (gaji_pokok IS NULL OR gaji_pokok = 0)`);
    await runQuery(`UPDATE users SET gaji_pokok = 4000000 WHERE (role = 'Admin FO' OR role = 'Resepsionis / Cashier') AND (gaji_pokok IS NULL OR gaji_pokok = 0)`);
    await runQuery(`UPDATE users SET gaji_pokok = 0 WHERE role IN ('Super Admin', 'Admin System', 'Admin Klinik')`);
  } catch (e) {
    // ignore
  }

  const roles = ['Super Admin', 'Admin System', 'Admin Klinik', 'Manager', 'Admin FO', 'Beautician', 'Nurse', 'Marketing'];
  const modules = [
    'clinic_profile', 'acl', 'patient_intake', 'patient_management', 'doingan', 'patient_packages',
    'reminders', 'inventory_retail', 'inventory_btc', 'inventory_non_medical',
    'pricing', 'tindakan_crud', 'commission_formulas', 'payroll'
  ];

  for (const role of roles) {
    for (const mod of modules) {
      let c = 0, r = 0, u = 0, d = 0;
      if (role === 'Super Admin' || role === 'Admin System' || role === 'Admin Klinik') {
        c = 1; r = 1; u = 1; d = 1;
      } else if (role === 'Manager') {
        c = 1; r = 1; u = 1; d = 1;
      } else if (role === 'Admin FO') {
        if (['patient_intake', 'patient_packages', 'reminders', 'doingan', 'patient_management'].includes(mod)) { c = 1; r = 1; u = 1; d = 1; }
        else if (['clinic_profile', 'pricing'].includes(mod)) { r = 1; }
      } else if (role === 'Beautician' || role === 'Nurse') {
        if (['doingan'].includes(mod)) { c = 1; r = 1; u = 1; d = 0; }
      } else if (role === 'Marketing') {
        if (['doingan'].includes(mod)) { c = 1; r = 1; u = 1; d = 0; }
        else if (['patient_intake'].includes(mod)) { r = 1; }
      }
      await runQuery(`
        INSERT INTO role_permissions (role, module_key, can_create, can_read, can_update, can_delete)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(role, module_key) DO NOTHING
      `, [role, mod, c, r, u, d]);
    }
  }

  const prodRow = await getQuery('SELECT COUNT(*) as count FROM stok_produk');
  if (prodRow.count === 0) {
    const products = [
      ['prod-1', 'DEFLOW Glowing Facial Wash 100ml', 'SKU-FW01', 'RETAIL', 150000, 45, 10, 'botol'],
      ['prod-2', 'DEFLOW Rose Water Toner 100ml', 'SKU-TN01', 'RETAIL', 125000, 30, 10, 'botol'],
      ['prod-3', 'DEFLOW Brightening Serum Vit-C 30ml', 'SKU-SR01', 'RETAIL', 280000, 2, 5, 'botol'],
      ['prod-4', 'DEFLOW UV Shield Sunscreen SPF 50', 'SKU-SS01', 'RETAIL', 175000, 50, 15, 'tube'],
      ['prod-5', 'DEFLOW Night Rejuvenating Cream 30g', 'SKU-NC01', 'RETAIL', 240000, 1, 5, 'jar'],
      ['prod-6', 'Serum Laser Hyaluronic Grade A (Ampul)', 'SKU-BTC01', 'THERAPIST_BTC', 350000, 25, 5, 'ampul'],
      ['prod-7', 'Masker Peel-Off Gold Collagen 500g', 'SKU-BTC02', 'THERAPIST_BTC', 450000, 8, 2, 'pack'],
      ['prod-8', 'Cairan Chemical Peeling Glycolic 30%', 'SKU-BTC03', 'THERAPIST_BTC', 500000, 2, 2, 'botol'],
      ['prod-9', 'Tisu Facial Wajah Premium 250s', 'SKU-OPS01', 'KLINIK_NON_MEDIS', 18000, 120, 20, 'pack'],
      ['prod-10', 'Sarung Tangan Nitrile Steril (Size M)', 'SKU-OPS02', 'KLINIK_NON_MEDIS', 85000, 35, 10, 'box'],
      ['prod-11', 'Kapas Kecantikan Soft Round 100s', 'SKU-OPS03', 'KLINIK_NON_MEDIS', 15000, 80, 15, 'pack']
    ];
    for (const p of products) {
      await runQuery('INSERT INTO stok_produk (id, nama_produk, kode_sku, tipe_stok, harga_jual, sisa_stok, minimum_stok, satuan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', p);
    }
  }

  // Seed the 31 official treatments from DEFLOW catalog
  const requestedTreatments = [
    // [id, nama_tindakan, kategori_petugas, tarif_konsul_dokter, tarif_tindakan_medis, komisi_fix_therapist, percent_btc_bonus, percent_jasa_medis_dokter, nominal_nurse_tindakan, is_per_benang, satuan_hitung]
    ['tnd-1', 'Benang Hidung', 'NURSE', 0, 599000, 0, 0, 0, 20000, 1, 'benang'],
    ['tnd-2', 'Benang Pipi', 'NURSE', 0, 999000, 0, 0, 0, 20000, 1, 'benang'],
    ['tnd-3', 'Botox Dahi 50 Unit', 'NURSE', 0, 1500000, 0, 0, 0, 20000, 0, 'sesi'],
    ['tnd-4', 'Botox Rahang 50 Unit', 'NURSE', 0, 1500000, 0, 0, 0, 20000, 0, 'sesi'],
    ['tnd-5', 'Cauter', 'NURSE', 0, 500000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-6', 'DNA Salmon', 'NURSE', 0, 1000000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-7', 'Detox', 'BEAUTICIAN', 0, 0, 17000, 0, 0, 0, 0, 'sesi'],
    ['tnd-8', 'Filler Dagu', 'NURSE', 0, 2000000, 0, 0, 0, 20000, 0, 'sesi'],
    ['tnd-9', 'Filler Hidung', 'NURSE', 0, 2000000, 0, 0, 0, 20000, 0, 'sesi'],
    ['tnd-10', 'HF', 'BEAUTICIAN', 0, 0, 17000, 0, 0, 0, 0, 'sesi'],
    ['tnd-11', 'Infus Choromosome', 'NURSE', 0, 1000000, 0, 0, 0, 15000, 0, 'sesi'],
    ['tnd-12', 'Infus Whitening', 'NURSE', 0, 700000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-13', 'JuveLook', 'NURSE', 0, 8000000, 0, 0, 0, 30000, 0, 'sesi'],
    ['tnd-14', 'JuveLook Volume', 'NURSE', 0, 11000000, 0, 0, 0, 30000, 0, 'sesi'],
    ['tnd-15', 'Laser Blackdoll', 'NURSE', 0, 1000000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-16', 'Laser DPL', 'NURSE', 0, 1000000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-17', 'Laser Pico', 'NURSE', 0, 1500000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-18', 'Laser Underarmd', 'NURSE', 0, 700000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-19', 'Messo Lippo', 'NURSE', 0, 750000, 0, 0, 0, 6000, 0, 'sesi'],
    ['tnd-20', 'Micro', 'BEAUTICIAN', 0, 0, 17000, 0, 0, 0, 0, 'sesi'],
    ['tnd-21', 'Organic', 'BEAUTICIAN', 0, 0, 17000, 0, 0, 0, 0, 'sesi'],
    ['tnd-22', 'Oxy', 'BEAUTICIAN', 0, 0, 17000, 0, 0, 0, 0, 'sesi'],
    ['tnd-23', 'PDT', 'BEAUTICIAN', 0, 0, 17000, 0, 0, 0, 0, 'sesi'],
    ['tnd-24', 'Peeling Acne', 'NURSE', 0, 799000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-25', 'Peeling Llaha', 'NURSE', 0, 1000000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-26', 'Platelet-Rich Plasma (PRP)', 'NURSE', 0, 1000000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-27', 'RF', 'BEAUTICIAN', 0, 0, 17000, 0, 0, 0, 0, 'sesi'],
    ['tnd-28', 'Subsisi', 'NURSE', 0, 1200000, 0, 0, 0, 10000, 0, 'sesi'],
    ['tnd-29', 'Vittaran PN', 'NURSE', 0, 5999000, 0, 0, 0, 20000, 0, 'sesi'],
    ['tnd-30', 'Vittaran Poly Booster', 'NURSE', 0, 6999000, 0, 0, 0, 20000, 0, 'sesi']
  ];

  // Clean up previous typos in names
  try {
    await runQuery("UPDATE tindakan_medis SET nama_tindakan = 'Laser Blackdoll' WHERE nama_tindakan LIKE 'Laser Blackdoll%'");
    await runQuery("UPDATE tindakan_medis SET nama_tindakan = 'Filler Dagu' WHERE nama_tindakan = 'Filter Dagu'");
    await runQuery("UPDATE tindakan_medis SET nama_tindakan = 'Filler Hidung' WHERE nama_tindakan = 'Filter Hidung'");
    await runQuery("UPDATE tindakan_medis SET nama_tindakan = 'Messo Lippo' WHERE nama_tindakan = 'Messo'");
    await runQuery("DELETE FROM tindakan_medis WHERE nama_tindakan = 'Peeling Baru'");
    await runQuery("DELETE FROM tindakan_medis WHERE nama_tindakan = 'Oxy & PDT'");
    await runQuery("DELETE FROM tindakan_medis WHERE nama_tindakan = 'Botox'");
  } catch (e) { }

  let offIdx = 1;
  for (const t of requestedTreatments) {
    const existing = await getQuery('SELECT id FROM tindakan_medis WHERE nama_tindakan = ?', [t[1]]);
    if (!existing) {
      const newId = 'tnd-off-' + Date.now() + '-' + (offIdx++);
      await runQuery('INSERT INTO tindakan_medis (id, nama_tindakan, kategori_petugas, tarif_konsul_dokter, tarif_tindakan_medis, komisi_fix_therapist, percent_btc_bonus, percent_jasa_medis_dokter, nominal_nurse_tindakan, is_per_benang, satuan_hitung) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [newId, t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9], t[10]]);
    } else {
      await runQuery(`
        UPDATE tindakan_medis 
        SET kategori_petugas = ?, tarif_tindakan_medis = ?, komisi_fix_therapist = ?, nominal_nurse_tindakan = ?, is_per_benang = ?, satuan_hitung = ?
        WHERE id = ?
      `, [t[2], t[4], t[5], t[8], t[9], t[10], existing.id]);
    }
  }

  // Ensure strict separation: Nurse treatments have 0 BTC commission, Beautician treatments have 0 Nurse commission
  await runQuery("UPDATE tindakan_medis SET komisi_fix_therapist = 0 WHERE kategori_petugas = 'NURSE'");
  await runQuery("UPDATE tindakan_medis SET nominal_nurse_tindakan = 0 WHERE kategori_petugas = 'BEAUTICIAN'");

  // Seed initial doingan sample records if empty
  const dRow = await getQuery('SELECT COUNT(*) as count FROM doingan');
  if (dRow.count === 0) {
    await runQuery(`
      INSERT INTO doingan (id, pasien_id, petugas_id, role_petugas, tindakan_id, nama_tindakan, status_doingan, nominal_dp, nominal_membership, komisi, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['doi-1', 'pasien-1', 'usr-4', 'Beautician', 'tnd-1', 'Platelet-Rich Plasma (PRP)', 'Mbr', 0, 0, 17000, 'Doingan treatment member berjalan lancar']);

    await runQuery(`
      INSERT INTO doingan (id, pasien_id, petugas_id, role_petugas, tindakan_id, nama_tindakan, status_doingan, nominal_dp, nominal_membership, komisi, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['doi-2', 'pasien-2', 'usr-4', 'Beautician', 'tnd-7', 'Peeling Acne', 'Trial', 0, 0, 13000, 'Doingan pasien trial free']);

    await runQuery(`
      INSERT INTO doingan (id, pasien_id, petugas_id, role_petugas, tindakan_id, nama_tindakan, status_doingan, nominal_dp, nominal_membership, komisi, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['doi-3', 'pasien-2', 'usr-5', 'Marketing', null, 'Pasien Trial Marketing', 'Trial', 0, 0, 10000, 'Registrasi pasien trial oleh Marketing']);
  }
}

initDb();

module.exports = {
  db,
  runQuery,
  getQuery,
  allQuery
};
