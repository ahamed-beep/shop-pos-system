const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const logger = require('./utils/logger');

const productRoutes = require('./Routes/productRoutes');
const userRoutes = require('./Routes/userRoutes');
const saleRoute = require('./Routes/saleRoute');
const configRoutes = require('./Routes/configRoutes');
const backupRoutes = require('./Routes/backupRoutes');
const exportRoutes = require('./Routes/exportRoutes');
const backupController = require('./controllers/backupController');
const printerRoutes = require('./Routes/printerRoutes');
const { verifyToken, restrictTo } = require('./middleware/authMiddleware');
const setupRoutes = require('./Routes/setupRoutes');
const udhaarRoutes = require('./Routes/udhaarRoutes');
const { db, userData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

/* ================== MIDDLEWARE ================== */
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* ================== RUNTIME FOLDERS ================== */
const uploadsDir = path.join(userData, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* ================== STATIC ================== */
app.use('/uploads', express.static(uploadsDir));

/* ================== PUBLIC ROUTES ================== */
app.use('/api/setup', setupRoutes);
app.use('/api/users', userRoutes);

/* ================== PROTECTED ROUTES ================== */
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoute);
app.use('/api/config', configRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/printer', printerRoutes);
app.use('/api/udhaar', udhaarRoutes);
app.post('/api/restore', verifyToken, restrictTo('admin'), backupController.runRestore);


/* ================== HEALTH CHECK ================== */
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ================== FRONTEND (PRODUCTION) ================== */
let frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (!fs.existsSync(frontendDist)) {
  const alt = path.join(__dirname, '..', 'pos-frontend', 'dist');
  if (fs.existsSync(alt)) frontendDist = alt;
}

logger.info('Serving frontend from: ' + frontendDist);

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

/* ================== START SERVER ================== */
let server = null;

function startServer(port = PORT) {
  if (server) return server;

  server = app.listen(port, '127.0.0.1', () => {
    logger.info(`Server running at http://127.0.0.1:${port}`);
    logger.info('User data directory: ' + userData);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} already in use`);
    } else {
      logger.error('Server error: ' + err.message);
    }
  });

  return server;
}

async function shutdownServer() {
  logger.info('Server shutting down...');

  // Trigger auto-backup on exit
  try {
    const data = await backupController.generateBackupData();
    const backupDir = path.join(userData, 'auto_backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const filename = `auto_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(data, null, 2));
    logger.info('Auto-backup completed: ' + filename);

    // Keep only last 5 auto-backups
    const files = fs.readdirSync(backupDir).sort();
    if (files.length > 5) {
      files.slice(0, files.length - 5).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
    }
  } catch (e) {
    logger.error('Auto-backup failed during shutdown: ' + e.message);
  }

  if (server) {
    return new Promise((resolve) => {
      server.close(() => {
        // console.log('Server closed.');
        resolve();
      });
    });
  }
}

module.exports = { startServer, shutdownServer };