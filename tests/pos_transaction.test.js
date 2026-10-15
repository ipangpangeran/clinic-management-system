const test = require('node:test');
const assert = require('node:assert');
const { runQuery, getQuery, allQuery } = require('../server/db');

test('POS Transaction Test Suite', async (t) => {
  await t.test('Should successfully process transaction with items into transaksi and transaksi_detail', async () => {
    // 1. Get an existing patient
    const pasien = await getQuery('SELECT id FROM pasien LIMIT 1');
    assert.ok(pasien, 'Must have at least 1 patient');

    const trxId = 'test-trx-' + Date.now();
    const detailId = 'test-dtl-' + Date.now();
    const noNota = 'INV/TEST/' + Date.now();

    // Insert transaction header
    await runQuery(`
      INSERT INTO transaksi (
        id, no_nota, pasien_id, kasir_id, subtotal, discount, tax_amount, grand_total, 
        payment_amount, change_amount, earned_points, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `, [trxId, noNota, pasien.id, 'usr-1', 100000, 0, 0, 100000, 100000, 0, 0]);

    // Insert transaction detail as currently written in server.js
    // This should fail if created_at does not exist in schema or if query has mismatched columns
    await runQuery(`
      INSERT INTO transaksi_detail (
        id, transaksi_id, produk_id, tindakan_id, jenis_item, nama_item, 
        jumlah, harga_satuan, subtotal_item, therapist_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 hours'))
    `, [detailId, trxId, null, null, 'PAKET', 'Test Paket', 1, 100000, 100000, null]);

    const savedDetail = await getQuery('SELECT * FROM transaksi_detail WHERE id = ?', [detailId]);
    assert.ok(savedDetail, 'Detail should be saved');

    // Cleanup
    await runQuery('DELETE FROM transaksi_detail WHERE id = ?', [detailId]);
    await runQuery('DELETE FROM transaksi WHERE id = ?', [trxId]);
  });
});
