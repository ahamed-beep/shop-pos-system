const { db } = require('../db');
const XLSX = require('xlsx');

// GET /api/export/inventory
exports.exportInventory = (req, res) => {
    db.all(`SELECT name, category, company, model, price, cost, qty, attributes, sku, shortcut, low_qty FROM products`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        try {
            const data = rows.map(p => {
                let attrs = {};
                try {
                    attrs = p.attributes ? JSON.parse(p.attributes) : {};
                } catch (e) { }

                return {
                    Name: p.name,
                    Category: p.category || 'N/A',
                    Company: p.company || 'N/A',
                    Model: p.model || 'Universal',
                    'Selling Price': p.price,
                    Cost: p.cost || 0,
                    Quantity: p.qty,
                    'IMEI 1': attrs.imei1 || '',
                    'IMEI 2': attrs.imei2 || '',
                    'RAM/Storage': attrs.storage || '',
                    Color: attrs.color || '',
                    Condition: attrs.condition || '',
                    'Battery Health': attrs.batteryHealth ? `${attrs.batteryHealth}%` : '',
                    Warranty: attrs.warranty || '',
                    Accessories: attrs.includedAccessories || attrs.accessoryType || '',
                    SKU: p.sku || 'N/A',
                    Shortcut: p.shortcut || 'N/A'
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

            // Define column widths
            worksheet['!cols'] = [
                { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
                { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
                { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
                { wch: 12 }
            ];

            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=inventory_export_${new Date().toISOString().split('T')[0]}.xlsx`);
            res.send(buffer);

        } catch (error) {
            console.error("Export generation error:", error);
            res.status(500).json({ error: "Failed to generate Excel file" });
        }
    });
};
