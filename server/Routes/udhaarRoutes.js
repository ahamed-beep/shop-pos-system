// server/routes/udhaarRoutes.js
const express = require('express');
const router = express.Router();
const udhaarController = require('../controllers/udhaarController');

router.get('/', udhaarController.getUdhaarRecords);
router.get('/:id/items', udhaarController.getUdhaarItems); 
router.get('/:id', udhaarController.getUdhaarById);
router.post('/', udhaarController.createUdhaarRecord);
router.post('/:id/pay', udhaarController.payUdhaar);
router.delete('/:id', udhaarController.deleteUdhaar);
router.put('/:id', udhaarController.updateUdhaarRecord);


module.exports = router;