const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const cron = require('node-cron');
const { runQuery, getQuery, allQuery } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'deflow_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

// Serve static logo assets
app.use('/logo', express.static(path.join(__dirname, '../stitch_deflow_aesthetic_clinic_dashboard/logo')));
app.use('/logo', express.static(path.join(__dirname, '../client/public/logo')));

// Serve compiled React frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

// --- AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Akses ditolak: Token tidak ditemukan' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid' });
    req.user = user;
    next();
  });
}

// --- AUTH ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan Password wajib diisi' });
    }

    const user = await getQuery('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(400).json({ message: 'Username atau password salah' });
    }

    const validPass = bcrypt.compareSync(password, user.password);
    if (!validPass) {
      return res.status(400).json({ message: 'Username atau password salah' });
    }

    const permissions = await allQuery('SELECT module_key, can_create, can_read, can_update, can_delete FROM role_permissions WHERE role = ?', [user.role]);

    const tokenPayload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone
      },
      permissions
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery('SELECT id, username, full_name, role, phone FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });
    const permissions = await allQuery('SELECT module_key, can_create, can_read, can_update, can_delete FROM role_permissions WHERE role = ?', [user.role]);
    res.json({ user, permissions });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user profile', error: err.message });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await allQuery('SELECT id, username, full_name, role, phone, gaji_pokok, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin System' && req.user.role !== 'Admin Klinik') {
      return res.status(403).json({ message: 'Akses ditolak: Menu kelola user hanya untuk Super Admin & Admin Klinik' });
    }

    const { username, password, full_name, role, phone, gaji_pokok } = req.body;
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ message: 'Username, Password, Nama, dan Role wajib diisi' });
    }

    const existing = await getQuery('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ message: 'Username sudah digunakan oleh user lain' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const id = 'usr-' + Date.now();

    const salaryVal = role === 'Super Admin' || role === 'Admin System' || role === 'Admin Klinik' ? 0 : parseFloat(gaji_pokok || 0);

    await runQuery(`
      INSERT INTO users (id, username, password, full_name, role, phone, gaji_pokok)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, username, passwordHash, full_name, role, phone || null, salaryVal]);

    const newUser = await getQuery('SELECT id, username, full_name, role, phone, gaji_pokok FROM users WHERE id = ?', [id]);
    res.status(201).json({ message: 'User baru berhasil dibuat', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin System' && req.user.role !== 'Admin Klinik') {
      return res.status(403).json({ message: 'Akses ditolak: Menu kelola user hanya untuk Super Admin & Admin Klinik' });
    }

    const { id } = req.params;
    const { username, password, full_name, role, phone, gaji_pokok } = req.body;

    const existingUsername = await getQuery('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
    if (existingUsername) {
      return res.status(400).json({ message: 'Username sudah digunakan oleh user lain' });
    }

    const salaryVal = role === 'Super Admin' || role === 'Admin System' || role === 'Admin Klinik' ? 0 : parseFloat(gaji_pokok || 0);

    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      await runQuery(`
        UPDATE users SET username = ?, password = ?, full_name = ?, role = ?, phone = ?, gaji_pokok = ? WHERE id = ?
      `, [username, passwordHash, full_name, role, phone || null, salaryVal, id]);
    } else {
      await runQuery(`
        UPDATE users SET username = ?, full_name = ?, role = ?, phone = ?, gaji_pokok = ? WHERE id = ?
      `, [username, full_name, role, phone || null, salaryVal, id]);
    }

    const updated = await getQuery('SELECT id, username, full_name, role, phone, gaji_pokok FROM users WHERE id = ?', [id]);
    res.json({ message: 'Data user berhasil diperbarui', user: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin System' && req.user.role !== 'Admin Klinik') {
      return res.status(403).json({ message: 'Akses ditolak: Menu kelola user hanya untuk Super Admin & Admin Klinik' });
    }

    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif' });
    }

    // Clean up foreign key references before deleting user
    await runQuery('DELETE FROM riwayat_gaji WHERE user_id = ?', [id]);
    await runQuery('DELETE FROM doingan WHERE petugas_id = ?', [id]);
    await runQuery('UPDATE transaksi SET therapist_id = NULL WHERE therapist_id = ?', [id]);
    await runQuery('UPDATE transaksi SET doctor_id = NULL WHERE doctor_id = ?', [id]);
    await runQuery('UPDATE transaksi SET nurse_id = NULL WHERE nurse_id = ?', [id]);
    await runQuery('UPDATE transaksi SET marketing_id = NULL WHERE marketing_id = ?', [id]);
    await runQuery('UPDATE transaksi_detail SET therapist_id = NULL WHERE therapist_id = ?', [id]);
    await runQuery('UPDATE stok_mutasi SET requester_user_id = NULL WHERE requester_user_id = ?', [id]);
    await runQuery('UPDATE stok_mutasi SET approver_user_id = NULL WHERE approver_user_id = ?', [id]);
    await runQuery('UPDATE pasien_paket_usage SET used_by_user_id = NULL WHERE used_by_user_id = ?', [id]);
    
    // Reassign transactions as kasir to current admin performing delete to satisfy FK
    const trxAsKasir = await getQuery('SELECT id FROM transaksi WHERE kasir_id = ?', [id]);
    if (trxAsKasir) {
      await runQuery('UPDATE transaksi SET kasir_id = ? WHERE kasir_id = ?', [req.user.id, id]);
    }

    await runQuery('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
});

// --- DOINGAN & ACTIVITY LOG ROUTES (NURSE, BEAUTICIAN, MARKETING) ---
app.get('/api/doingan', authenticateToken, async (req, res) => {
  try {
    const list = await allQuery(`
      SELECT d.*, p.nama_lengkap as pasien_nama, p.no_hp as pasien_hp, p.tipe_pasien, u.full_name as petugas_nama
      FROM doingan d
      JOIN pasien p ON d.pasien_id = p.id
      JOIN users u ON d.petugas_id = u.id
      ORDER BY d.created_at DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching doingan records', error: err.message });
  }
});

