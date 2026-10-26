const logger = require('./logger');

/**
 * Migration Runner
 * 
 * @param {import('sqlite3').Database} db 
 * @param {Array<{id: string, run: (db: import('sqlite3').Database) => Promise<void>}>} migrations 
 */
async function runMigrations(db, migrations) {
    // 1. Create migrations table if not exists
    await new Promise((resolve, reject) => {
        db.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
            if (err) {
                logger.error('Failed to create migrations table: ' + err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });

    // 2. Get applied migrations
    const rows = await new Promise((resolve, reject) => {
        db.all("SELECT id FROM _migrations", (err, rows) => {
            if (err) {
                logger.error('Failed to fetch applied migrations: ' + err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });

    const appliedIds = new Set(rows.map(r => r.id));

    // 3. Run pending migrations sequentially
    for (const migration of migrations) {
        if (!appliedIds.has(migration.id)) {
            logger.info(`Applying migration: ${migration.id}`);
            try {
                await migration.run(db);

                await new Promise((resolve, reject) => {
                    db.run("INSERT INTO _migrations (id) VALUES (?)", [migration.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                logger.info(`Successfully applied migration: ${migration.id}`);
            } catch (err) {
                logger.error(`Error in migration ${migration.id}: ${err.message}`);
                throw err;
            }
        }
    }
}

module.exports = { runMigrations };
