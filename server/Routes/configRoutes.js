const express = require('express');
const configController = require('../controllers/configController');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(verifyToken);
router.get('/', configController.getSettings);
router.post('/', restrictTo('admin'), configController.updateSettings);

module.exports = router;