// GET /api/staff-availability -> Returns staff users with their active work status
app.get('/api/staff-availability', authenticateToken, async (req, res) => {
  try {
    const { lini } = req.query; // 'Beautician' or 'Nurse'
    let query = "SELECT id, username, full_name, role, lini_profesi FROM users WHERE role NOT IN ('Super Admin', 'Admin System', 'Admin Klinik', 'Admin FO', 'Manager')";
    const params = [];
    if (lini) {
      query += " AND (role = ? OR (lini_profesi = ? AND role IN ('Beautician', 'Nurse')))";
      params.push(lini, lini);
    }
    const staffList = await allQuery(query, params);
    
    // Check active doingan for each staff
    const result = [];
    for (const s of staffList) {
      const active = await getQuery(`
        SELECT d.*, p.nama_lengkap as pasien_nama, p.tipe_pasien
        FROM doingan d
        JOIN pasien p ON d.pasien_id = p.id
        WHERE d.petugas_id = ? AND d.status_pengerjaan = 'IN_PROGRESS'
        ORDER BY d.created_at DESC LIMIT 1
      `, [s.id]);
      
      result.push({
        ...s,
        is_busy: Boolean(active),
        active_doingan: active || null
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching staff availability', error: err.message });
  }
});

// POST /api/doingan/assign -> Admin FO assigns patient to staff member
app.post('/api/doingan/assign', authenticateToken, async (req, res) => {
  try {
    const { pasien_id, petugas_id, kategori_layanan, notes } = req.body;
    if (!pasien_id || !petugas_id) {
      return res.status(400).json({ message: 'Pasien dan Petugas wajib dipilih' });
    }

    const pasien = await getQuery('SELECT * FROM pasien WHERE id = ?', [pasien_id]);
    const petugas = await getQuery('SELECT * FROM users WHERE id = ?', [petugas_id]);
    if (!pasien || !petugas) return res.status(404).json({ message: 'Pasien atau Petugas tidak ditemukan' });

    // Check if staff already has active doingan
    const active = await getQuery("SELECT id FROM doingan WHERE petugas_id = ? AND status_pengerjaan = 'IN_PROGRESS'", [petugas_id]);
    if (active) {
      return res.status(400).json({ message: `Petugas ${petugas.full_name} saat ini sedang menangani pasien lain!` });
    }

    const id = 'doi-' + Date.now();
    const statusDoingan = (pasien.tipe_pasien === 'MEMBER' || pasien.tipe_pasien === 'NON-TRIAL' || pasien.tipe_pasien === 'Reguler') ? 'Mbr' : 'Trial';

    await runQuery(`
      INSERT INTO doingan (
        id, pasien_id, petugas_id, role_petugas, kategori_layanan, tindakan_id, nama_tindakan,
        status_pengerjaan, status_doingan, started_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS', ?, CURRENT_TIMESTAMP, ?)
    `, [
      id, pasien_id, petugas_id, petugas.role || 'Staff',
      kategori_layanan || (petugas.lini_profesi === 'Nurse' ? 'Tindakan Medis (Nurse)' : 'Facial (Beautician)'),
      null, 'Menunggu Konfirmasi Tindakan', statusDoingan, notes || ''
    ]);

    res.status(201).json({ message: `Pasien ${pasien.nama_lengkap} berhasil di-assign ke ${petugas.full_name}`, doingan_id: id });
  } catch (err) {
    res.status(500).json({ message: 'Error assigning patient', error: err.message });
  }
});

// GET /api/doingan/staff/active -> Current logged in staff active session
app.get('/api/doingan/staff/active', authenticateToken, async (req, res) => {
  try {
    const active = await getQuery(`
      SELECT d.*, p.nama_lengkap as pasien_nama, p.no_hp as pasien_hp, p.tipe_pasien, p.jenis_kulit, p.riwayat_alergi
      FROM doingan d
      JOIN pasien p ON d.pasien_id = p.id
      WHERE d.petugas_id = ? AND d.status_pengerjaan = 'IN_PROGRESS'
      ORDER BY d.created_at DESC LIMIT 1
    `, [req.user.id]);

    const history = await allQuery(`
      SELECT d.*, p.nama_lengkap as pasien_nama, p.tipe_pasien
      FROM doingan d
      JOIN pasien p ON d.pasien_id = p.id
      WHERE d.petugas_id = ? AND d.status_pengerjaan = 'COMPLETED'
      ORDER BY d.completed_at DESC LIMIT 10
    `, [req.user.id]);

    res.json({ active_doingan: active || null, history: history || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching staff active session', error: err.message });
  }
});

// POST /api/doingan/:id/complete -> Staff confirms completed treatment items
app.post('/api/doingan/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tindakan_ids, notes } = req.body; // array of treatment IDs or single ID

    const doi = await getQuery('SELECT d.*, p.tipe_pasien FROM doingan d JOIN pasien p ON d.pasien_id = p.id WHERE d.id = ?', [id]);
    if (!doi) return res.status(404).json({ message: 'Pengerjaan doingan tidak ditemukan' });

    let finalNamaTindakan = 'Perawatan Selesai';
    let totalKomisi = 0;
    let mainTindakanId = null;

    if (tindakan_ids && Array.isArray(tindakan_ids) && tindakan_ids.length > 0) {
      const placeholders = tindakan_ids.map(() => '?').join(',');
      const selectedTreatments = await allQuery(`SELECT * FROM tindakan_medis WHERE id IN (${placeholders})`, tindakan_ids);
      
      finalNamaTindakan = selectedTreatments.map(t => t.nama_tindakan).join(', ');
      mainTindakanId = selectedTreatments[0]?.id || null;

      selectedTreatments.forEach(t => {
        if (doi.status_doingan === 'Mbr' || doi.status_doingan === 'Member') {
          totalKomisi += (t.komisi_fix_therapist || 17000);
        } else if (doi.status_doingan === 'Trial') {
          totalKomisi += (t.nominal_nurse_tindakan || 13000);
        } else {
          totalKomisi += (t.komisi_fix_therapist || 15000);
        }
      });
    } else {
      totalKomisi = (doi.status_doingan === 'Mbr' || doi.status_doingan === 'Member') ? 17000 : 13000;
    }

    await runQuery(`
      UPDATE doingan
      SET status_pengerjaan = 'COMPLETED',
          tindakan_id = ?,
          nama_tindakan = ?,
          komisi = ?,
          notes = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [mainTindakanId, finalNamaTindakan, totalKomisi, notes || doi.notes || '', id]);

    res.json({ message: 'Pengerjaan tindakan berhasil dikonfirmasi selesai!', komisi: totalKomisi });
  } catch (err) {
    res.status(500).json({ message: 'Error completing doingan', error: err.message });
  }
});

// GET /api/doingan/recap -> Filtered recap for Admin Dashboard & Commission export
app.get('/api/doingan/recap', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, petugas_id, kategori_layanan, status_pengerjaan } = req.query;

    let query = `
      SELECT d.*, p.nama_lengkap as pasien_nama, p.no_hp as pasien_hp, p.tipe_pasien, u.full_name as petugas_nama, u.lini_profesi
      FROM doingan d
      JOIN pasien p ON d.pasien_id = p.id
      JOIN users u ON d.petugas_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += " AND d.created_at >= ?";
      params.push(`${start_date} 00:00:00`);
    }
    if (end_date) {
      query += " AND d.created_at <= ?";
      params.push(`${end_date} 23:59:59`);
    }
    if (petugas_id) {
      query += " AND d.petugas_id = ?";
      params.push(petugas_id);
    }
    if (kategori_layanan) {
      query += " AND d.kategori_layanan = ?";
      params.push(kategori_layanan);
    }
    if (status_pengerjaan) {
      query += " AND d.status_pengerjaan = ?";
      params.push(status_pengerjaan);
    }

    query += " ORDER BY d.created_at DESC";

    const list = await allQuery(query, params);

    const totalCount = list.length;
    const completedCount = list.filter(item => item.status_pengerjaan === 'COMPLETED').length;
    const totalKomisi = list.reduce((sum, item) => sum + (item.komisi || 0), 0);

    res.json({
      summary: {
        total_count: totalCount,
        completed_count: completedCount,
        total_komisi: totalKomisi
      },
      data: list
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching doingan recap', error: err.message });
  }
});

// GET /api/doingan/unbilled -> Returns completed treatment sessions waiting for POS billing
app.get('/api/doingan/unbilled', authenticateToken, async (req, res) => {
  try {
    const list = await allQuery(`
      SELECT d.*, p.nama_lengkap as pasien_nama, p.no_hp as pasien_hp, p.tipe_pasien, u.full_name as petugas_nama, u.role as petugas_role, u.lini_profesi
      FROM doingan d
      JOIN pasien p ON d.pasien_id = p.id
      JOIN users u ON d.petugas_id = u.id
      WHERE d.status_pengerjaan = 'COMPLETED' AND (d.is_billed IS NULL OR d.is_billed = 0)
      ORDER BY d.completed_at DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching unbilled doingan sessions', error: err.message });
  }
});

app.post('/api/doingan', authenticateToken, async (req, res) => {
  try {
    const { pasien_id, tindakan_id, nama_tindakan, status_doingan, nominal_dp, nominal_membership, notes } = req.body;
    
    if (!pasien_id) return res.status(400).json({ message: 'Pasien wajib dipilih' });

    const role = req.user.role;
    let komisi = 0;
    let finalNamaTindakan = nama_tindakan || 'Tindakan Klinik';

    let nurseNominal = 15000;
    if (tindakan_id) {
      const tm = await getQuery('SELECT nama_tindakan, nominal_nurse_tindakan FROM tindakan_medis WHERE id = ?', [tindakan_id]);
      if (tm) {
        finalNamaTindakan = tm.nama_tindakan;
        nurseNominal = tm.nominal_nurse_tindakan || 15000;
      }
    }

    if (role === 'Beautician' || status_doingan === 'Mbr' || status_doingan === 'Member') {
      if (status_doingan === 'Mbr' || status_doingan === 'Member') {
        komisi = 17000;
      } else if (status_doingan === 'Trial') {
        komisi = 13000;
      }
    }

    if (role === 'Marketing' || status_doingan === 'Membership' || status_doingan === 'DP Membership') {
      if (status_doingan === 'Trial') {
        komisi = 10000;
      } else if (status_doingan === 'Membership' || status_doingan === 'DP Membership') {
        const baseAmount = Number(nominal_membership) || Number(nominal_dp) || 0;
        komisi = Math.max(50000, Math.round(baseAmount * 0.05));
      }
    }

    if (komisi === 0) {
      komisi = nurseNominal;
    }

    const id = 'doi-' + Date.now();
    await runQuery(`
      INSERT INTO doingan (id, pasien_id, petugas_id, role_petugas, tindakan_id, nama_tindakan, status_doingan, nominal_dp, nominal_membership, komisi, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, pasien_id, req.user.id, role, tindakan_id || null, finalNamaTindakan, status_doingan || 'Regular', nominal_dp || 0, nominal_membership || 0, komisi, notes || '']);

    res.status(201).json({ message: 'Catatan doingan berhasil disimpan', komisi });
  } catch (err) {
    res.status(500).json({ message: 'Error creating doingan', error: err.message });
  }
});

app.delete('/api/doingan/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM doingan WHERE id = ?', [id]);
    res.json({ message: 'Catatan doingan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting doingan', error: err.message });
  }
});

// --- CLINIC PROFILE ROUTES (INCLUDES WA API URL POINTING) ---
app.get('/api/clinic-profile', async (req, res) => {
  try {
    const profile = await getQuery('SELECT * FROM clinic_profile WHERE id = 1');
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching clinic profile', error: err.message });
  }
});

app.put('/api/clinic-profile', authenticateToken, async (req, res) => {
  try {
    const { clinic_name, tagline, address, map_latitude, map_longitude, phone, whatsapp, email, logo_url, tax_rate_percent, wa_api_url, idle_timeout_minutes } = req.body;
    
    await runQuery(`
      UPDATE clinic_profile
      SET clinic_name = ?, tagline = ?, address = ?, map_latitude = ?, map_longitude = ?,
          phone = ?, whatsapp = ?, email = ?, logo_url = ?, tax_rate_percent = ?, wa_api_url = ?,
          idle_timeout_minutes = ?
      WHERE id = 1
    `, [clinic_name, tagline, address, map_latitude, map_longitude, phone, whatsapp, email, logo_url, tax_rate_percent, wa_api_url, idle_timeout_minutes || 15]);

    const updated = await getQuery('SELECT * FROM clinic_profile WHERE id = 1');
    res.json({ message: 'Profil klinik & Pengaturan Sesi berhasil diperbarui', profile: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating clinic profile', error: err.message });
  }
});


// --- DYNAMIC ACL ROUTES ---
app.get('/api/acl', authenticateToken, async (req, res) => {
  try {
    const aclList = await allQuery('SELECT * FROM role_permissions');
    res.json(aclList);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching ACL', error: err.message });
  }
});

app.put('/api/acl', authenticateToken, async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) return res.status(400).json({ message: 'Data permissions tidak valid' });

    for (const item of permissions) {
      await runQuery(`
        INSERT INTO role_permissions (role, module_key, can_create, can_read, can_update, can_delete)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(role, module_key) DO UPDATE SET
          can_create = excluded.can_create,
          can_read = excluded.can_read,
          can_update = excluded.can_update,
          can_delete = excluded.can_delete
      `, [item.role, item.module_key, item.can_create, item.can_read, item.can_update, item.can_delete]);
    }

    res.json({ message: 'Dynamic ACL matriks berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating ACL', error: err.message });
  }
});

// --- PATIENT MANAGEMENT & INTAKE ROUTES ---
app.get('/api/pasien', authenticateToken, async (req, res) => {
  try {
    const pasienList = await allQuery('SELECT * FROM pasien ORDER BY created_at DESC');
    res.json(pasienList);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching patients', error: err.message });
  }
});

app.post('/api/pasien', authenticateToken, async (req, res) => {
  try {
    const { no_ktp, no_hp, nama_lengkap, tipe_pasien, alamat, tgl_lahir, riwayat_alergi, jenis_kulit, rekomendasi_dokter } = req.body;

    if (!no_hp || !nama_lengkap || !tipe_pasien) {
      return res.status(400).json({ message: 'Nama Lengkap, No. HP, dan Tipe Pasien wajib diisi' });
    }

    const normalizedTipe = (tipe_pasien === 'NON-TRIAL' || tipe_pasien === 'Reguler' || tipe_pasien === 'Member' || tipe_pasien === 'MEMBER') ? 'MEMBER' : tipe_pasien;

    if (no_ktp) {
      const existingKtp = await getQuery('SELECT id FROM pasien WHERE no_ktp = ?', [no_ktp]);
      if (existingKtp) {
        return res.status(400).json({ message: 'data sudah terdaftar (No. KTP sudah digunakan)' });
      }
    }

    const existingHp = await getQuery('SELECT id FROM pasien WHERE no_hp = ?', [no_hp]);
    if (existingHp) {
      return res.status(400).json({ message: 'data sudah terdaftar (No. Handphone sudah digunakan)' });
    }

    const id = 'pasien-' + Date.now();
    await runQuery(`
      INSERT INTO pasien (id, no_ktp, no_hp, nama_lengkap, tipe_pasien, alamat, tgl_lahir, riwayat_alergi, jenis_kulit, rekomendasi_dokter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, no_ktp || null, no_hp, nama_lengkap, normalizedTipe, alamat || null, tgl_lahir || null, riwayat_alergi || null, jenis_kulit || null, rekomendasi_dokter || null]);

    const newPatient = await getQuery('SELECT * FROM pasien WHERE id = ?', [id]);
    res.status(201).json({ message: 'Pasien berhasil didaftarkan', pasien: newPatient });
  } catch (err) {
    res.status(500).json({ message: 'Error registering patient', error: err.message });
  }
});

app.put('/api/pasien/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { no_ktp, no_hp, nama_lengkap, tipe_pasien, alamat, tgl_lahir, riwayat_alergi, jenis_kulit, rekomendasi_dokter } = req.body;

    const canEdit = (req.user.role === 'Super Admin' || req.user.role === 'Admin System' || req.user.role === 'Admin Klinik');
    if (!canEdit) {
      const perm = await getQuery('SELECT can_update FROM role_permissions WHERE role = ? AND module_key = "patient_management"', [req.user.role]);
      if (!perm || !perm.can_update) {
        return res.status(403).json({ message: 'Hanya Super Admin dan Admin Klinik yang diizinkan mengedit data pasien' });
      }
    }

    const normalizedTipe = (tipe_pasien === 'NON-TRIAL' || tipe_pasien === 'Reguler' || tipe_pasien === 'Member' || tipe_pasien === 'MEMBER') ? 'MEMBER' : tipe_pasien;

    if (no_ktp) {
      const existingKtp = await getQuery('SELECT id FROM pasien WHERE no_ktp = ? AND id != ?', [no_ktp, id]);
      if (existingKtp) return res.status(400).json({ message: 'data sudah terdaftar (No. KTP sudah digunakan oleh pasien lain)' });
    }
    if (no_hp) {
      const existingHp = await getQuery('SELECT id FROM pasien WHERE no_hp = ? AND id != ?', [no_hp, id]);
      if (existingHp) return res.status(400).json({ message: 'data sudah terdaftar (No. HP sudah digunakan oleh pasien lain)' });
    }

    await runQuery(`
      UPDATE pasien
      SET no_ktp = ?, no_hp = ?, nama_lengkap = ?, tipe_pasien = ?, alamat = ?, tgl_lahir = ?, riwayat_alergi = ?, jenis_kulit = ?, rekomendasi_dokter = ?
      WHERE id = ?
    `, [no_ktp || null, no_hp, nama_lengkap, normalizedTipe, alamat || null, tgl_lahir || null, riwayat_alergi || null, jenis_kulit || null, rekomendasi_dokter || null, id]);

    const updated = await getQuery('SELECT * FROM pasien WHERE id = ?', [id]);
    res.json({ message: 'Data pasien berhasil diperbarui', pasien: updated });
  } catch (err) {
    res.status(500).json({ message: 'Error updating patient', error: err.message });
  }
});

app.delete('/api/pasien/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const canDelete = (req.user.role === 'Super Admin' || req.user.role === 'Admin System' || req.user.role === 'Admin Klinik');
    if (!canDelete) {
      const perm = await getQuery('SELECT can_delete FROM role_permissions WHERE role = ? AND module_key = "patient_management"', [req.user.role]);
      if (!perm || !perm.can_delete) {
        return res.status(403).json({ message: 'Hanya Super Admin dan Admin Klinik yang diizinkan menghapus data pasien' });
      }
    }

    // Clean up foreign key references
    await runQuery('DELETE FROM pasien_reminder WHERE pasien_id = ?', [id]);
    
    const pkgs = await allQuery('SELECT id FROM pasien_paket WHERE pasien_id = ?', [id]);
    for (const pkg of pkgs) {
      await runQuery('DELETE FROM pasien_paket_usage WHERE pasien_paket_id = ?', [pkg.id]);
    }
    await runQuery('DELETE FROM pasien_paket WHERE pasien_id = ?', [id]);
    await runQuery('DELETE FROM doingan WHERE pasien_id = ?', [id]);

    const trxs = await allQuery('SELECT id FROM transaksi WHERE pasien_id = ?', [id]);
    for (const trx of trxs) {
      await runQuery('DELETE FROM transaksi_detail WHERE transaksi_id = ?', [trx.id]);
    }
    await runQuery('DELETE FROM transaksi WHERE pasien_id = ?', [id]);

    await runQuery('DELETE FROM pasien WHERE id = ?', [id]);

    res.json({ message: 'Data pasien berhasil dihapus secara permanen' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting patient', error: err.message });
  }
});

// --- PATIENT PACKAGES & REMINDERS ---
app.get('/api/pasien/:id/paket', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const paketList = await allQuery('SELECT * FROM pasien_paket WHERE pasien_id = ?', [id]);
    res.json(paketList);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching patient packages', error: err.message });
  }
});

app.post('/api/pasien/:id/paket', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_paket, total_kuota, harga_paket } = req.body;

    const paketId = 'pkg-' + Date.now();
    await runQuery(`
      INSERT INTO pasien_paket (id, pasien_id, nama_paket, sisa_kuota, total_kuota, harga_paket)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [paketId, id, nama_paket, total_kuota, total_kuota, harga_paket || 0]);

    res.status(201).json({ message: 'Paket treatment berhasil ditambahkan ke pasien' });
  } catch (err) {
    res.status(500).json({ message: 'Error adding package', error: err.message });
  }
});

app.post('/api/pasien/paket/:paketId/use', authenticateToken, async (req, res) => {
  try {
    const { paketId } = req.params;
    const { notes } = req.body;

    const pkg = await getQuery('SELECT * FROM pasien_paket WHERE id = ?', [paketId]);
    if (!pkg) return res.status(404).json({ message: 'Paket tidak ditemukan' });
    if (pkg.sisa_kuota <= 0) return res.status(400).json({ message: 'Kuota paket sudah habis' });

    await runQuery('UPDATE pasien_paket SET sisa_kuota = sisa_kuota - 1 WHERE id = ?', [paketId]);
    
    const usageId = 'usg-' + Date.now();
    await runQuery('INSERT INTO pasien_paket_usage (id, pasien_paket_id, used_by_user_id, notes) VALUES (?, ?, ?, ?)', [usageId, paketId, req.user.id, notes || 'Penggunaan paket treatment']);

    res.json({ message: 'Penggunaan paket berhasil dicatat. Sisa kuota: ' + (pkg.sisa_kuota - 1) });
  } catch (err) {
    res.status(500).json({ message: 'Error using package', error: err.message });
  }
});

app.get('/api/reminders', authenticateToken, async (req, res) => {
  try {
    const reminders = await allQuery(`
      SELECT pr.*, p.nama_lengkap as pasien_nama, p.no_hp as pasien_hp, p.tipe_pasien
      FROM pasien_reminder pr
      JOIN pasien p ON pr.pasien_id = p.id
      ORDER BY pr.tgl_kembali ASC
    `);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reminders', error: err.message });
  }
});

app.post('/api/reminders', authenticateToken, async (req, res) => {
  try {
    const { pasien_id, tgl_kembali, message_text } = req.body;
    if (!pasien_id || !tgl_kembali) return res.status(400).json({ message: 'Pasien dan tanggal kembali wajib diisi' });

    const pasien = await getQuery('SELECT * FROM pasien WHERE id = ?', [pasien_id]);
    if (!pasien) return res.status(404).json({ message: 'Pasien tidak ditemukan' });

    const clinic = await getQuery('SELECT clinic_name, tagline FROM clinic_profile WHERE id = 1');

    const msg = message_text || `Halo Kak ${pasien.nama_lengkap}, kami dari ${clinic.clinic_name} ${clinic.tagline}. Menandai kalender Anda, besok tanggal ${tgl_kembali} ada jadwal perawatan kembali untuk Anda. Konfirmasi kedatangan dengan membalas pesan ini ya Kak. Sampai jumpa!`;

    const remId = 'rem-' + Date.now();
    await runQuery(`
      INSERT INTO pasien_reminder (id, pasien_id, tgl_kembali, status, message_text)
      VALUES (?, ?, ?, 'PENDING', ?)
    `, [remId, pasien_id, tgl_kembali, msg]);

    res.status(201).json({ message: 'Reminder jadwal kembali berhasil dibuat' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating reminder', error: err.message });
  }
});

// DELETE REMINDER ANTREAN
app.delete('/api/reminders/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await runQuery('DELETE FROM pasien_reminder WHERE id = ?', [id]);
    res.json({ message: 'Reminder jadwal kontrol berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting reminder', error: err.message });
  }
});

// --- INVENTORY & LOW STOCK NOTIFICATION ROUTE (< 3) ---
app.get('/api/stok/low-stock', async (req, res) => {
  try {
    const lowStockItems = await allQuery('SELECT * FROM stok_produk WHERE sisa_stok < 3 ORDER BY sisa_stok ASC');
    res.json(lowStockItems);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching low stock notifications', error: err.message });
  }
});


app.get('/api/stok', authenticateToken, async (req, res) => {
  try {
    const stokList = await allQuery('SELECT * FROM stok_produk ORDER BY nama_produk ASC');
    res.json(stokList);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching inventory', error: err.message });
  }
});

app.post('/api/stok', authenticateToken, async (req, res) => {
  try {
    const { nama_produk, kode_sku, tipe_stok, harga_jual, sisa_stok, minimum_stok, satuan } = req.body;
    if (!nama_produk || !tipe_stok) return res.status(400).json({ message: 'Nama produk dan tipe stok wajib diisi' });

    const id = 'prod-' + Date.now();
    await runQuery(`
      INSERT INTO stok_produk (id, nama_produk, kode_sku, tipe_stok, harga_jual, sisa_stok, minimum_stok, satuan, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, nama_produk, kode_sku || ('SKU-' + Date.now()), tipe_stok, harga_jual || 0, sisa_stok || 0, minimum_stok || 10, satuan || 'pcs', req.user.id]);

    res.status(201).json({ message: 'Produk berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ message: 'Error creating product', error: err.message });
  }
});

app.put('/api/stok/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_produk, kode_sku, tipe_stok, harga_jual, sisa_stok, minimum_stok, satuan, notes } = req.body;

    const existing = await getQuery('SELECT * FROM stok_produk WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ message: 'Produk tidak ditemukan' });

    const isDirectUpdateRole = (req.user.role === 'Super Admin' || req.user.role === 'Admin System' || req.user.role === 'Admin Klinik');

    if (isDirectUpdateRole) {
      await runQuery(`
        UPDATE stok_produk
        SET nama_produk = ?, kode_sku = ?, tipe_stok = ?, harga_jual = ?, sisa_stok = ?, minimum_stok = ?, satuan = ?, updated_by = ?
        WHERE id = ?
      `, [
        nama_produk || existing.nama_produk,
        kode_sku || existing.kode_sku,
        tipe_stok || existing.tipe_stok,
        harga_jual !== undefined ? Number(harga_jual) : existing.harga_jual,
        sisa_stok !== undefined ? Number(sisa_stok) : existing.sisa_stok,
        minimum_stok !== undefined ? Number(minimum_stok) : existing.minimum_stok,
        satuan || existing.satuan,
        req.user.id,
        id
      ]);

      return res.json({ message: 'Data & stok produk berhasil diperbarui secara langsung', autoApproved: true });
    } else {
      // Admin FO or other non-superadmin user requires approval
      const reqId = 'req-' + Date.now();
      await runQuery(`
        INSERT INTO produk_approval_requests (
          id, produk_id, old_nama_produk, new_nama_produk, old_harga_jual, new_harga_jual, old_sisa_stok, new_sisa_stok, requester_user_id, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `, [
        reqId, id,
        existing.nama_produk, nama_produk || existing.nama_produk,
        existing.harga_jual, harga_jual !== undefined ? Number(harga_jual) : existing.harga_jual,
        existing.sisa_stok, sisa_stok !== undefined ? Number(sisa_stok) : existing.sisa_stok,
        req.user.id, notes || 'Pengajuan perubahan nama/harga/stok oleh Admin FO'
      ]);

      return res.json({ message: 'Pengajuan perubahan produk & stok berhasil dikirim. Menunggu approval Super Admin / Admin Klinik', autoApproved: false, pending: true });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error updating product', error: err.message });
  }
});

// --- PRODUCT DETAILS & STOCK APPROVAL ROUTES ---
app.get('/api/stok/product-approvals', authenticateToken, async (req, res) => {
  try {
    const list = await allQuery(`
      SELECT par.*, sp.kode_sku, sp.satuan, u1.full_name as requester_name, u2.full_name as approver_name
      FROM produk_approval_requests par
      JOIN stok_produk sp ON par.produk_id = sp.id
      LEFT JOIN users u1 ON par.requester_user_id = u1.id
      LEFT JOIN users u2 ON par.approver_user_id = u2.id
      ORDER BY par.created_at DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching product approval requests', error: err.message });
  }
});

app.put('/api/stok/product-approvals/:id/review', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    const reqItem = await getQuery('SELECT * FROM produk_approval_requests WHERE id = ?', [id]);
    if (!reqItem) return res.status(404).json({ message: 'Pengajuan approval tidak ditemukan' });

    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin System' && req.user.role !== 'Admin Klinik') {
      return res.status(403).json({ message: 'Hanya Super Admin atau Admin Klinik yang berhak menyetujui/menolak pengajuan ini' });
    }

    await runQuery(`
      UPDATE produk_approval_requests
      SET status = ?, approver_user_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, req.user.id, id]);

    if (status === 'APPROVED') {
      await runQuery(`
        UPDATE stok_produk
        SET nama_produk = ?, harga_jual = ?, sisa_stok = ?, updated_by = ?
        WHERE id = ?
      `, [reqItem.new_nama_produk, reqItem.new_harga_jual, reqItem.new_sisa_stok, req.user.id, reqItem.produk_id]);
    }

    res.json({ message: `Pengajuan perubahan produk berhasil di-${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ message: 'Error reviewing product approval', error: err.message });
  }
});

