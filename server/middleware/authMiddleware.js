const jwt = require('jsonwebtoken');

let cachedSecret = process.env.JWT_SECRET;

const getJWTSecret = async () => {
    if (cachedSecret && cachedSecret !== 'your_super_secret_key_change_this_in_prod') return cachedSecret;

    const { db } = require('../db');
    return new Promise((resolve) => {
        db.get("SELECT value FROM settings WHERE key = 'jwt_secret'", (err, row) => {
            if (!err && row && row.value) {
                cachedSecret = row.value;
                resolve(cachedSecret);
            } else {
                resolve(process.env.JWT_SECRET || 'your_super_secret_key_change_this_in_prod');
            }
        });
    });
};

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ message: 'Malformed token' });

    const secret = await getJWTSecret();
    jwt.verify(token, secret, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid or expired token', error: err.message });
        req.user = decoded; // { id, email, role, ... }
        next();
    });
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
};

const checkIfFirstUser = (req, res, next) => {
    const { db } = require('../db');
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });

        if (row.count === 0) {
            // No users in DB, allow registration
            next();
        } else {
            // Users exist, proceed with normal auth
            verifyToken(req, res, () => {
                restrictTo('admin')(req, res, next);
            });
        }
    });
};

module.exports = { verifyToken, getJWTSecret, restrictTo, checkIfFirstUser };
