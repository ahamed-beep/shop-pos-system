// server/controllers/productController.js
const { db, userData } = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// store uploads in the same uploads dir used by server/index.js
const uploadDir = path.join(userData, 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Helper to convert featured field to integer 0/1
const toIntBool = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'boolean') return val ? 1 : 0;
  const s = String(val).toLowerCase();
  if (s === 'true' || s === '1' || s === 'on') return 1;
  return 0;
};

// GET /api/products
exports.getProducts = (req, res) => {
  db.all('SELECT * FROM products ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// GET /api/products/:id
exports.getProductById = (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });
};

// POST /api/products  (multipart/form-data, field 'image')
exports.createProduct = [
  upload.single('image'),
  (req, res) => {
    // Simplified field mapping
    const name = req.body?.name;
    const model = req.body?.model || '';
    const company = req.body?.company;
    const price = parseFloat(req.body?.price || 0);
    const sku = req.body?.sku || null;
    const shortcut = req.body?.shortcut || null;
    const cost = parseFloat(req.body?.cost || 0);
    const discount = parseFloat(req.body?.discount || 0);
    const qty = parseInt(req.body?.qty || 100);
    const low_qty = parseInt(req.body?.low_qty || 2);
    const category = req.body?.category || 'general';
    const attributes = req.body?.attributes || null; // Expected to be stringified JSON
    const image_path = req.file ? '/uploads/' + req.file.filename : null;

    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!model && !category.startsWith('mobile') && category !== 'load' && category !== 'repair') return res.status(400).json({ error: 'Model is required' });
    if (!company) return res.status(400).json({ error: 'Company is required' });
    if (!price) return res.status(400).json({ error: 'Price is required' });

    db.run(
      `INSERT INTO products 
        (name, model, company, price, sku, shortcut, cost, discount, qty, low_qty, category, attributes, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, model, company, price, sku, shortcut, cost, discount, qty, low_qty, category, attributes, image_path],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // console.log(`Product Added: ${name} (ID: ${this.lastID})`);

        db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.status(201).json(row);
        });
      }
    );
  }
];

// PUT /api/products/:id  (multipart/form-data optional image)
exports.updateProduct = [
  upload.single('image'),
  (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!product) return res.status(404).json({ error: 'Product not found' });

      // Simplified field mapping with fallbacks
      const name = req.body?.name || product.name;
      const model = req.body?.model || product.model;
      const company = req.body?.company || product.company;
      const price = req.body?.price !== undefined ? parseFloat(req.body?.price) : product.price;
      const sku = req.body?.sku !== undefined ? req.body?.sku : product.sku;
      const shortcut = req.body?.shortcut !== undefined ? req.body?.shortcut : product.shortcut;
      const cost = req.body?.cost !== undefined ? parseFloat(req.body?.cost) : product.cost;
      const discount = req.body?.discount !== undefined ? parseFloat(req.body?.discount) : product.discount;
      const qty = req.body?.qty !== undefined ? parseInt(req.body?.qty) : product.qty;
      const low_qty = req.body?.low_qty !== undefined ? parseInt(req.body?.low_qty) : product.low_qty;
      const category = req.body?.category !== undefined ? req.body?.category : product.category;
      const attributes = req.body?.attributes !== undefined ? req.body?.attributes : product.attributes;
      const image_path = req.file ? '/uploads/' + req.file.filename : product.image_path;

      // If uploading new image, delete old file (best-effort)
      if (req.file && product.image_path) {
        try {
          const oldPath = path.join(userData, product.image_path.replace(/^\/+/, ''));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn("Failed to delete old image:", e.message);
        }
      }

      db.run(
        `UPDATE products SET 
          name = ?, model = ?, company = ?, price = ?, sku = ?, shortcut = ?, cost = ?, discount = ?, qty = ?, low_qty = ?, category = ?, attributes = ?, image_path = ?
         WHERE id = ?`,
        [name, model, company, price, sku, shortcut, cost, discount, qty, low_qty, category, attributes, image_path, id],
        function (err2) {
          if (err2) return res.status(500).json({ error: err2.message });

          // 🔥 Auto-delete repairs with 0 qty
          if (category === 'repair' && qty <= 0) {
            db.run('DELETE FROM products WHERE id = ?', [id], (errDel) => {
              if (errDel) console.warn("Auto-delete repair failed:", errDel.message);
              // else console.log(`Repair product auto-deleted (0 qty): ID ${id}`);
            });
          }

          // console.log(`Product Updated: ${name} (ID: ${id})`);
          db.get('SELECT * FROM products WHERE id = ?', [id], (err3, row) => {
            if (err3) return res.status(500).json({ error: err3.message });
            res.json(row);
          });
        }
      );
    });
  }
];

// DELETE /api/products/:id
exports.deleteProduct = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    db.run('DELETE FROM products WHERE id = ?', [id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });

      // try delete image file
      if (product.image_path) {
        try {
          const filePath = path.join(userData, product.image_path.replace(/^\/+/, ''));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Failed to delete image file:", e.message);
        }
      }

      // console.log(`Product Deleted: ${product.name} (ID: ${id})`);
      res.json({ message: 'Product deleted successfully', id: Number(id) });
    });
  });
};

// GET /api/products/check-shortcut/:shortcut
exports.checkShortcut = (req, res) => {
  const { shortcut } = req.params;
  if (!shortcut) return res.json({ exists: false });

  db.get('SELECT id FROM products WHERE shortcut = ?', [shortcut], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ exists: !!row });
  });
};

// POST /api/products/duplicate/:id
exports.duplicateProduct = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Generate unique shortcut (random 4 chars + timestamp segment)
    const newShortcut = (Math.random().toString(36).substring(2, 6) + Date.now().toString().slice(-4)).toUpperCase();
    const newName = `${product.name} (Copy)`;
    const newSku = product.sku ? `${product.sku}-COPY` : null;

    db.run(
      `INSERT INTO products 
        (name, model, company, price, sku, shortcut, cost, discount, qty, low_qty, category, attributes, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newName,
        product.model,
        product.company,
        product.price,
        newSku,
        newShortcut,
        product.cost,
        product.discount,
        product.qty,
        product.low_qty,
        product.category,
        product.attributes,
        product.image_path // Share same image path initially
      ],
      function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });

        // console.log(`Product Duplicated: ${newName} (ID: ${this.lastID})`);

        db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err3, row) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.status(201).json(row);
        });
      }
    );
  });
};

