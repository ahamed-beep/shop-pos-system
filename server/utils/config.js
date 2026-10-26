const path = require('path');
const fs = require('fs');

/**
 * APP_USER_DATA is injected by Electron main process.
 * In dev (node index.js), it falls back safely.
 */
const userData =
    process.env.APP_USER_DATA ||
    path.join(process.cwd(), 'user-data');

// Ensure base user data directory exists
if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true });
}

module.exports = {
    userData,
};