app.get('/api/stok/mutasi', authenticateToken, async (req, res) => {
  try {
    const mutasi = await allQuery(`
      SELECT sm.*, sp.nama_produk, sp.satuan, u1.full_name as requester_name, u2.full_name as approver_name
      FROM stok_mutasi sm
      JOIN stok_produk sp ON sm.produk_id = sp.id
      LEFT JOIN users u1 ON sm.requester_user_id = u1.id
      LEFT JOIN users u2 ON sm.approver_user_id = u2.id
      ORDER BY sm.created_at DESC
    `);
    res.json(mutasi);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stock mutations', error: err.message });
  }
});

app.post('/api/stok/mutasi', authenticateToken, async (req, res) => {
  try {
    const { produk_id, tipe, jumlah, notes } = req.body;
    if (!produk_id || !tipe || !jumlah) return res.status(400).json({ message: 'Produk, tipe mutasi, dan jumlah wajib diisi' });

    const mutId = 'mut-' + Date.now();
    const autoApprove = (req.user.role === 'Super Admin' || req.user.role === 'Assistant Manager (ASM)' || req.user.role === 'Admin System' || req.user.role === 'Admin Klinik');
    const status = autoApprove ? 'APPROVED' : 'PENDING';

    await runQuery(`
      INSERT INTO stok_mutasi (id, produk_id, tipe, jumlah, requester_user_id, approver_user_id, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [mutId, produk_id, tipe, jumlah, req.user.id, autoApprove ? req.user.id : null, status, notes || '']);

    if (autoApprove) {
      if (tipe === 'IN') {
        await runQuery('UPDATE stok_produk SET sisa_stok = sisa_stok + ? WHERE id = ?', [jumlah, produk_id]);
      } else if (tipe === 'OUT' || tipe === 'USAGE') {
        await runQuery('UPDATE stok_produk SET sisa_stok = sisa_stok - ? WHERE id = ?', [jumlah, produk_id]);
      }
    }

    res.status(201).json({ message: autoApprove ? 'Mutasi stok berhasil dan diperbarui' : 'Pengajuan mutasi stok berhasil dikirim' });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting stock mutation', error: err.message });
  }
});

app.put('/api/stok/mutasi/:id/approval', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin System' && req.user.role !== 'Admin Klinik' && req.user.role !== 'Assistant Manager (ASM)') {
      return res.status(403).json({ message: 'Hanya Super Admin, Admin Klinik, atau ASM yang berhak menyetujui mutasi stok' });
    }

    const mutasi = await getQuery('SELECT * FROM stok_mutasi WHERE id = ?', [id]);
    if (!mutasi) return res.status(404).json({ message: 'Mutasi tidak ditemukan' });

    await runQuery('UPDATE stok_mutasi SET status = ?, approver_user_id = ? WHERE id = ?', [status, req.user.id, id]);

    if (status === 'APPROVED') {
      if (mutasi.tipe === 'IN') {
        await runQuery('UPDATE stok_produk SET sisa_stok = sisa_stok + ? WHERE id = ?', [mutasi.jumlah, mutasi.produk_id]);
      } else if (mutasi.tipe === 'OUT' || mutasi.tipe === 'REQUEST' || mutasi.tipe === 'USAGE') {
        await runQuery('UPDATE stok_produk SET sisa_stok = sisa_stok - ? WHERE id = ?', [mutasi.jumlah, mutasi.produk_id]);
      }
    }

    res.json({ message: `Mutasi stok berhasil di-${status.toLowerCase()}` });
  } catch (err) {
    res.status(500).json({ message: 'Error approving mutation', error: err.message });
  }
});

// --- PRICING & MEDICAL SERVICES CATALOG ---
app.get('/api/tindakan', authenticateToken, async (req, res) => {
  try {
    const list = await allQuery('SELECT * FROM tindakan_medis ORDER BY nama_tindakan ASC');
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching treatments', error: err.message });
  }
});

app.post('/api/tindakan', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin System' && req.user.role !== 'Admin Klinik') {
      return res.status(403).json({ message: 'Akses ditolak: Hanya Super Admin & Admin Klinik yang dapat menambah jenis tindakan' });
    }

    const { nama_tindakan, tarif_konsul_dokter, tarif_tindakan_medis, komisi_fix_therapist, percent_btc_bonus, percent_jasa_medis_dokter, nominal_nurse_tindakan } = req.body;
    if (!nama_tindakan || nama_tindakan.trim() === '') {
      return res.status(400).json({ message: 'Nama jenis tindakan wajib diisi' });
    }
    
    const id = 'tnd-' + Date.now();
    await runQuery(`
      INSERT INTO tindakan_medis (id, nama_tindakan, tarif_konsul_dokter, tarif_tindakan_medis, komisi_fix_therapist, percent_btc_bonus, percent_jasa_medis_dokter, nominal_nurse_tindakan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, nama_tindakan.trim(), parseFloat(tarif_konsul_dokter || 0), parseFloat(tarif_tindakan_medis || 0), parseFloat(komisi_fix_therapist || 0), parseFloat(percent_btc_bonus || 0), parseFloat(percent_jasa_medis_dokter || 0), parseFloat(nominal_nurse_tindakan || 0)]);

    res.status(201).json({ message: 'Jenis tindakan medis berhasil ditambahkan' });
  } catch (err) {
    res.status(500).json({ message: 'Error adding treatment', error: err.message });
  }
});

