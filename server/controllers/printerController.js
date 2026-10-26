const { db } = require('../db');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

/**
 * Detect available thermal printers
 */
exports.detectPrinters = async (req, res) => {
    try {
        // console.log('[detectPrinters] Scanning for thermal printers...');

        // This is a placeholder - actual detection happens via Electron IPC
        // The frontend will call Electron's detect-printers which uses node-thermal-printer
        return res.json({
            message: 'Please use Electron IPC for printer detection',
            printers: []
        });
    } catch (error) {
        console.error('[detectPrinters] Error:', error);
        return res.status(500).json({ error: 'Failed to detect printers' });
    }
};

/**
 * Get current printer configuration
 */
exports.getPrinterConfig = (req, res) => {
    try {
        db.get(`SELECT * FROM printer_settings WHERE id = 1`, [], (err, config) => {
            if (err) {
                console.error('[getPrinterConfig] Error:', err);
                return res.status(500).json({ error: 'Failed to get printer config' });
            }

            return res.json({
                config: config || {
                    printer_type: 'auto',
                    printer_name: null,
                    printer_interface: null,
                    paper_width: 58,
                    auto_cut: 1
                }
            });
        });
    } catch (error) {
        console.error('[getPrinterConfig] Error:', error);
        return res.status(500).json({ error: 'Failed to get printer config' });
    }
};

/**
 * Save printer configuration
 */
exports.savePrinterConfig = (req, res) => {
    try {
        const { printer_type, printer_name, printer_interface, paper_width, auto_cut } = req.body;

        // console.log('[savePrinterConfig] Saving config:', { printer_type, printer_name });

        db.run(
            `UPDATE printer_settings 
             SET printer_type = ?, 
                 printer_name = ?, 
                 printer_interface = ?, 
                 paper_width = ?, 
                 auto_cut = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = 1`,
            [printer_type, printer_name, printer_interface, paper_width || 58, auto_cut !== undefined ? auto_cut : 1],
            (err) => {
                if (err) {
                    console.error('[savePrinterConfig] Error:', err);
                    return res.status(500).json({ error: 'Failed to save printer config' });
                }

                // console.log('[savePrinterConfig] Config saved successfully');
                return res.json({
                    success: true,
                    message: 'Printer configuration saved'
                });
            }
        );
    } catch (error) {
        console.error('[savePrinterConfig] Error:', error);
        return res.status(500).json({ error: 'Failed to save printer config' });
    }
};

/**
 * Test print (for backend testing - actual printing via Electron IPC)
 */
exports.testPrint = async (req, res) => {
    try {
        // console.log('[testPrint] Test print requested');

        // Actual test printing should be triggered via Electron IPC
        return res.json({
            message: 'Please use Electron IPC for test printing',
            success: true
        });
    } catch (error) {
        console.error('[testPrint] Error:', error);
        return res.status(500).json({ error: 'Failed to test print' });
    }
};

module.exports = exports;
