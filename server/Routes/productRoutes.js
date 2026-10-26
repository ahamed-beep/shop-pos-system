// server/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getProducts);
router.get('/check-shortcut/:shortcut', productController.checkShortcut);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.post('/batch-update', productController.batchUpdateProducts);
router.post('/duplicate/:id', productController.duplicateProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