app.put('/api/tindakan/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin System' && req.user.role !== 'Admin Klinik') {
      return res.status(403).json({ message: 'Akses ditolak: Hanya Super Admin & Admin Klinik yang dapat mengedit jenis tindakan' });
    }

    const { id } = req.params;
    const { nama_tindakan, tarif_konsul_dokter, tarif_tindakan_medis, komisi_fix_therapist, percent_btc_bonus, percent_jasa_medis_dokter, nominal_nurse_tindakan } = req.body;

    await runQuery(`
      UPDATE tindakan_medis
      SET nama_tindakan = ?, tarif_konsul_dokter = ?, tarif_tindakan_medis = ?, komisi_fix_therapist = ?, percent_btc_bonus = ?, percent_jasa_medis_dokter = ?, nominal_nurse_tindakan = ?
      WHERE id = ?
    `, [nama_tindakan.trim(), parseFloat(tarif_konsul_dokter || 0), parseFloat(tarif_tindakan_medis || 0), parseFloat(komisi_fix_therapist || 0), parseFloat(percent_btc_bonus || 0), parseFloat(percent_jasa_medis_dokter || 0), parseFloat(nominal_nurse_tindakan || 0), id]);

    res.json({ message: 'Jenis tindakan medis berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating treatment', error: err.message });
  }
});

