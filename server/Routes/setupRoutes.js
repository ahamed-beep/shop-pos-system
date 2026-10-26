const express = require('express');
const router = express.Router();
const {
    checkFirstTimeSetup,
    createFirstUser
} = require('../controllers/setupController');

// First-time setup endpoints
router.get('/first-time-check', checkFirstTimeSetup);
router.post('/first-user', createFirstUser);

module.exports = router;