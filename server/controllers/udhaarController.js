const { db } = require('../db');

// GET /api/udhaar - Filter strictly on borrowed_date
exports.getUdhaarRecords = (req, res) => {
  const { startDate, endDate, fromDate, toDate } = req.query;
  const start = startDate || fromDate;
  const end = endDate || toDate;

  let query = `
    SELECT u.*, 
      COALESCE((SELECT SUM(ui.qty * COALESCE(ui.cost, 0)) FROM udhaar_items ui WHERE ui.udhaar_id = u.id), 0) as total_cost,
      (SELECT COUNT(*) FROM udhaar_items ui WHERE ui.udhaar_id = u.id) as item_count,
      (SELECT MAX(paid_at) FROM udhaar_payments up WHERE up.udhaar_id = u.id) as last_paid_date,
      CASE 
        WHEN u.remaining_amount <= 0 THEN 'paid'
        WHEN u.due_date IS NOT NULL AND date(u.due_date) < date('now') AND u.remaining_amount > 0 THEN 'overdue'
        ELSE u.status
      END as computed_status
    FROM udhaar_records u
    WHERE 1=1
  `;

  const params = [];

  if (start && end) {
    query += ` AND date(u.borrowed_date) >= date(?) AND date(u.borrowed_date) <= date(?)`;
    params.push(start, end);
  }

  query += ` ORDER BY u.borrowed_date DESC, u.created_at DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Add or update getUdhaarItems in server/controllers/udhaarController.js

// GET /api/udhaar/:id/items - Fetch items array for an Udhaar record
exports.getUdhaarItems = (req, res) => {
  const { id } = req.params;
  db.all(`SELECT * FROM udhaar_items WHERE udhaar_id = ?`, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Normalize fields for frontend rendering
    const items = (rows || []).map(item => ({
      ...item,
      product_name: item.product_name || item.name,
      name: item.name || item.product_name,
      qty: item.qty || item.quantity || 1,
      price: item.price || 0,
      total: item.total || (item.price * (item.qty || 1))
    }));

    res.json(items);
  });
};
// GET /api/udhaar/:id - Fetch single record with items & payment history
exports.getUdhaarById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM udhaar_records WHERE id = ?', [id], (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(404).json({ error: 'Udhaar record not found' });

    db.all('SELECT * FROM udhaar_items WHERE udhaar_id = ?', [id], (err2, items) => {
      if (err2) return res.status(500).json({ error: err2.message });

      db.all('SELECT * FROM udhaar_payments WHERE udhaar_id = ? ORDER BY paid_at DESC', [id], (err3, payments) => {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ record, items, payments });
      });
    });
  });
};

// POST /api/udhaar - Create new Udhaar record & deduct inventory stock
exports.createUdhaarRecord = (req, res) => {
  const {
    customer_name,
    customer_phone = '',
    total_amount,
    discount = 0,
    paid_amount = 0,
    borrowed_date,
    due_date = null,
    notes = '',
    items = []
  } = req.body;

  if (!customer_name) return res.status(400).json({ error: 'Customer name is required' });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  const remaining_amount = Math.max(total_amount - discount - paid_amount, 0);
  const status = remaining_amount <= 0 ? 'paid' : (paid_amount > 0 ? 'partial' : 'pending');
  const recordBorrowedDate = borrowed_date || new Date().toISOString().slice(0, 10);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      `INSERT INTO udhaar_records 
        (customer_name, customer_phone, total_amount, discount, paid_amount, remaining_amount, status, borrowed_date, due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_name, customer_phone, total_amount, discount, paid_amount, remaining_amount, status, recordBorrowedDate, due_date, notes],
      function (err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        const udhaarId = this.lastID;
        const itemStmt = db.prepare(
          `INSERT INTO udhaar_items (udhaar_id, product_id, product_name, qty, price, cost) VALUES (?, ?, ?, ?, ?, ?)`
        );

        let stockError = false;

        for (const item of items) {
          itemStmt.run([udhaarId, item.product_id || null, item.name || item.product_name, item.qty || 1, item.price, item.cost || 0]);

          // Deduct inventory stock if item is linked to a product
          if (item.product_id && typeof item.product_id === 'number') {
            db.run(`UPDATE products SET qty = qty - ? WHERE id = ?`, [item.qty || 1, item.product_id], (errU) => {
              if (errU) stockError = true;
            });
          }
        }

        itemStmt.finalize();

        // If an initial payment was made during creation, log it in payments table
        if (paid_amount > 0) {
          db.run(
            `INSERT INTO udhaar_payments (udhaar_id, amount_paid, payment_method) VALUES (?, ?, ?)`,
            [udhaarId, paid_amount, 'cash']
          );
        }

        if (stockError) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to update inventory stock' });
        }

        db.run('COMMIT', (errC) => {
          if (errC) return res.status(500).json({ error: errC.message });
          res.status(201).json({ id: udhaarId, message: 'Udhaar record created successfully' });
        });
      }
    );
  });
};

