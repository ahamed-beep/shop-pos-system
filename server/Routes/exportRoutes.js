const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

router.use(verifyToken);
router.use(restrictTo('admin'));

router.get('/inventory', exportController.exportInventory);

module.exports = router;