app.delete('/api/tindakan/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin System' && req.user.role !== 'Admin Klinik') {
      return res.status(403).json({ message: 'Akses ditolak: Hanya Super Admin & Admin Klinik yang dapat menghapus jenis tindakan' });
    }

    const { id } = req.params;
    await runQuery('DELETE FROM tindakan_medis WHERE id = ?', [id]);
    res.json({ message: 'Jenis tindakan medis berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting treatment', error: err.message });
  }
});

// --- POS & BILLING TRANSACTIONS ---
app.post('/api/transaksi', authenticateToken, async (req, res) => {
  try {
    const { pasien_id, items, discount_amount, payment_amount, therapist_id, doctor_id, nurse_id, marketing_id } = req.body;

    if (!pasien_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Pasien dan item belanja wajib diisi' });
    }

    const pasien = await getQuery('SELECT * FROM pasien WHERE id = ?', [pasien_id]);
    if (!pasien) return res.status(404).json({ message: 'Pasien tidak ditemukan' });

    const profile = await getQuery('SELECT tax_rate_percent FROM clinic_profile WHERE id = 1');
    const taxRate = (profile && profile.tax_rate_percent) ? profile.tax_rate_percent / 100 : 0.11;

    let subtotal = 0;
    items.forEach(item => {
      subtotal += (item.harga_satuan * item.jumlah);
    });

    const discount = Number(discount_amount) || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = Math.round(taxableAmount * taxRate);
    const grandTotal = taxableAmount + taxAmount;
    const payment = Number(payment_amount) || grandTotal;
    const changeAmount = Math.max(0, payment - grandTotal);

    const earnedPoints = Math.floor(grandTotal / 50000);

    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const noNota = `INV/${dateStr}/${randNum}`;

    const trxId = 'trx-' + Date.now();

    await runQuery(`
      INSERT INTO transaksi (id, no_nota, pasien_id, kasir_id, subtotal, discount, tax_amount, grand_total, payment_amount, change_amount, earned_points, therapist_id, doctor_id, nurse_id, marketing_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [trxId, noNota, pasien_id, req.user.id, subtotal, discount, taxAmount, grandTotal, payment, changeAmount, earnedPoints, therapist_id || null, doctor_id || null, nurse_id || null, marketing_id || null]);

    for (const item of items) {
      const detailId = 'dtl-' + Math.random().toString(36).substring(2, 9);
      await runQuery(`
        INSERT INTO transaksi_detail (id, transaksi_id, produk_id, tindakan_id, jenis_item, nama_item, jumlah, harga_satuan, subtotal_item, therapist_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [detailId, trxId, item.produk_id || null, item.tindakan_id || null, item.jenis_item, item.nama_item, item.jumlah, item.harga_satuan, item.harga_satuan * item.jumlah, item.therapist_id || therapist_id || null]);

      if (item.jenis_item === 'RETAIL' && item.produk_id) {
        await runQuery('UPDATE stok_produk SET sisa_stok = sisa_stok - ? WHERE id = ?', [item.jumlah, item.produk_id]);
      }
    }

    await runQuery('UPDATE pasien SET total_poin = total_poin + ? WHERE id = ?', [earnedPoints, pasien_id]);
    
    // Mark associated completed doingan as billed
    const { doingan_id } = req.body;
    if (doingan_id) {
      await runQuery('UPDATE doingan SET is_billed = 1 WHERE id = ?', [doingan_id]);
    } else {
      await runQuery('UPDATE doingan SET is_billed = 1 WHERE pasien_id = ? AND status_pengerjaan = "COMPLETED" AND (is_billed IS NULL OR is_billed = 0)', [pasien_id]);
    }

    res.status(201).json({
      message: 'Transaksi berhasil disimpan',
      transaksi_id: trxId,
      no_nota: noNota,
      grand_total: grandTotal,
      earned_points: earnedPoints
    });
  } catch (err) {
    res.status(500).json({ message: 'Error processing transaction', error: err.message });
  }
});

