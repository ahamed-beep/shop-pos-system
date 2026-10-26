const logger = require('./logger');

/**
 * All schema migrations go here.
 * Format: { id: string, run: (db) => Promise<void> }
 */
const migrations = [
    {
        id: '2026-02-14-001-products-legacy',
        run: async (db) => {
            return new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(products)", (err, columns) => {
                    if (err) return reject(err);
                    if (!columns || columns.length === 0) return resolve(); // Table might not exist yet if base setup failed, but base setup runs first.

                    const hasCompany = columns.some(col => col.name === 'company');
                    const hasLowQty = columns.some(col => col.name === 'low_qty');
                    const hasCost = columns.some(col => col.name === 'cost');
                    const hasShortcut = columns.some(col => col.name === 'shortcut');

                    db.serialize(() => {
                        if (!hasCompany) {
                            const hasBrand = columns.some(col => col.name === 'brand');
                            db.run("ALTER TABLE products ADD COLUMN company TEXT DEFAULT 'Generic'");
                            if (hasBrand) {
                                db.run("UPDATE products SET company = brand WHERE brand IS NOT NULL");
                            }
                        }
                        if (!hasLowQty) {
                            db.run("ALTER TABLE products ADD COLUMN low_qty INTEGER DEFAULT 2");
                            const hasMinStock = columns.some(col => col.name === 'min_stock');
                            if (hasMinStock) {
                                db.run("UPDATE products SET low_qty = min_stock WHERE min_stock IS NOT NULL");
                            }
                        }
                        if (!hasCost) {
                            db.run("ALTER TABLE products ADD COLUMN cost REAL DEFAULT 0");
                            const hasPurchasePrice = columns.some(col => col.name === 'purchase_price');
                            if (hasPurchasePrice) {
                                db.run("UPDATE products SET cost = purchase_price WHERE purchase_price IS NOT NULL");
                            }
                        }
                        if (!hasShortcut) {
                            db.run("ALTER TABLE products ADD COLUMN shortcut TEXT");
                            db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_shortcut ON products(shortcut)");
                        }
                        db.run("SELECT 1", resolve); // Final sync point
                    });
                });
            });
        }
    },
    {
        id: '2026-02-14-002-sales-legacy',
        run: async (db) => {
            return new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(sales)", (err, columns) => {
                    if (err) return reject(err);
                    const hasStatus = columns.some(col => col.name === 'status');
                    const hasCustomerId = columns.some(col => col.name === 'customer_id');

                    db.serialize(() => {
                        if (!hasStatus) db.run("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completed'");
                        if (!hasCustomerId) db.run("ALTER TABLE sales ADD COLUMN customer_id INTEGER");
                        db.run("SELECT 1", resolve);
                    });
                });
            });
        }
    },
    {
        id: '2026-02-14-003-sale-items-legacy',
        run: async (db) => {
            return new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(sale_items)", (err, columns) => {
                    if (err) return reject(err);
                    const hasRefundedQty = columns.some(col => col.name === 'refunded_qty');
                    if (!hasRefundedQty) {
                        db.run("ALTER TABLE sale_items ADD COLUMN refunded_qty INTEGER DEFAULT 0", (err) => {
                            if (err) reject(err); else resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }
    },
    {
        id: '2026-02-14-004-machines-legacy',
        run: async (db) => {
            return new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(machines)", (err, columns) => {
                    if (err) return reject(err);
                    const hasFirstSeen = columns.some(col => col.name === 'first_seen');
                    const hasLastSeen = columns.some(col => col.name === 'last_seen');
                    const hasCreatedAt = columns.some(col => col.name === 'created_at');

                    if (hasCreatedAt && !hasFirstSeen) {
                        db.serialize(() => {
                            db.run("ALTER TABLE machines RENAME TO machines_old");
                            db.run(`CREATE TABLE machines (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                machine_id TEXT UNIQUE,
                                first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
                            )`);
                            db.run(`INSERT INTO machines (id, machine_id, first_seen, last_seen)
                                    SELECT id, machine_id, created_at, created_at FROM machines_old`);
                            db.run("DROP TABLE machines_old", (err) => {
                                if (err) reject(err); else resolve();
                            });
                        });
                    } else if (!hasLastSeen && hasFirstSeen) {
                        db.run("ALTER TABLE machines ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
                            if (err) reject(err); else resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }
    },
    {
        id: '2026-02-14-005-security-jwt-secret',
        run: async (db) => {
            const crypto = require('crypto');
            return new Promise((resolve, reject) => {
                db.get("SELECT value FROM settings WHERE key = 'jwt_secret'", (err, row) => {
                    if (err) return reject(err);
                    if (!row || !row.value) {
                        const secret = crypto.randomBytes(32).toString('hex');
                        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('jwt_secret', ?)", [secret], (err) => {
                            if (err) reject(err);
                            else {
                                logger.info('Generated unique JWT_SECRET for this installation.');
                                resolve();
                            }
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }
    },
    {
        id: '2026-02-21-006-products-attributes',
        run: async (db) => {
            return new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(products)", (err, columns) => {
                    if (err) return reject(err);
                    const hasAttributes = columns.some(col => col.name === 'attributes');
                    const hasCategory = columns.some(col => col.name === 'category');

                    db.serialize(() => {
                        if (!hasAttributes) {
                            db.run("ALTER TABLE products ADD COLUMN attributes TEXT"); // Store as JSON string
                        }
                        if (!hasCategory) {
                            db.run("ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'general'");
                        }
                        db.run("SELECT 1", resolve);
                    });
                });
            });
        }
    },
    {
        id: '2026-02-26-007-sales-tax',
        run: async (db) => {
            return new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(sales)", (err, columns) => {
                    if (err) return reject(err);
                    const hasTax = columns.some(col => col.name === 'tax');
                    if (!hasTax) {
                        db.run("ALTER TABLE sales ADD COLUMN tax REAL DEFAULT 0", (err) => {
                            if (err) reject(err); else resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }
    },
    {
        id: '2026-03-03-008-sale-items-name-category',
        run: async (db) => {
            return new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(sale_items)", (err, columns) => {
                    if (err) return reject(err);
                    const hasProductName = columns.some(col => col.name === 'product_name');
                    const hasCategory = columns.some(col => col.name === 'category');

                    db.serialize(() => {
                        if (!hasProductName) db.run("ALTER TABLE sale_items ADD COLUMN product_name TEXT");
                        if (!hasCategory) db.run("ALTER TABLE sale_items ADD COLUMN category TEXT");
                        db.run("SELECT 1", resolve);
                    });
                });
            });
        }
    },
    {
        id: '2026-03-31-009-users-pin',
        run: async (db) => {
            const bcrypt = require('bcryptjs');
            return new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(users)", (err, columns) => {
                    if (err) return reject(err);
                    const hasPin = columns.some(col => col.name === 'pin');

                    if (!hasPin) {
                        const defaultPinHash = bcrypt.hashSync('1111', 10);
                        db.run(`ALTER TABLE users ADD COLUMN pin TEXT DEFAULT '${defaultPinHash}'`, (err) => {
                            if (err) reject(err); else resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }
    },{
    id: '2026-06-06-001-add-cost-to-sale-items',
    run: async (db) => {
        return new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(sale_items)", (err, columns) => {
                if (err) return reject(err);
                const hasCost = columns.some(col => col.name === 'cost');

                if (!hasCost) {
                    db.run("ALTER TABLE sale_items ADD COLUMN cost REAL DEFAULT 0", (err) => {
                        if (err) reject(err); else resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }
},{
    id: '2026-06-06-002-sync-historical-costs',
    run: async (db) => {
        return new Promise((resolve, reject) => {
            // Update sale_items cost where it is 0, using the current product cost
            const query = `
                UPDATE sale_items 
                SET cost = (SELECT cost FROM products WHERE products.id = sale_items.product_id)
                WHERE cost = 0 AND product_id IS NOT NULL;
            `;
            db.run(query, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
},// Add to migrations array in migrations.js
{
    id: '2026-06-06-003-fix-profit-calc',
    run: async (db) => {
        return new Promise((resolve, reject) => {
            // This forces the DB to update cost where it's missing/0 
            // by looking up the latest cost in your products table
            const sql = `
                UPDATE sale_items 
                SET cost = (SELECT cost FROM products WHERE products.id = sale_items.product_id)
                WHERE (cost IS NULL OR cost = 0) AND product_id IS NOT NULL;
            `;
            db.run(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}
];

module.exports = migrations;
