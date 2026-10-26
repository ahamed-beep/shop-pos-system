const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { verifyToken, restrictTo } = require('../middleware/authMiddleware');

router.use(verifyToken); // Protect all sale routes

router.get('/', saleController.getSales);
router.get('/stats/top-products', saleController.getTopProducts);
router.get('/stats/monthly-profit', saleController.getMonthlyProfit);
router.get('/analytics', saleController.getAnalytics);
router.get('/stats/category', saleController.getCategoryStats);
router.get('/stats/brand', saleController.getBrandStats);
router.get('/:id', saleController.getSaleById);
router.post('/', saleController.createSale);
router.post('/save-image', saleController.saveSaleImage);
router.put('/:id/refund', saleController.refundSale);
router.put('/:id/items/:itemId/refund', saleController.refundItem);
router.delete('/:id', restrictTo('admin'), saleController.deleteSale); // Only admin can delete history

module.exports = router;