app.get('/api/transaksi/:id/receipt', async (req, res) => {
  try {
    const { id } = req.params;
    const trx = await getQuery(`
      SELECT t.*, p.nama_lengkap as pasien_nama, p.tipe_pasien, p.total_poin, u.full_name as kasir_nama,
             therapist.full_name as therapist_nama, doctor.full_name as doctor_nama
      FROM transaksi t
      JOIN pasien p ON t.pasien_id = p.id
      JOIN users u ON t.kasir_id = u.id
      LEFT JOIN users therapist ON t.therapist_id = therapist.id
      LEFT JOIN users doctor ON t.doctor_id = doctor.id
      WHERE t.id = ?
    `, [id]);

    if (!trx) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });

    const details = await allQuery('SELECT * FROM transaksi_detail WHERE transaksi_id = ?', [id]);
    const clinic = await getQuery('SELECT * FROM clinic_profile WHERE id = 1');

    const nextReminder = await getQuery('SELECT tgl_kembali FROM pasien_reminder WHERE pasien_id = ? ORDER BY tgl_kembali ASC LIMIT 1', [trx.pasien_id]);

    res.json({
      clinic,
      transaction: trx,
      details,
      next_control_date: nextReminder ? nextReminder.tgl_kembali : '-'
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching receipt', error: err.message });
  }
});

