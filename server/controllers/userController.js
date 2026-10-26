// controllers/userController.js
const bcrypt = require("bcryptjs");
const { db } = require("../db");
const sendMail = require("../utils/mailer");
const jwt = require('jsonwebtoken');
const { getJWTSecret } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');
const branding = { version: "1.1.0" }; // Sync with frontend branding

// Get all users
exports.getAllUsers = (req, res) => {
  db.all("SELECT id, email, role, status FROM users", [], (err, rows) => {
    if (err) return res.status(400).json({ message: "Error getting users", error: err.message });
    res.status(200).json({ message: "All users coming", users: rows });
  });
};

// Get user by id
exports.getUserById = (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(400).json({ message: "Error getting user", error: err.message });
    if (!row) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User is coming", data: row });
  });
};
// Get user by id
exports.EditUserById = (req, res) => {
  const { id } = req.params; // only id from params
  const { email, password } = req.body; // data from body

  db.get("SELECT * FROM users WHERE id = ?", [id], (err, user) => {
    if (err) return res.status(400).json({ message: "Error getting user", error: err.message });
    if (!user) return res.status(404).json({ message: "User not found" });

    let hash = user.password_hash;
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required for profile updates" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }
    const isSame = bcrypt.compareSync(password, user.password_hash);
    if (isSame) {
      return res.status(400).json({ message: "New password cannot be the same as current password" });
    }
    hash = bcrypt.hashSync(password, 10);

    db.run(
      "UPDATE users SET password_hash = ?, email = ? WHERE id = ?",
      [hash, email || user.email, id],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(200).json({ message: "User updated successfully" });
      }
    );
  });
};

// Register user (no email verification, no OTP)
exports.userSignup = (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Missing fields" });

  const hash = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (email, password_hash, role, is_verified) VALUES (?, ?, ?, ?)",
    [email, hash, "admin", 1], // mark as verified directly and force admin
    function (err) {
      if (err) return res.status(403).json({ message: "User already exists", error: err.message });

      db.get("SELECT id, email, role FROM users WHERE id = ?", [this.lastID], (err2, row) => {
        if (err2) return res.status(500).json({ error: err2.message });

        // Sign token
        getJWTSecret().then(secret => {
          const token = jwt.sign(
            { id: row.id, email: row.email, role: row.role },
            secret,
            { expiresIn: '24h' }
          );

          res.status(200).json({
            message: "User registered successfully",
            user: row,
            token
          });
        });
      });
    }
  );
};

// Login (no JWT)
exports.userLogin = (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    // Login Block for paused users
    if (user.status === 'paused') {
      return res.status(403).json({ message: "Your account is paused. Please contact administrator." });
    }

    // Sign token
    getJWTSecret().then(secret => {
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn: '24h' }
      );

      logger.info(`User Login: ${user.email} (ID: ${user.id})`);

      res.status(200).json({
        message: "Login successful",
        user: { id: user.id, email: user.email, role: user.role },
        token
      });
    });
  });
};

