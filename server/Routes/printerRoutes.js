const express = require('express');
const router = express.Router();
const {
    detectPrinters,
    getPrinterConfig,
    savePrinterConfig,
    testPrint
} = require('../controllers/printerController');

// Get printer configuration
router.get('/config', getPrinterConfig);

// Save printer configuration
router.post('/config', savePrinterConfig);

// Detect printers (placeholder - actual detection via Electron)
router.get('/detect', detectPrinters);

// Test print (placeholder - actual printing via Electron)
router.post('/test', testPrint);

module.exports = router;