// --- PAYROLL & 5-LINE COMMISSION MATRIX ROUTE ---
app.get('/api/payroll/summary', authenticateToken, async (req, res) => {
  try {
    const { bulan, tahun } = req.query;
    const currentMonth = bulan ? parseInt(bulan) : new Date().getMonth() + 1;
    const currentYear = tahun ? parseInt(tahun) : new Date().getFullYear();

    const users = await allQuery('SELECT id, username, full_name, role FROM users');

    const monthStart = `${currentYear}-${String(currentMonth).padStart(2,'0')}-01 00:00:00`;
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2,'0')}-31 23:59:59`;

    const trxs = await allQuery(`
      SELECT t.*, p.tipe_pasien
      FROM transaksi t
      JOIN pasien p ON t.pasien_id = p.id
      WHERE t.created_at >= ? AND t.created_at <= ?
    `, [monthStart, monthEnd]);

    const trxDetails = await allQuery(`
      SELECT td.*, tm.tarif_konsul_dokter, tm.tarif_tindakan_medis, tm.komisi_fix_therapist, tm.percent_btc_bonus, tm.percent_jasa_medis_dokter, tm.nominal_nurse_tindakan
      FROM transaksi_detail td
      LEFT JOIN tindakan_medis tm ON td.tindakan_id = tm.id
      JOIN transaksi t ON td.transaksi_id = t.id
      WHERE t.created_at >= ? AND t.created_at <= ?
    `, [monthStart, monthEnd]);

    const doinganLogs = await allQuery(`
      SELECT * FROM doingan
      WHERE created_at >= ? AND created_at <= ?
    `, [monthStart, monthEnd]);

    const payrollResult = [];
    const payrollUsers = users.filter(u => u.role !== 'Super Admin' && u.role !== 'Admin System' && u.role !== 'Admin Klinik');

    for (const u of payrollUsers) {
      let gajiPokok = (u.gaji_pokok !== undefined && u.gaji_pokok !== null && u.gaji_pokok > 0) ? u.gaji_pokok : 0;
      if (!gajiPokok) {
        if (u.role === 'Dokter') gajiPokok = 10000000;
        else if (u.role === 'Admin FO' || u.role === 'Resepsionis / Cashier') gajiPokok = 4000000;
        else if (u.role === 'Beautician' || u.role === 'Therapist / BTC') gajiPokok = 3500000;
        else if (u.role === 'Nurse') gajiPokok = 3800000;
        else if (u.role === 'Marketing') gajiPokok = 4200000;
      }
      let komisiProduk = 0;
      let komisiTindakan = 0;
      let bonusLain = 0;

      // Calculate Doingan Commissions for Nurse, Beautician, Marketing
      doinganLogs.forEach(d => {
        if (d.petugas_id === u.id) {
          komisiTindakan += (d.komisi || 0);
        }
      });

      if (u.role === 'Therapist / BTC' || u.role === 'Beautician') {
        trxDetails.forEach(d => {
          if (d.therapist_id === u.id) {
            const fixInc = d.komisi_fix_therapist || 17000;
            const pct = (d.percent_btc_bonus || 5) / 100;
            komisiTindakan += (fixInc * d.jumlah) + (d.subtotal_item * pct);
          }
        });
      }

      if (u.role === 'Marketing') {
        trxs.forEach(t => {
          if (t.marketing_id === u.id) {
            komisiTindakan += 50000 + (t.grand_total * 0.03);
          }
        });
      }

      if (u.role === 'Dokter') {
        trxs.forEach(t => {
          if (t.doctor_id === u.id) {
            komisiTindakan += 150000;
          }
        });
        trxDetails.forEach(d => {
          if (d.jenis_item === 'TINDAKAN') {
            const pct = (d.percent_jasa_medis_dokter || 20) / 100;
            komisiTindakan += d.subtotal_item * pct;
          }
        });
      }

      if (u.role === 'Nurse') {
        trxDetails.forEach(d => {
          if (d.jenis_item === 'TINDAKAN' && d.therapist_id === u.id) {
            const nurseFee = d.nominal_nurse_tindakan || 15000;
            komisiTindakan += nurseFee * d.jumlah;
          }
        });
      }

      if (u.role === 'Admin FO' || u.role === 'Resepsionis / Cashier') {
        let totalTurnover = 0;
        trxs.forEach(t => {
          if (t.kasir_id === u.id) totalTurnover += t.grand_total;
        });
        komisiProduk = totalTurnover * 0.015;
      }

      const existing = await getQuery('SELECT * FROM riwayat_gaji WHERE user_id = ? AND bulan = ? AND tahun = ?', [u.id, currentMonth, currentYear]);
      const statusPembayaran = existing ? existing.status_pembayaran : 'PENDING';

      const grandTotal = gajiPokok + komisiProduk + komisiTindakan + bonusLain;

      payrollResult.push({
        user_id: u.id,
        username: u.username,
        full_name: u.full_name,
        role: u.role,
        bulan: currentMonth,
        tahun: currentYear,
        gaji_pokok: gajiPokok,
        total_komisi_produk: Math.round(komisiProduk),
        total_komisi_tindakan: Math.round(komisiTindakan),
        bonus_lain: bonusLain,
        grand_total: Math.round(grandTotal),
        status_pembayaran: statusPembayaran
      });
    }

    res.json({ bulan: currentMonth, tahun: currentYear, payroll: payrollResult });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating payroll', error: err.message });
  }
});

app.post('/api/payroll/pay', authenticateToken, async (req, res) => {
  try {
    const { user_id, bulan, tahun, status } = req.body;
    if (!user_id || !bulan || !tahun) return res.status(400).json({ message: 'User ID, Bulan, dan Tahun wajib diisi' });

    const paidAt = status === 'PAID' ? new Date().toISOString() : null;

    await runQuery(`
      INSERT INTO riwayat_gaji (id, user_id, bulan, tahun, gaji_pokok, total_komisi_produk, total_komisi_tindakan, grand_total, status_pembayaran, paid_at)
      VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
      ON CONFLICT(user_id, bulan, tahun) DO UPDATE SET
        status_pembayaran = excluded.status_pembayaran,
        paid_at = excluded.paid_at
    `, ['gaji-' + Date.now(), user_id, bulan, tahun, status, paidAt]);

    res.json({ message: `Status gaji berhasil diubah menjadi ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Error updating payroll status', error: err.message });
  }
});

