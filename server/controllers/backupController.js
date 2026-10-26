const { db, userData } = require("../db");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const uploadDir = path.join(userData, "uploads");

// Helper to fetch all rows from a table
const fetchAll = (table) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Helper to insert or replace rows into a table
const insertOrReplace = (table, data) => {
    if (!data || data.length === 0) return Promise.resolve();

    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

    return new Promise((resolve, reject) => {
        const stmt = db.prepare(sql);
        db.serialize(() => {
            data.forEach(row => {
                const values = columns.map(col => row[col]);
                stmt.run(values, (err) => {
                    if (err) console.warn(`Error inserting into ${table}:`, err.message);
                });
            });
            stmt.finalize((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
};

// server/controllers/backupController.js

const generateBackupData = async () => {
    // Included udhaar_records, udhaar_items, udhaar_payments
    const tables = [
        "products", 
        "sales", 
        "sale_items", 
        "settings", 
        "printer_settings", 
        "udhaar_records", 
        "udhaar_items", 
        "udhaar_payments"
    ];
    const backupData = {};

    for (const table of tables) {
        try {
            backupData[table] = await fetchAll(table);
        } catch (e) {
            console.warn(`Could not backup table ${table}:`, e.message);
        }
    }

    const now = new Date().toISOString();
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup', ?)", [now]);

    // Backup Images
    backupData.images = {};
    if (fs.existsSync(uploadDir)) {
        try {
            const files = fs.readdirSync(uploadDir);
            for (const file of files) {
                const filePath = path.join(uploadDir, file);
                if (fs.statSync(filePath).isFile()) {
                    const base64 = fs.readFileSync(filePath, { encoding: 'base64' });
                    backupData.images[file] = base64;
                }
            }
        } catch (err) {
            console.warn("Could not backup images:", err.message);
        }
    }

    return backupData;
};

exports.runRestore = async (req, res) => {
    const { data } = req.body; 
    if (!data) return res.status(400).json({ message: "Missing restoration data" });

    try {
        db.serialize(async () => {
            db.run("BEGIN TRANSACTION");

            const allowedTables = [
                "products", 
                "sales", 
                "sale_items", 
                "settings", 
                "printer_settings", 
                "udhaar_records", 
                "udhaar_items", 
                "udhaar_payments"
            ];
            for (const table of allowedTables) {
                if (data[table] && Array.isArray(data[table])) {
                    await insertOrReplace(table, data[table]);
                }
            }

            db.run("COMMIT", (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ message: "Restore failed during commit", error: err.message });
                }

                if (data.images && typeof data.images === 'object') {
                    try {
                        if (!fs.existsSync(uploadDir)) {
                            fs.mkdirSync(uploadDir, { recursive: true });
                        }
                        for (const [filename, base64Data] of Object.entries(data.images)) {
                            const filePath = path.join(uploadDir, filename);
                            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                        }
                    } catch (err) {
                        console.warn("Could not restore images:", err.message);
                    }
                }

                res.status(200).json({ message: `Data successfully restored using merge mode` });
            });
        });
    } catch (error) {
        db.run("ROLLBACK");
        res.status(500).json({ message: "Restore failed", error: error.message });
    }
};

exports.resetSystem = async (req, res) => {
    const { password } = req.body;
    const userEmail = req.user.email;

    if (!password) return res.status(400).json({ message: "Password is required" });

    db.get("SELECT password_hash FROM users WHERE email = ?", [userEmail], async (err, user) => {
        if (err || !user) return res.status(500).json({ message: "Verification failed" });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: "Invalid password" });

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            const tables = ["products", "sales", "sale_items", "udhaar_records", "udhaar_items", "udhaar_payments"];
            for (const table of tables) {
                db.run(`DELETE FROM ${table}`);
            }

            if (fs.existsSync(uploadDir)) {
                try {
                    const files = fs.readdirSync(uploadDir);
                    for (const file of files) {
                        const filePath = path.join(uploadDir, file);
                        if (fs.statSync(filePath).isFile()) {
                            fs.unlinkSync(filePath);
                        }
                    }
                } catch (e) {
                    console.warn("Failed to clear uploads:", e.message);
                }
            }

            db.run("COMMIT", (errCommit) => {
                if (errCommit) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ message: "Reset failed during commit" });
                }
                res.status(200).json({ message: "System successfully reset. All product, sales, and udhaar data wiped." });
            });
        });
    });
};

exports.generateBackupData = generateBackupData;

exports.getBackupStatus = (req, res) => {
    db.get("SELECT value FROM settings WHERE key = 'last_backup'", [], (err, row) => {
        if (err) return res.status(500).json({ message: "Error fetching status", error: err.message });
        res.status(200).json({ lastDate: row ? row.value : null });
    });
};

exports.runBackup = async (req, res) => {
    try {
        const backupData = await generateBackupData();
        res.status(200).json(backupData);
    } catch (error) {
        res.status(500).json({ message: "Backup failed", error: error.message });
    }
};

exports.runRestore = async (req, res) => {
    const { data } = req.body; 
    if (!data) return res.status(400).json({ message: "Missing restoration data" });

    try {
        db.serialize(async () => {
            db.run("BEGIN TRANSACTION");

            const allowedTables = ["products", "sales", "sale_items", "settings", "printer_settings"];
            for (const table of allowedTables) {
                if (data[table] && Array.isArray(data[table])) {
                    await insertOrReplace(table, data[table]);
                }
            }

            db.run("COMMIT", (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ message: "Restore failed during commit", error: err.message });
                }

                // Restore Images
                if (data.images && typeof data.images === 'object') {
                    try {
                        if (!fs.existsSync(uploadDir)) {
                            fs.mkdirSync(uploadDir, { recursive: true });
                        }
                        for (const [filename, base64Data] of Object.entries(data.images)) {
                            const filePath = path.join(uploadDir, filename);
                            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                        }
                    } catch (err) {
                        console.warn("Could not restore images:", err.message);
                        // don't fail the whole restore if just images fail
                    }
                }

                res.status(200).json({ message: `Data successfully restored using merge mode` });
            });
        });
    } catch (error) {
        db.run("ROLLBACK");
        res.status(500).json({ message: "Restore failed", error: error.message });
    }
};

exports.resetSystem = async (req, res) => {
    const { password } = req.body;
    const userEmail = req.user.email;

    if (!password) return res.status(400).json({ message: "Password is required" });

    db.get("SELECT password_hash FROM users WHERE email = ?", [userEmail], async (err, user) => {
        if (err || !user) return res.status(500).json({ message: "Verification failed" });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ message: "Invalid password" });

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Clear tables
            const tables = ["products", "sales", "sale_items"];
            for (const table of tables) {
                db.run(`DELETE FROM ${table}`);
            }

            // Clear images folder (best effort)
            if (fs.existsSync(uploadDir)) {
                try {
                    const files = fs.readdirSync(uploadDir);
                    for (const file of files) {
                        const filePath = path.join(uploadDir, file);
                        if (fs.statSync(filePath).isFile()) {
                            fs.unlinkSync(filePath);
                        }
                    }
                } catch (e) {
                    console.warn("Failed to clear uploads:", e.message);
                }
            }

            db.run("COMMIT", (errCommit) => {
                if (errCommit) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ message: "Reset failed during commit" });
                }
                // console.log(`System Reset by ${userEmail}`);
                res.status(200).json({ message: "System successfully reset. All product and sales data wiped." });
            });
        });
    });
};
