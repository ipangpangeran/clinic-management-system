const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { runQuery, db } = require('./db');

const DB_FILE = path.resolve(__dirname, 'deflow.db');
const BACKUPS_DIR = path.resolve(__dirname, 'backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getJakartaTimestampStr() {
  const now = new Date();
  const jakartaTime = new Date(now.getTime() + (7 * 3600 * 1000));
  const YYYY = jakartaTime.getUTCFullYear();
  const MM = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(jakartaTime.getUTCDate()).padStart(2, '0');
  const HH = String(jakartaTime.getUTCHours()).padStart(2, '0');
  const mm = String(jakartaTime.getUTCMinutes()).padStart(2, '0');
  const ss = String(jakartaTime.getUTCSeconds()).padStart(2, '0');
  return `${YYYY}${MM}${DD}_${HH}${mm}${ss}`;
}

async function createBackup(label = 'manual') {
  ensureBackupsDir();
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `deflow_backup_${getJakartaTimestampStr()}_${safeLabel}.db`;
  const targetPath = path.join(BACKUPS_DIR, filename);

  // Use forward slashes for SQLite VACUUM INTO compatibility on Windows
  const sqliteSafePath = targetPath.replace(/\\/g, '/');

  try {
    // VACUUM INTO is an atomic, consistent hot-backup snapshot built directly into SQLite
    await runQuery(`VACUUM INTO '${sqliteSafePath}'`);

    const stats = fs.statSync(targetPath);
    console.log(`[BackupService] Successfully created backup: ${filename} (${formatBytes(stats.size)})`);

    return {
      success: true,
      filename,
      filePath: targetPath,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.mtime
    };
  } catch (err) {
    console.error(`[BackupService] Failed to create backup:`, err);
    throw err;
  }
}

async function listBackups() {
  ensureBackupsDir();
  const files = fs.readdirSync(BACKUPS_DIR);
  const backupFiles = files.filter(f => f.endsWith('.db'));

  const results = backupFiles.map(filename => {
    const fullPath = path.join(BACKUPS_DIR, filename);
    const stats = fs.statSync(fullPath);
    return {
      filename,
      path: fullPath,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.mtime
    };
  });

  // Sort descending (newest first)
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return results;
}

async function verifyBackup(filename) {
  const fullPath = path.isAbsolute(filename) ? filename : path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    return { valid: false, message: 'File backup tidak ditemukan' };
  }

  return new Promise((resolve) => {
    const tempDb = new sqlite3.Database(fullPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        return resolve({ valid: false, message: `Gagal membuka file backup: ${err.message}` });
      }

      tempDb.get("PRAGMA integrity_check;", (checkErr, row) => {
        tempDb.close();
        if (checkErr) {
          return resolve({ valid: false, message: `Integrity check gagal: ${checkErr.message}` });
        }
        if (row && row.integrity_check === 'ok') {
          return resolve({ valid: true, message: 'Integrity check OK' });
        }
        return resolve({ valid: false, message: `Corrupt backup: ${JSON.stringify(row)}` });
      });
    });
  });
}

async function restoreBackup(filename) {
  const fullPath = path.isAbsolute(filename) ? filename : path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error('File backup target tidak ditemukan');
  }

  // 1. Verify target integrity first
  const verification = await verifyBackup(fullPath);
  if (!verification.valid) {
    throw new Error(`Target backup tidak valid: ${verification.message}`);
  }

  // 2. Create safety pre-restore backup of the active database before overwriting
  let safetyBackup = null;
  try {
    safetyBackup = await createBackup('pre_restore_safety');
  } catch (safeErr) {
    console.warn('[BackupService] Could not create pre-restore safety backup:', safeErr.message);
  }

  // 3. Atomically overwrite active database file using streams/copyFileSync
  try {
    fs.copyFileSync(fullPath, DB_FILE);
    console.log(`[BackupService] Successfully restored database from: ${filename}`);

    return {
      success: true,
      restoredFrom: filename,
      preRestoreBackup: safetyBackup ? safetyBackup.filename : null,
      message: 'Database berhasil dipulihkan (restore sukses)'
    };
  } catch (restoreErr) {
    console.error('[BackupService] Restore copy failed:', restoreErr);
    // If restore failed, try to recover from safety backup
    if (safetyBackup && fs.existsSync(safetyBackup.filePath)) {
      try {
        fs.copyFileSync(safetyBackup.filePath, DB_FILE);
        console.log('[BackupService] Reverted back to pre-restore safety database');
      } catch (revErr) { }
    }
    throw restoreErr;
  }
}

module.exports = {
  createBackup,
  listBackups,
  verifyBackup,
  restoreBackup,
  BACKUPS_DIR
};