// POST /api/udhaar/:id/pay - Process payment for existing Udhaar
exports.payUdhaar = (req, res) => {
  const { id } = req.params;
  const { amount_paid, payment_method = 'cash' } = req.body;

  const payVal = parseFloat(amount_paid);
  if (!payVal || payVal <= 0) return res.status(400).json({ error: 'Invalid payment amount' });

  db.get('SELECT * FROM udhaar_records WHERE id = ?', [id], (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(404).json({ error: 'Udhaar record not found' });
    if (record.remaining_amount <= 0) return res.status(400).json({ error: 'Udhaar is already fully paid' });

    const newPaidAmount = record.paid_amount + payVal;
    const newRemainingAmount = Math.max(record.remaining_amount - payVal, 0);
    const newStatus = newRemainingAmount <= 0 ? 'paid' : 'partial';

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
        `INSERT INTO udhaar_payments (udhaar_id, amount_paid, payment_method) VALUES (?, ?, ?)`,
        [id, payVal, payment_method],
        (err1) => {
          if (err1) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err1.message });
          }

          db.run(
            `UPDATE udhaar_records SET paid_amount = ?, remaining_amount = ?, status = ? WHERE id = ?`,
            [newPaidAmount, newRemainingAmount, newStatus, id],
            (err2) => {
              if (err2) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err2.message });
              }

              db.run('COMMIT', (errC) => {
                if (errC) return res.status(500).json({ error: errC.message });
                res.json({
                  message: 'Payment recorded successfully',
                  paid_amount: newPaidAmount,
                  remaining_amount: newRemainingAmount,
                  status: newStatus
                });
              });
            }
          );
        }
      );
    });
  });
};

// DELETE /api/udhaar/:id - Delete Udhaar & restore product stock
exports.deleteUdhaar = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM udhaar_records WHERE id = ?', [id], (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(404).json({ error: 'Udhaar record not found' });

    db.all('SELECT * FROM udhaar_items WHERE udhaar_id = ?', [id], (err2, items) => {
      if (err2) return res.status(500).json({ error: err2.message });

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Restore product stock
        for (const item of items) {
          if (item.product_id) {
            db.run(`UPDATE products SET qty = qty + ? WHERE id = ?`, [item.qty, item.product_id]);
          }
        }

        db.run('DELETE FROM udhaar_items WHERE udhaar_id = ?', [id]);
        db.run('DELETE FROM udhaar_payments WHERE udhaar_id = ?', [id]);
        db.run('DELETE FROM udhaar_records WHERE id = ?', [id], (errD) => {
          if (errD) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: errD.message });
          }

          db.run('COMMIT', (errC) => {
            if (errC) return res.status(500).json({ error: errC.message });
            res.json({ message: 'Udhaar record deleted and stock restored', id: Number(id) });
          });
        });
      });
    });
  });
};

// PUT /api/udhaar/:id - Update Udhaar record details
exports.updateUdhaarRecord = (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, total_amount, discount, borrowed_date, due_date, notes, items } = req.body;

  db.get('SELECT * FROM udhaar_records WHERE id = ?', [id], (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(404).json({ error: 'Udhaar record not found' });

    const newRemaining = Math.max(total_amount - (discount || 0) - record.paid_amount, 0);
    const newStatus = newRemaining <= 0 ? 'paid' : (record.paid_amount > 0 ? 'partial' : 'pending');

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
        `UPDATE udhaar_records 
         SET customer_name = ?, customer_phone = ?, total_amount = ?, discount = ?, remaining_amount = ?, status = ?, borrowed_date = ?, due_date = ?, notes = ?
         WHERE id = ?`,
        [customer_name, customer_phone, total_amount, discount || 0, newRemaining, newStatus, borrowed_date, due_date, notes, id]
      );

      if (Array.isArray(items) && items.length > 0) {
        db.run('DELETE FROM udhaar_items WHERE udhaar_id = ?', [id]);
        const stmt = db.prepare(`INSERT INTO udhaar_items (udhaar_id, product_id, product_name, qty, price, cost) VALUES (?, ?, ?, ?, ?, ?)`);
        for (const item of items) {
          stmt.run([id, item.product_id || null, item.name || item.product_name, item.qty || 1, item.price, item.cost || 0]);
        }
        stmt.finalize();
      }

      db.run('COMMIT', (errC) => {
        if (errC) return res.status(500).json({ error: errC.message });
        res.json({ message: 'Udhaar record updated successfully' });
      });
    });
  });
};