// POST /api/products/batch-update
exports.batchUpdateProducts = (req, res) => {
  const { updates } = req.body; // Array of { id, price, qty }

  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'Invalid updates provided' });
  }

  if (updates.length === 0) {
    return res.json({ message: 'No updates to perform' });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    const stmt = db.prepare(`UPDATE products SET price = ?, qty = ? WHERE id = ?`);
    let errorCount = 0;
    let completedCount = 0;

    updates.forEach((update) => {
      stmt.run([update.price, update.qty, update.id], function (err) {
        // 🔥 Auto-delete repairs with 0 qty in batch
        if (!err && update.qty <= 0) {
          db.run("DELETE FROM products WHERE id = ? AND category = 'repair'", [update.id]);
        }

        completedCount++;
        if (err) {
          console.error(`Batch update failed for ID ${update.id}:`, err.message);
          errorCount++;
        }

        // Check if all updates finished
        if (completedCount === updates.length) {
          stmt.finalize();
          if (errorCount > 0) {
            db.run("ROLLBACK", () => {
              res.status(500).json({ error: `${errorCount} updates failed. Transaction rolled back.` });
            });
          } else {
            db.run("COMMIT", (err2) => {
              if (err2) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: "Transaction commit failed" });
              }
              res.json({ message: `Successfully updated ${updates.length} products` });
            });
          }
        }
      });
    });
  });
};

// export multer middleware to be used if needed directly
exports.uploadMiddleware = upload;
