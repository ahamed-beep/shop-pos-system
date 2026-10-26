const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

// All backup/restore routes are protected and admin-only
router.use(verifyToken);
router.use(restrictTo('admin'));

router.get('/status', backupController.getBackupStatus);
router.get('/', backupController.runBackup);
router.post('/restore', (req, res, next) => {
    // Redirect /api/backup/restore to /api/restore if needed, 
    // but Settings.jsx calls /api/restore directly.
    // However, it's better to keep it consistent.
    backupController.runRestore(req, res);
});

router.post('/reset', backupController.resetSystem);

module.exports = router;
