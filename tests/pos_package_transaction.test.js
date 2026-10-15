const test = require('node:test');
const assert = require('node:assert');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { getQuery, allQuery, runQuery } = require('../server/db');

const JWT_SECRET = 'deflow_secret_jwt_key_2026';
const token = jwt.sign(
  { id: 'usr-1', username: 'superadmin', role: 'Super Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

test('End-to-End Package Purchase via POS API', async (t) => {
  const baseURL = 'http://localhost:5000';
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Create a temporary patient
  const testPasienId = 'pasien-test-pos-' + Date.now();
  await runQuery(`
    INSERT INTO pasien (id, no_hp, nama_lengkap, tipe_pasien)
    VALUES (?, ?, ?, 'MEMBER')
  `, [testPasienId, '0877' + Math.floor(10000000 + Math.random() * 90000000), 'Pasien Test POS']);

  // 2. Add an unbilled package to patient
  const testPkgId = 'pkg-test-' + Date.now();
  await runQuery(`
    INSERT INTO pasien_paket (
      id, pasien_id, nama_paket, sisa_kuota, total_kuota, harga_paket, 
      is_billed, nominal_dp, sisa_tagihan, status_pembayaran
    )
    VALUES (?, ?, 'Paket Glow Up Test', 3, 3, 800000, 0, 800000, 0, 'LUNAS')
  `, [testPkgId, testPasienId]);

  // 3. Post transaction from POS
  const posPayload = {
    pasien_id: testPasienId,
    items: [
      {
        jenis_item: 'PAKET',
        nama_item: 'Paket Glow Up Test',
        jumlah: 1,
        harga_satuan: 800000,
        subtotal_item: 800000,
        paket_id: testPkgId,
        full_harga_paket: 800000,
        is_dp: false
      }
    ],
    discount_amount: 0,
    payment_amount: 800000,
    poin_used: 0
  };

  const response = await axios.post(`${baseURL}/api/transaksi`, posPayload, { headers });
  assert.strictEqual(response.status, 201, 'Transaction should return 201 Created');
  assert.ok(response.data.transaksi_id, 'Response should contain transaksi_id');

  // 4. Verify in DB
  const savedTrx = await getQuery('SELECT * FROM transaksi WHERE id = ?', [response.data.transaksi_id]);
  assert.ok(savedTrx, 'Transaction record should exist in DB');

  const savedDetail = await getQuery('SELECT * FROM transaksi_detail WHERE transaksi_id = ?', [response.data.transaksi_id]);
  assert.ok(savedDetail, 'Detail record should exist in DB');
  assert.strictEqual(savedDetail.jenis_item, 'PAKET');
  assert.ok(savedDetail.created_at, 'Detail created_at should not be null');

  const updatedPkg = await getQuery('SELECT * FROM pasien_paket WHERE id = ?', [testPkgId]);
  assert.strictEqual(updatedPkg.is_billed, 1, 'Package is_billed should be 1');
  assert.strictEqual(updatedPkg.transaksi_id, response.data.transaksi_id, 'Package transaksi_id should match');

  // 5. Cleanup
  await runQuery('DELETE FROM transaksi_detail WHERE transaksi_id = ?', [response.data.transaksi_id]);
  await runQuery('DELETE FROM transaksi WHERE id = ?', [response.data.transaksi_id]);
  await runQuery('DELETE FROM pasien_paket WHERE id = ?', [testPkgId]);
  await runQuery('DELETE FROM pasien WHERE id = ?', [testPasienId]);
});
