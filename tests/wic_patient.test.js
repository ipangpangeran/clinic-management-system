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

test('WIC (Walk In Customer) Patient Flow Test Suite', async (t) => {
  const baseURL = 'http://localhost:5000';
  const headers = { Authorization: `Bearer ${token}` };

  // Get a nurse and a marketing user
  const nurse = await getQuery("SELECT id, full_name, role FROM users WHERE role = 'Nurse' OR lini_profesi = 'Nurse' LIMIT 1");
  const marketing = await getQuery("SELECT id, full_name FROM users WHERE role = 'Marketing' LIMIT 1");
  const treatment = await getQuery("SELECT id, nama_tindakan, tarif_tindakan_medis, nominal_nurse_tindakan FROM tindakan_medis LIMIT 1");

  assert.ok(nurse, 'Nurse user must exist');
  assert.ok(marketing, 'Marketing user must exist');
  assert.ok(treatment, 'Medical treatment must exist');

  let testPasienId = null;
  let testDoinganId = null;

  await t.test('1. Should register a new WIC patient with tipe_pasien = WIC', async () => {
    const payload = {
      nama_lengkap: 'Siti WIC Customer',
      no_hp: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      no_ktp: '3201' + Math.floor(100000000000 + Math.random() * 900000000000),
      tipe_pasien: 'WIC',
      marketing_id: marketing.id,
      alamat: 'Jl. Riau No. 123'
    };

    const res = await axios.post(`${baseURL}/api/pasien`, payload, { headers });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.pasien);
    assert.strictEqual(res.data.pasien.tipe_pasien, 'WIC');
    assert.strictEqual(res.data.pasien.initial_tipe_pasien, 'WIC');
    testPasienId = res.data.pasien.id;

    const dbRow = await getQuery('SELECT * FROM pasien WHERE id = ?', [testPasienId]);
    assert.strictEqual(dbRow.tipe_pasien, 'WIC');
  });

  await t.test('2. Should assign WIC patient to Nurse with customized treatment and price', async () => {
    assert.ok(testPasienId, 'Patient must be registered first');
    const customTarif = 350000; // Harga disesuaikan FO (misal tarif normal beda)

    const assignPayload = {
      pasien_id: testPasienId,
      petugas_id: nurse.id,
      kategori_layanan: 'Tindakan Medis (Nurse)',
      tindakan_id: treatment.id,
      nama_tindakan: treatment.nama_tindakan,
      total_tarif: customTarif,
      marketing_id: marketing.id,
      notes: 'Pasien WIC - harga disesuaikan FO'
    };

    const res = await axios.post(`${baseURL}/api/doingan/assign`, assignPayload, { headers });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.doingan_id);
    testDoinganId = res.data.doingan_id;

    // Verify doingan row in DB
    const doiRow = await getQuery('SELECT * FROM doingan WHERE id = ?', [testDoinganId]);
    assert.strictEqual(doiRow.pasien_id, testPasienId);
    assert.strictEqual(doiRow.petugas_id, nurse.id);
    assert.strictEqual(doiRow.tindakan_id, treatment.id);
    assert.strictEqual(doiRow.nama_tindakan, treatment.nama_tindakan);
    assert.strictEqual(doiRow.total_tarif, customTarif);
    assert.ok(doiRow.komisi > 0, 'Nurse commission should be calculated');
  });

  await t.test('3. Nurse completes doingan without selecting treatments and it appears in POS unbilled queue', async () => {
    assert.ok(testDoinganId, 'Doingan must exist');

    // Nurse completes without selecting treatments since FO already selected it at intake
    const completeRes = await axios.post(`${baseURL}/api/doingan/${testDoinganId}/complete`, {
      tindakan_ids: [],
      notes: 'Selesai pengerjaan tindakan WIC tanpa input tindakan manual'
    }, { headers });

    assert.strictEqual(completeRes.status, 200);

    // Check in unbilled queue
    const unbilledRes = await axios.get(`${baseURL}/api/doingan/unbilled`, { headers });
    const found = unbilledRes.data.find(d => d.id === testDoinganId);
    assert.ok(found, 'Completed WIC doingan must appear in POS unbilled list');
    assert.strictEqual(found.total_tarif, 350000, 'Custom price set by FO must be preserved');
    assert.strictEqual(found.nama_tindakan, treatment.nama_tindakan, 'Treatment name set by FO must be preserved');
  });

  // Cleanup
  if (testDoinganId) await runQuery('DELETE FROM doingan WHERE id = ?', [testDoinganId]);
  if (testPasienId) await runQuery('DELETE FROM pasien WHERE id = ?', [testPasienId]);
});
