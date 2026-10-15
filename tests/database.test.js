const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { allQuery, getQuery, runQuery } = require('../server/db');
const migrationRunner = require('../server/migrations');
const backupService = require('../server/backupService');

test('Database Architecture & Migration Tests', async (t) => {
  await t.test('1. Migration runner should create _migrations table and record migrations', async () => {
    assert.strictEqual(typeof migrationRunner.runMigrations, 'function', 'runMigrations must be a function');
    const result = await migrationRunner.runMigrations();
    assert.ok(result.success, 'Migration run should return success');

    const migTable = await getQuery("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'");
    assert.ok(migTable, 'Table _migrations must exist');

    const applied = await allQuery("SELECT * FROM _migrations");
    assert.ok(applied.length > 0, 'At least 1 migration should be recorded');
  });

  await t.test('2. Required indexes should exist in database', async () => {
    const requiredIndexes = [
      'idx_pasien_no_hp',
      'idx_pasien_nama',
      'idx_pasien_marketing',
      'idx_pasien_created',
      'idx_pasien_paket_pasien',
      'idx_doingan_pasien',
      'idx_doingan_petugas',
      'idx_doingan_created',
      'idx_transaksi_pasien',
      'idx_transaksi_created'
    ];

    const existingIndexes = await allQuery("SELECT name FROM sqlite_master WHERE type='index'");
    const indexNames = existingIndexes.map(i => i.name);

    for (const reqIdx of requiredIndexes) {
      assert.ok(indexNames.includes(reqIdx), `Index ${reqIdx} should exist in sqlite_master`);
    }
  });

  await t.test('3. Insert timestamp discipline with GMT+7 timezone triggers', async () => {
    // Insert a temporary test patient without specifying created_at
    const testId = 'test-pasien-' + Date.now();
    await runQuery(`
      INSERT INTO pasien (id, no_hp, nama_lengkap, tipe_pasien)
      VALUES (?, ?, ?, ?)
    `, [testId, '08999999' + Math.floor(Math.random() * 10000), 'Test Patient GMT7', 'MEMBER']);

    const row = await getQuery("SELECT created_at FROM pasien WHERE id = ?", [testId]);
    assert.ok(row && row.created_at, 'created_at must not be null');

    // Expected hour in GMT+7
    const nowUtc = new Date();
    const jakartaTime = new Date(nowUtc.getTime() + (7 * 3600 * 1000));
    const expectedHour = String(jakartaTime.getUTCHours()).padStart(2, '0');
    const rowHour = row.created_at.substring(11, 13);

    assert.strictEqual(rowHour, expectedHour, `Timestamp hour ${rowHour} should match GMT+7 hour ${expectedHour}`);

    // Cleanup
    await runQuery("DELETE FROM pasien WHERE id = ?", [testId]);
  });

  await t.test('4. Backup and restore service operates safely and cleanly', async () => {
    assert.strictEqual(typeof backupService.createBackup, 'function', 'createBackup must be a function');
    assert.strictEqual(typeof backupService.listBackups, 'function', 'listBackups must be a function');
    assert.strictEqual(typeof backupService.verifyBackup, 'function', 'verifyBackup must be a function');

    const backupResult = await backupService.createBackup('test_automated');
    assert.ok(backupResult.success, 'Backup creation should succeed');
    assert.ok(fs.existsSync(backupResult.filePath), 'Backup file must exist on disk');

    const list = await backupService.listBackups();
    assert.ok(Array.isArray(list), 'listBackups should return an array');
    assert.ok(list.length > 0, 'Backup list should not be empty');

    const verify = await backupService.verifyBackup(backupResult.filename);
    assert.ok(verify.valid, 'Backup file integrity check should be valid');

    // Clean up test backup file
    if (fs.existsSync(backupResult.filePath)) {
      fs.unlinkSync(backupResult.filePath);
    }
  });
});