// Forgot password (send reset link by email, needs internet)
exports.userForgotPassword = (req, res) => {
  const { email } = req.body;

  // Look up user by email
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await sendMail(email, "Reset Your Password - MPOSE", `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px 20px; color: #334155;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 31, 63, 0.05); border: 1px solid #e2e8f0;">
            
            <!-- Header -->
            <div style="background-color: #001f3f; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">MPOSE</h1>
              <p style="color: #ffffff; margin: 8px 0 0; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Mobile POS System</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px;">
              <h2 style="color: #001f3f; margin: 0 0 20px; font-size: 20px; font-weight: 800; text-transform: uppercase;">Password Reset Request</h2>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">Hello,</p>
              <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #4f5b6d;">We received a request to reset your password for your MPOSE account. Use the OTP below to proceed. This OTP will expire in 5 minutes.</p>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; background-color: #f1f5f9; color: #001f3f; padding: 16px 32px; border-radius: 12px; font-weight: 800; font-size: 24px; letter-spacing: 4px; box-shadow: inset 0 2px 4px rgba(0, 31, 63, 0.05);">
                  ${otp}
                </div>
              </div>

              <p style="margin: 0 0 16px; font-size: 13px; color: #4f5b6d; font-style: italic;">If you didn't request this, you can safely ignore this email.</p>
              
              <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">Best Regards,</p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #001f3f; font-weight: 800;">MPOSE System Authority</p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f1f5f9; padding: 24px; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #4f5b6d; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">© ${new Date().getFullYear()} MPOSE Mobile POS • v${branding.version}</p>
            </div>
          </div>
        </div>
      `);

      // Save OTP temporarily in DB for verification
      db.run("UPDATE users SET reset_token = ?, reset_expiration = ? WHERE id = ?",
        [otp, Date.now() + 5 * 60 * 1000, user.id],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          res.status(200).json({ message: "Reset OTP sent" });
        }
      );

    } catch (error) {
      res.status(500).json({ message: "Error sending email", error: error.message });
    }
  });
};

// Reset password
exports.userResetPassword = (req, res) => {
  const { Token, newpassword } = req.body;
  if (!Token || !newpassword) return res.status(400).json({ message: "Missing fields" });

  db.get("SELECT * FROM users WHERE reset_token = ?", [Token], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    if (Date.now() > user.reset_expiration) {
      return res.status(400).json({ message: "Token expired" });
    }

    const hash = bcrypt.hashSync(newpassword, 10);

    db.run(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expiration = NULL WHERE id = ?",
      [hash, user.id],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(200).json({ message: "Password reset successfully" });
      }
    );
  });
};

// Toggle User Status (Admin only)
exports.toggleUserStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' or 'paused'

  db.run("UPDATE users SET status = ? WHERE id = ?", [status, id], function (err) {
    if (err) return res.status(500).json({ message: "Failed to update status", error: err.message });
    res.status(200).json({ message: `User status updated to ${status}` });
  });
};

// Delete User (Admin only)
exports.deleteUserById = (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ message: "Failed to delete user", error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  });
};

// Verify User PIN
exports.verifyPin = (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ message: "PIN is required" });
  }

  db.get("SELECT pin FROM users WHERE id = ?", [id], (err, user) => {
    if (err) return res.status(400).json({ message: "Error getting user", error: err.message });
    if (!user) return res.status(404).json({ message: "User not found" });

    // If user has no PIN somehow (migration missed them etc), default to hashed 1111 matching
    const match = user.pin ? bcrypt.compareSync(pin, user.pin) : bcrypt.compareSync(pin, bcrypt.hashSync('1111', 10));
    
    if (!match) {
      return res.status(401).json({ message: "Incorrect PIN" });
    }

    res.status(200).json({ message: "PIN verified successfully", success: true });
  });
};

// Reset User PIN
exports.resetPin = (req, res) => {
  const { id } = req.params;
  const { currentPin, newPin } = req.body;

  if (!currentPin || !newPin) {
    return res.status(400).json({ message: "Current PIN and New PIN are required" });
  }

  if (!/^\d{4}$/.test(newPin)) {
    return res.status(400).json({ message: "New PIN must be exactly 4 digits" });
  }

  db.get("SELECT pin FROM users WHERE id = ?", [id], (err, user) => {
    if (err) return res.status(400).json({ message: "Error getting user", error: err.message });
    if (!user) return res.status(404).json({ message: "User not found" });

    const match = user.pin ? bcrypt.compareSync(currentPin, user.pin) : bcrypt.compareSync(currentPin, bcrypt.hashSync('1111', 10));
    
    if (!match) {
      return res.status(401).json({ message: "Incorrect Current PIN" });
    }

    const hash = bcrypt.hashSync(newPin, 10);

    db.run(
      "UPDATE users SET pin = ? WHERE id = ?",
      [hash, id],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.status(200).json({ message: "PIN updated successfully", success: true });
      }
    );
  });
};
