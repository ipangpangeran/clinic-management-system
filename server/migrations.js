const { runQuery, allQuery, getQuery } = require('./db');

const MIGRATIONS = [
  {
    name: '001_core_indexes_and_timezone_triggers',
    up: async () => {
      // 1. Performance Indexes for Search & Filter Queries
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_pasien_no_hp ON pasien(no_hp)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_nama ON pasien(nama_lengkap)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_tipe ON pasien(tipe_pasien)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_marketing ON pasien(marketing_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_created ON pasien(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_paket_pasien ON pasien_paket(pasien_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_paket_status ON pasien_paket(status_pembayaran)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_paket_billed ON pasien_paket(is_billed)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_usage_paket ON pasien_paket_usage(pasien_paket_id)`,
        `CREATE INDEX IF NOT EXISTS idx_pasien_usage_pasien ON pasien_paket_usage(pasien_id)`,
        `CREATE INDEX IF NOT EXISTS idx_transaksi_pasien ON transaksi(pasien_id)`,
        `CREATE INDEX IF NOT EXISTS idx_transaksi_created ON transaksi(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_transaksi_nota ON transaksi(no_nota)`,
        `CREATE INDEX IF NOT EXISTS idx_transaksi_detail_trx ON transaksi_detail(transaksi_id)`,
        `CREATE INDEX IF NOT EXISTS idx_doingan_pasien ON doingan(pasien_id)`,
        `CREATE INDEX IF NOT EXISTS idx_doingan_petugas ON doingan(petugas_id)`,
        `CREATE INDEX IF NOT EXISTS idx_doingan_created ON doingan(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_doingan_role ON doingan(role_petugas)`,
        `CREATE INDEX IF NOT EXISTS idx_doingan_status ON doingan(status_pengerjaan)`,
        `CREATE INDEX IF NOT EXISTS idx_poin_pasien ON pasien_poin_history(pasien_id)`,
        `CREATE INDEX IF NOT EXISTS idx_reminder_status_tgl ON pasien_reminder(status, tgl_kembali)`,
        `CREATE INDEX IF NOT EXISTS idx_stok_sku ON stok_produk(kode_sku)`,
        `CREATE INDEX IF NOT EXISTS idx_mutasi_produk ON stok_mutasi(produk_id)`
      ];

      for (const idxSql of indexes) {
        await runQuery(idxSql);
      }

      // 2. Automated GMT+7 (Asia/Jakarta) Database Triggers
      // Guarantees all inserts default to GMT+7 even if fallback or default values occur
      const triggers = [
        `CREATE TRIGGER IF NOT EXISTS trg_pasien_created_at_gmt7
         AFTER INSERT ON pasien
         FOR EACH ROW
         WHEN NEW.created_at IS NULL OR NEW.created_at = CURRENT_TIMESTAMP
         BEGIN
           UPDATE pasien SET created_at = datetime('now', '+7 hours') WHERE id = NEW.id;
         END`,

        `CREATE TRIGGER IF NOT EXISTS trg_doingan_created_at_gmt7
         AFTER INSERT ON doingan
         FOR EACH ROW
         WHEN NEW.created_at IS NULL OR NEW.created_at = CURRENT_TIMESTAMP
         BEGIN
           UPDATE doingan SET created_at = datetime('now', '+7 hours'),
                             started_at = COALESCE(NEW.started_at, datetime('now', '+7 hours'))
           WHERE id = NEW.id;
         END`,

        `CREATE TRIGGER IF NOT EXISTS trg_transaksi_created_at_gmt7
         AFTER INSERT ON transaksi
         FOR EACH ROW
         WHEN NEW.created_at IS NULL OR NEW.created_at = CURRENT_TIMESTAMP
         BEGIN
           UPDATE transaksi SET created_at = datetime('now', '+7 hours') WHERE id = NEW.id;
         END`,

        `CREATE TRIGGER IF NOT EXISTS trg_pasien_paket_created_at_gmt7
         AFTER INSERT ON pasien_paket
         FOR EACH ROW
         WHEN NEW.created_at IS NULL OR NEW.created_at = CURRENT_TIMESTAMP
         BEGIN
           UPDATE pasien_paket SET created_at = datetime('now', '+7 hours') WHERE id = NEW.id;
         END`,

        `CREATE TRIGGER IF NOT EXISTS trg_pasien_usage_used_at_gmt7
         AFTER INSERT ON pasien_paket_usage
         FOR EACH ROW
         WHEN NEW.used_at IS NULL OR NEW.used_at = CURRENT_TIMESTAMP
         BEGIN
           UPDATE pasien_paket_usage SET used_at = datetime('now', '+7 hours') WHERE id = NEW.id;
         END`
      ];

      for (const trgSql of triggers) {
        await runQuery(trgSql);
      }
    }
  },
  {
    name: '002_add_created_at_to_transaksi_detail',
    up: async () => {
      try {
        await runQuery(`ALTER TABLE transaksi_detail ADD COLUMN created_at DATETIME`);
      } catch (e) {
        // Column may already exist
      }

      await runQuery(`
        CREATE TRIGGER IF NOT EXISTS trg_transaksi_detail_created_at_gmt7
        AFTER INSERT ON transaksi_detail
        FOR EACH ROW
        WHEN NEW.created_at IS NULL OR NEW.created_at = CURRENT_TIMESTAMP
        BEGIN
          UPDATE transaksi_detail SET created_at = datetime('now', '+7 hours') WHERE id = NEW.id;
        END
      `);
    }
  }
];

async function runMigrations() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT (datetime('now', '+7 hours'))
      )
    `);

    const appliedRows = await allQuery('SELECT name FROM _migrations');
    const appliedSet = new Set(appliedRows.map(r => r.name));
    const newlyExecuted = [];

    for (const migration of MIGRATIONS) {
      if (!appliedSet.has(migration.name)) {
        console.log(`[Migrations] Applying: ${migration.name}...`);
        await runQuery('BEGIN TRANSACTION');
        try {
          await migration.up();
          await runQuery(
            `INSERT INTO _migrations (name, executed_at) VALUES (?, datetime('now', '+7 hours'))`,
            [migration.name]
          );
          await runQuery('COMMIT');
          newlyExecuted.push(migration.name);
          console.log(`[Migrations] Successfully applied: ${migration.name}`);
        } catch (migErr) {
          await runQuery('ROLLBACK');
          console.error(`[Migrations] Error applying ${migration.name}, transaction rolled back:`, migErr);
          throw migErr;
        }
      }
    }

    return {
      success: true,
      executed: newlyExecuted,
      totalApplied: appliedSet.size + newlyExecuted.length
    };
  } catch (err) {
    console.error('[Migrations] Fatal migration runner error:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

module.exports = {
  runMigrations,
  MIGRATIONS
};