// --- WHATSAPP GATEWAY & SCHEDULER ---
async function triggerWaReminders() {
  const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const pendingReminders = await allQuery(`
    SELECT pr.*, p.nama_lengkap, p.no_hp
    FROM pasien_reminder pr
    JOIN pasien p ON pr.pasien_id = p.id
    WHERE pr.tgl_kembali = ? AND pr.status = 'PENDING'
  `, [tomorrowDate]);

  const clinic = await getQuery('SELECT wa_api_url FROM clinic_profile WHERE id = 1');
  const targetWaUrl = (clinic && clinic.wa_api_url) ? clinic.wa_api_url : 'https://api-wa.ipangpangeran.com/send?api_key=ipang-super-secret-key-123456';

  const results = [];

  for (const rem of pendingReminders) {
    try {
      let hp = rem.no_hp.replace(/[^0-9]/g, '');
      if (hp.startsWith('0')) hp = '62' + hp.slice(1);

      const response = await axios.post(targetWaUrl, {
        number: hp,
        message: rem.message_text
      }, { headers: { 'Content-Type': 'application/json' } });

      await runQuery('UPDATE pasien_reminder SET status = "SENT", sent_at = CURRENT_TIMESTAMP WHERE id = ?', [rem.id]);

      await runQuery('INSERT INTO wa_logs (id, recipient_number, message, status, response_data) VALUES (?, ?, ?, ?, ?)', [
        'log-' + Date.now() + '-' + Math.random().toString(36).substr(2,4),
        hp,
        rem.message_text,
        'SUCCESS',
        JSON.stringify(response.data)
      ]);

      results.push({ id: rem.id, hp, status: 'SUCCESS' });
    } catch (err) {
      console.error('WA Send Error:', err.message);
      await runQuery('INSERT INTO wa_logs (id, recipient_number, message, status, response_data) VALUES (?, ?, ?, ?, ?)', [
        'log-' + Date.now() + '-' + Math.random().toString(36).substr(2,4),
        rem.no_hp,
        rem.message_text,
        'FAILED',
        JSON.stringify({ error: err.message })
      ]);
      results.push({ id: rem.id, hp: rem.no_hp, status: 'FAILED', error: err.message });
    }
  }

  return results;
}

app.post('/api/wa/send-reminders', authenticateToken, async (req, res) => {
  try {
    const results = await triggerWaReminders();
    res.json({ message: 'Proses pengiriman pengingat WhatsApp selesai', results });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengirim pesan WA', error: err.message });
  }
});

app.get('/api/wa/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await allQuery('SELECT * FROM wa_logs ORDER BY sent_at DESC LIMIT 50');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching WA logs', error: err.message });
  }
});

// Daily Cron Job at 08:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('[Cron Job] Executing daily WhatsApp reminder dispatch at 08:00 AM...');
  await triggerWaReminders();
});

// SPA Fallback
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`[DEFLOW Backend] Running on http://localhost:${PORT}`);
});
