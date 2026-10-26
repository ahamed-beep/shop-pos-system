const { db } = require("../db");

exports.getSettings = (req, res) => {
    db.all("SELECT key, value FROM settings", [], (err, rows) => {
        if (err) return res.status(500).json({ message: "Error fetching settings", error: err.message });
        const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
        res.status(200).json({ settings });
    });
};

exports.updateSettings = (req, res) => {
    const { settings } = req.body; // { tax_rate: "10" } etc
    if (!settings) return res.status(400).json({ message: "Missing settings data" });

    const keys = Object.keys(settings);
    let completed = 0;
    let errorSent = false;

    keys.forEach(key => {
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, settings[key]], (err) => {
            if (err && !errorSent) {
                errorSent = true;
                return res.status(500).json({ message: "Error updating settings", error: err.message });
            }
            completed++;
            if (completed === keys.length && !errorSent) {
                res.status(200).json({ message: "Settings updated successfully" });
            }
        });
    });
};
