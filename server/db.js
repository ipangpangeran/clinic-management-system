const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'deflow.db');
const db = new sqlite3.Database(dbPath);

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
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
        wa_api_url TEXT DEFAULT 'https://api-wa.ipangpangeran.com/send?api_key=ipang-super-secret-key-123456',
        idle_timeout_minutes INTEGER DEFAULT 15
      )
    `);

    // Migration: Add wa_api_url and idle_timeout_minutes if missing in existing DB
    try {
      await runQuery(`ALTER TABLE clinic_profile ADD COLUMN wa_api_url TEXT DEFAULT 'https://api-wa.ipangpangeran.com/send?api_key=ipang-super-secret-key-123456'`);
    } catch (e) {}

    try {
      await runQuery(`ALTER TABLE clinic_profile ADD COLUMN idle_timeout_minutes INTEGER DEFAULT 15`);
    } catch (e) {}


    // 2. Users Table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        tipe_pasien TEXT NOT NULL CHECK(tipe_pasien IN ('TRIAL', 'NON-TRIAL')),
        alamat TEXT,
        tgl_lahir DATE,
        riwayat_alergi TEXT,
        jenis_kulit TEXT,
        rekomendasi_dokter TEXT,
        total_poin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Patient Packages
    await runQuery(`
      CREATE TABLE IF NOT EXISTS pasien_paket (
        id TEXT PRIMARY KEY,
        pasien_id TEXT NOT NULL,
        nama_paket TEXT NOT NULL,
        sisa_kuota INTEGER NOT NULL,
        total_kuota INTEGER NOT NULL,
        harga_paket REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pasien_id) REFERENCES pasien(id) ON DELETE CASCADE
      )
    `);

    // 6. Patient Package Usage History
    await runQuery(`
      CREATE TABLE IF NOT EXISTS pasien_paket_usage (
        id TEXT PRIMARY KEY,
        pasien_paket_id TEXT NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_by_user_id TEXT,
        notes TEXT,
        FOREIGN KEY(pasien_paket_id) REFERENCES pasien_paket(id) ON DELETE CASCADE
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
        tarif_konsul_dokter REAL DEFAULT 0,
        tarif_tindakan_medis REAL DEFAULT 0,
        komisi_fix_therapist REAL DEFAULT 0,
        percent_btc_bonus REAL DEFAULT 0,
        percent_jasa_medis_dokter REAL DEFAULT 0,
        nominal_nurse_tindakan REAL DEFAULT 0
      )
    `);

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
        tindakan_id TEXT,
        nama_tindakan TEXT NOT NULL,
        status_doingan TEXT,
        nominal_dp REAL DEFAULT 0,
        nominal_membership REAL DEFAULT 0,
        komisi REAL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(pasien_id) REFERENCES pasien(id),
        FOREIGN KEY(petugas_id) REFERENCES users(id)
      )
    `);

    // Migration: Fix any negative sisa_stok in stok_produk
    try {
      await runQuery(`UPDATE stok_produk SET sisa_stok = 1 WHERE sisa_stok < 0 OR id = 'prod-5'`);
      await runQuery(`UPDATE doingan SET komisi = 17000 WHERE (komisi IS NULL OR komisi = 0) AND (status_doingan = 'Mbr' OR status_doingan = 'Member')`);
      await runQuery(`UPDATE doingan SET komisi = 13000 WHERE (komisi IS NULL OR komisi = 0) AND status_doingan = 'Trial' AND role_petugas != 'Marketing'`);
      await runQuery(`UPDATE doingan SET komisi = 10000 WHERE (komisi IS NULL OR komisi = 0) AND status_doingan = 'Trial' AND role_petugas = 'Marketing'`);
      await runQuery(`UPDATE doingan SET komisi = 15000 WHERE (komisi IS NULL OR komisi = 0)`);
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
    { id: 'usr-1', username: 'superadmin', password: defaultPasswordHash, full_name: 'Ipang Super Admin', role: 'Super Admin', phone: '081234567890' },
    { id: 'usr-2', username: 'adminklinik', password: defaultPasswordHash, full_name: 'Gifary Admin Klinik', role: 'Admin Klinik', phone: '081234567891' },
    { id: 'usr-3', username: 'nurse-anita', password: defaultPasswordHash, full_name: 'Perawat Anita', role: 'Nurse', phone: '081234567892' },
    { id: 'usr-4', username: 'beautician-maya', password: defaultPasswordHash, full_name: 'Maya Beautician', role: 'Beautician', phone: '081234567893' },
    { id: 'usr-5', username: 'marketing-doni', password: defaultPasswordHash, full_name: 'Doni Marketing', role: 'Marketing', phone: '081234567894' },
    { id: 'usr-6', username: 'fo-rere', password: defaultPasswordHash, full_name: 'Rere Admin FO', role: 'Admin FO', phone: '081234567895' },
    { id: 'usr-7', username: 'dr-clara', password: defaultPasswordHash, full_name: 'dr. Clara Sp.KK', role: 'Dokter', phone: '081234567896' }
  ];

  for (const u of defaultUsers) {
    const existingByUsername = await getQuery('SELECT id FROM users WHERE username = ?', [u.username]);
    const existingById = await getQuery('SELECT id FROM users WHERE id = ?', [u.id]);

    if (existingByUsername) {
      await runQuery(
        'UPDATE users SET password = ?, role = ?, full_name = ?, phone = ? WHERE id = ?',
        [u.password, u.role, u.full_name, u.phone, existingByUsername.id]
      );
    } else if (existingById) {
      await runQuery(
        'UPDATE users SET username = ?, password = ?, full_name = ?, role = ?, phone = ? WHERE id = ?',
        [u.username, u.password, u.full_name, u.role, u.phone, u.id]
      );
    } else {
      await runQuery(
        'INSERT INTO users (id, username, password, full_name, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
        [u.id, u.username, u.password, u.full_name, u.role, u.phone]
      );
    }
  }

  const roles = ['Super Admin', 'Admin System', 'Admin Klinik', 'Nurse', 'Beautician', 'Marketing', 'Admin FO', 'Dokter'];
  const modules = [
    'clinic_profile', 'acl', 'patient_intake', 'patient_management', 'doingan', 'patient_packages', 
    'reminders', 'inventory_retail', 'inventory_btc', 'inventory_non_medical', 
    'pricing', 'commission_formulas', 'payroll'
  ];

  for (const role of roles) {
    for (const mod of modules) {
      let c=0, r=0, u=0, d=0;
      if (role === 'Super Admin' || role === 'Admin System' || role === 'Admin Klinik') {
        c=1; r=1; u=1; d=1;
      } else if (role === 'Admin FO') {
        if (['patient_intake', 'patient_packages', 'reminders'].includes(mod)) { c=1; r=1; u=1; d=1; }
        else if (['patient_management'].includes(mod)) { c=1; r=1; u=0; d=0; }
        else if (['clinic_profile', 'doingan', 'pricing'].includes(mod)) { r=1; }
      } else if (role === 'Nurse' || role === 'Beautician' || role === 'Marketing') {
        if (['doingan', 'patient_intake'].includes(mod)) { c=1; r=1; u=1; d=0; }
        else if (['payroll', 'pricing', 'patient_packages'].includes(mod)) { r=1; }
      } else {
        if (['patient_intake', 'doingan', 'patient_packages', 'reminders'].includes(mod)) { r=1; }
      }
      await runQuery(`
        INSERT INTO role_permissions (role, module_key, can_create, can_read, can_update, can_delete)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(role, module_key) DO NOTHING
      `, [role, mod, c, r, u, d]);
    }
  }

  const pRow = await getQuery('SELECT COUNT(*) as count FROM pasien');
  if (pRow.count === 0) {
    await runQuery(`
      INSERT INTO pasien (id, no_ktp, no_hp, nama_lengkap, tipe_pasien, alamat, tgl_lahir, riwayat_alergi, jenis_kulit, total_poin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['pasien-1', '3171012345670001', '081298765432', 'Nia Ramadhani', 'NON-TRIAL', 'Jl. Senopati No. 12, Jakarta', '1995-04-15', 'Tidak ada', 'Kombinasi / Sensitif', 120]);
    
    await runQuery(`
      INSERT INTO pasien (id, no_ktp, no_hp, nama_lengkap, tipe_pasien, alamat, tgl_lahir, riwayat_alergi, jenis_kulit, total_poin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['pasien-2', '3171012345670002', '085297532050', 'Budi Santoso', 'TRIAL', 'Jl. Tebet Raya No. 45, Jakarta', '1998-08-20', 'Alergi Seafood', 'Berminyak', 0]);

    await runQuery(`
      INSERT INTO pasien (id, no_ktp, no_hp, nama_lengkap, tipe_pasien, alamat, tgl_lahir, riwayat_alergi, jenis_kulit, total_poin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['pasien-3', '3171012345670003', '087812345678', 'Siti Rahma', 'NON-TRIAL', 'Jl. Kemang Selatan No. 9', '1992-11-03', 'Alergi Debu', 'Kering', 350]);

    await runQuery(`
      INSERT INTO pasien_paket (id, pasien_id, nama_paket, sisa_kuota, total_kuota, harga_paket)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['pkg-1', 'pasien-1', 'Paket Glowing Facial Deluxe (5x)', 3, 5, 2500000]);

    await runQuery(`
      INSERT INTO pasien_paket (id, pasien_id, nama_paket, sisa_kuota, total_kuota, harga_paket)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['pkg-2', 'pasien-3', 'Paket Laser Rejuvenation VIP (3x)', 2, 3, 4500000]);

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    await runQuery(`
      INSERT INTO pasien_reminder (id, pasien_id, tgl_kembali, status, message_text)
      VALUES (?, ?, ?, ?, ?)
    `, ['rem-1', 'pasien-2', tomorrow, 'PENDING', `Halo Kak Budi Santoso, kami dari DEFLOW AESTHETIC CLINIC. Menandai kalender Anda, besok tanggal ${tomorrow} ada jadwal perawatan kembali untuk Anda. Konfirmasi kedatangan dengan membalas pesan ini ya Kak. Sampai jumpa!`]);
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

  // Seed the 15 requested treatments from user prompt
  const requestedTreatments = [
    ['tnd-1', 'Platelet-Rich Plasma (PRP)', 150000, 1200000, 17000, 5, 20, 15000],
    ['tnd-2', 'DNA Salmon', 150000, 1500000, 17000, 5, 20, 15000],
    ['tnd-3', 'Laser Pico', 150000, 1000000, 17000, 5, 20, 15000],
    ['tnd-4', 'Laser DPL', 0, 800000, 17000, 5, 15, 15000],
    ['tnd-5', 'Laser Blackdoll4', 0, 850000, 17000, 5, 15, 15000],
    ['tnd-6', 'Laser Underarmd', 0, 450000, 17000, 5, 15, 13000],
    ['tnd-7', 'Peeling Acne', 0, 350000, 17000, 5, 10, 13000],
    ['tnd-8', 'Peeling Baru', 0, 400000, 17000, 5, 10, 13000],
    ['tnd-9', 'Vittaran Poly Booster', 150000, 1800000, 17000, 5, 20, 15000],
    ['tnd-10', 'JuveLook', 150000, 2500000, 17000, 5, 20, 15000],
    ['tnd-11', 'Cauter', 100000, 500000, 17000, 5, 15, 13000],
    ['tnd-12', 'Benang Hidung', 200000, 2000000, 17000, 5, 25, 20000],
    ['tnd-13', 'Benang Pipi', 200000, 3000000, 17000, 5, 25, 20000],
    ['tnd-14', 'Infus Whitening', 0, 600000, 17000, 5, 15, 13000],
    ['tnd-15', 'Infus Choromosome', 0, 1200000, 17000, 5, 20, 15000]
  ];

  for (const t of requestedTreatments) {
    const existing = await getQuery('SELECT id FROM tindakan_medis WHERE id = ? OR nama_tindakan = ?', [t[0], t[1]]);
    if (!existing) {
      await runQuery('INSERT INTO tindakan_medis (id, nama_tindakan, tarif_konsul_dokter, tarif_tindakan_medis, komisi_fix_therapist, percent_btc_bonus, percent_jasa_medis_dokter, nominal_nurse_tindakan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', t);
    }
  }

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
