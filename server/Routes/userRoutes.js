const express = require('express');
const userController = require('../controllers/userController');
const { verifyToken, restrictTo, checkIfFirstUser } = require('../middleware/authMiddleware');
const router = express.Router();

// USERS
router.post("/login", userController.userLogin);
router.post("/register", checkIfFirstUser, userController.userSignup); // First user can register without token
router.post("/forget", userController.userForgotPassword);
router.post("/Reset", userController.userResetPassword);

// Protected routes
router.use(verifyToken);
router.get("/", restrictTo('admin'), userController.getAllUsers);
router.get("/:id", (req, res, next) => {
    if (req.user.role === 'admin' || req.user.id === Number(req.params.id)) return next();
    res.status(403).json({ message: 'Forbidden' });
}, userController.getUserById);
router.put("/:id", (req, res, next) => {
    if (req.user.role === 'admin' || req.user.id === Number(req.params.id)) return next();
    res.status(403).json({ message: 'Forbidden' });
}, userController.EditUserById);
router.put("/:id/status", restrictTo('admin'), userController.toggleUserStatus);
router.delete("/:id", restrictTo('admin'), userController.deleteUserById);

router.post("/:id/verify-pin", (req, res, next) => {
    if (req.user.role === 'admin' || req.user.id === Number(req.params.id)) return next();
    res.status(403).json({ message: 'Forbidden' });
}, userController.verifyPin);

router.put("/:id/reset-pin", (req, res, next) => {
    if (req.user.role === 'admin' || req.user.id === Number(req.params.id)) return next();
    res.status(403).json({ message: 'Forbidden' });
}, userController.resetPin);


module.exports = router;
