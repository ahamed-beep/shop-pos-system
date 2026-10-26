const { db } = require('../db');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJWTSecret } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

/**
 * Check if this is first-time setup (no users exist)
 */
exports.checkFirstTimeSetup = (req, res) => {
    try {
        db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
            if (err) {
                console.error('Error checking users:', err);
                return res.status(500).json({ error: 'Failed to check setup status' });
            }

            return res.json({
                isFirstTime: row.count === 0,
                userCount: row.count
            });
        });
    } catch (error) {
        logger.error('Error in checkFirstTimeSetup: ' + error.message);
        res.status(500).json({ error: 'Failed to check setup status' });
    }
}

/**
 * Create first admin user (only works if no users exist)
 */
exports.createFirstUser = async (req, res) => {
    logger.info('[createFirstUser] Request received: ' + req.body.email);

    try {
        const { email, password, pin } = req.body;

        if (!email || !password || !pin) {
            // console.log('[createFirstUser] Missing credentials');
            return res.status(400).json({ error: 'Email, password, and a 4-digit PIN are required' });
        }

        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!/^\d{4}$/.test(pin)) {
            return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
        }

        // console.log('[createFirstUser] Checking existing users...');

        // Check if any users exist
        db.get(`SELECT COUNT(*) as count FROM users`, [], (err, row) => {
            if (err) {
                console.error('[createFirstUser] Error checking users:', err);
                return res.status(500).json({ error: 'Failed to create user' });
            }

            // console.log('[createFirstUser] User count:', row?.count);

            if (row && row.count > 0) {
                // console.log('[createFirstUser] Setup already completed');
                return res.status(403).json({ error: 'First-time setup already completed' });
            }

            // console.log('[createFirstUser] Hashing password...');

            // Hash password and PIN
            const hash = bcryptjs.hashSync(password, 10);
            const pinHash = bcryptjs.hashSync(pin, 10);

            // console.log('[createFirstUser] Creating admin user...');

            db.run(
                `INSERT INTO users (email, password_hash, role, is_verified, status, pin) 
                 VALUES (?, ?, ?, 1, 'active', ?)`,
                [email, hash, 'admin', pinHash],
                function (err) {
                    if (err) {
                        console.error('[createFirstUser] Error creating user:', err);
                        return res.status(500).json({ error: 'Failed to create user: ' + err.message });
                    }

                    const userId = this.lastID;
                    // console.log('[createFirstUser] User created with ID:', userId);

                    if (!userId) {
                        console.error('[createFirstUser] No lastID returned');
                        return res.status(500).json({ error: 'User created but ID not returned' });
                    }

                    // Get the created user
                    // console.log('[createFirstUser] Fetching created user...');
                    db.get(`SELECT id, email, role FROM users WHERE id = ?`, [userId], (err, user) => {
                        if (err) {
                            console.error('[createFirstUser] Error fetching user:', err);
                            return res.status(500).json({ error: 'User created but failed to fetch' });
                        }

                        if (!user) {
                            console.error('[createFirstUser] User not found after creation');
                            return res.status(500).json({ error: 'User created but not found' });
                        }

                        // console.log('[createFirstUser] User fetched:', user.email);

                        logger.info('[createFirstUser] Generating JWT token...');
                        getJWTSecret().then(secret => {
                            const token = jwt.sign(
                                { id: user.id, email: user.email, role: user.role },
                                secret,
                                { expiresIn: '24h' }
                            );

                            logger.info('[createFirstUser] Success! Admin user created: ' + user.email);

                            return res.json({
                                message: 'First admin user created successfully',
                                success: true,
                                user,
                                token
                            });
                        }).catch(err => {
                            logger.error('[createFirstUser] Secret retrieval error: ' + err.message);
                            return res.status(500).json({ error: 'Server configuration error' });
                        });
                    });
                }
            );
        });
    } catch (error) {
        console.error('[createFirstUser] Unexpected error:', error);
        return res.status(500).json({ error: 'Failed to create first user: ' + error.message });
    }
}
