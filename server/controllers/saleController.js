const { db, userData } = require('../db');
const fs = require('fs');
const path = require('path');

exports.getSales = (req, res) => {
  db.all(
    `SELECT s.*, 
      (SELECT SUM((si.price - COALESCE(si.cost, 0)) * (si.qty - COALESCE(si.refunded_qty, 0))) 
       FROM sale_items si 
       WHERE si.sale_id = s.id) as rough_profit,
      (SELECT GROUP_CONCAT(DISTINCT si.category) 
       FROM sale_items si 
       WHERE si.sale_id = s.id) as categories
     FROM sales s 
     ORDER BY s.sold_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Map the comma-separated string into an array for easier frontend use
      const formattedRows = rows.map(row => ({
        ...row,
        categories: row.categories ? row.categories.split(',') : []
      }));
      
      res.json(formattedRows);
    }
  );
};

exports.getMonthlyProfit = (req, res) => {
  db.all(
    `SELECT 
        strftime('%Y-%m', s.sold_at) AS month,
       SUM(si.total - (COALESCE(si.cost, 0) * si.qty)) AS total_profit,
        /* Use COALESCE to treat null cost as 0, avoiding negative/NaN results */
        SUM(si.total - (COALESCE(si.cost, 0) * si.qty)) AS total_profit
     FROM sales s
     JOIN sale_items si ON s.id = si.sale_id
     WHERE s.status != 'refunded'
       AND s.sold_at >= date('now', '-3 months')
     GROUP BY month
     ORDER BY month ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
};

// GET /api/sales/:id
exports.getSaleById = (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM sales WHERE id = ?`, [id], (err, sale) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    db.all(
      `SELECT si.*, 
       CASE 
         WHEN si.product_name IS NOT NULL THEN si.product_name 
         WHEN p.name IS NOT NULL THEN p.name 
         WHEN si.category = 'load' OR (si.product_id IS NULL AND si.category IS NULL) THEN 'Direct Load'
         ELSE 'Unknown Product'
       END AS product_name,
       p.attributes, 
       COALESCE(si.category, p.category, CASE WHEN si.product_id IS NULL THEN 'load' END) as category
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [id],
      (err2, items) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ sale, items });
      }
    );
  });
};
// Add to server/controllers/saleController.js


// This query handles: Total Revenue, Profit, Count, Discount
exports.getAnalytics = (req, res) => {
  const query = `
        SELECT 
            COUNT(id) as saleCount,
            SUM(grand_total) as totalRevenue,
            SUM(discount) as totalDiscount,
            SUM(rough_profit) as totalProfit 
        FROM (
            SELECT s.*, 
            (SELECT SUM((si.price - si.cost) * (si.qty - COALESCE(si.refunded_qty, 0))) 
             FROM sale_items si WHERE si.sale_id = s.id) as rough_profit
            FROM sales s 
            WHERE s.status = 'completed'
        )
    `;

  db.get(query, [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
};


// POST /api/sales
exports.createSale = async (req, res) => {
  const {
    customer_id,
    customer_name,
    discount = 0,
    paid = 0,
    payment_method = 'cash',
    items = [],
    cost=0
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No sale items provided' });
  }

  try {
    // 1. Fetch relevant products from DB for validation and pricing
    const productIds = items.filter(i => i.product_id != null && !String(i.product_id).startsWith('load-')).map(i => i.product_id);

    const placeholders = productIds.length > 0 ? productIds.map(() => '?').join(',') : 'NULL';

    db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds, (err, dbProducts) => {
      if (err) return res.status(500).json({ error: err.message });

      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      // 2. Re-calculate total on SERVER side
      let calculatedSubtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        // Skip validation for direct-load items (either from Quick Load or Direct Upload)
        if (item.category === 'load' && (item.product_id === null || (typeof item.product_id === 'string' && item.product_id.startsWith('load-')))) {
          calculatedSubtotal += item.price;
          validatedItems.push({
            ...item,
            product_id: null,
            total: item.price,
            qty: item.qty || 1,
            product_name: item.product_name || item.name || "SIM Load",
            category: 'load'
          });
          continue;
        }

        const dbProd = productMap.get(item.product_id);
        if (!dbProd) return res.status(400).json({ error: `Product ID ${item.product_id} not found` });
        if (dbProd.qty < item.qty) return res.status(400).json({ error: `Insufficient stock for ${dbProd.name}` });

        const itemTotal = dbProd.price * item.qty;
        calculatedSubtotal += itemTotal;
        validatedItems.push({
          ...item,
          price: dbProd.price,
          total: itemTotal,
          product_name: dbProd.name,
          category: dbProd.category
        });
      }

      const calculatedGrandTotal = Math.max(calculatedSubtotal - discount, 0);

      // Carry on with saving...
      const now = new Date();
      const sold_at = now.toISOString(); // 🔥 Explicit UTC ISO String
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.getTime().toString().slice(-6);
      const rand = Math.floor(1000 + Math.random() * 9000);
      const invoice_no = `INV-${dateStr}-${timeStr}-${rand}`;
      const user_email = req.user ? req.user.email : 'Unknown';

      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run(
          `INSERT INTO sales (invoice_no, customer_id, customer_name, user_email, total, discount, tax, grand_total, paid, payment_method, sold_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoice_no, customer_id, customer_name, user_email, calculatedSubtotal, discount, 0, calculatedGrandTotal, calculatedGrandTotal, payment_method, sold_at],
          function (err2) {
            if (err2) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err2.message });
            }
            const saleId = this.lastID;
            const stmt = db.prepare(`INSERT INTO sale_items (sale_id, product_id, qty, price, total, product_name, category,cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

            for (const item of validatedItems) {
              stmt.run([saleId, item.product_id, item.qty, item.price, item.total, item.product_name, item.category, item.cost || 0]);
              if (item.product_id) {
                db.run(`UPDATE products SET qty = qty - ? WHERE id = ?`, [item.qty, item.product_id], (errU) => {
                  if (!errU && item.category === 'repair') {
                    // Check if qty hit 0 and delete
                    db.get("SELECT qty FROM products WHERE id = ?", [item.product_id], (errG, row) => {
                      if (!errG && row && row.qty <= 0) {
                        db.run("DELETE FROM products WHERE id = ?", [item.product_id]);
                      }
                    });
                  }
                });
              }
            }
            stmt.finalize();
            db.run("COMMIT", (err4) => {
              if (err4) return res.status(500).json({ error: err4.message });
              res.status(201).json({ invoice_no, sale_id: saleId, grand_total: calculatedGrandTotal });
            });
          }
        );
      });
    });
  } catch (error) {
    console.error("Sale Processing Error:", error);
    res.status(500).json({ error: "Internal server error during sale processing" });
  }
};

// POST /api/sales/save-image
exports.saveSaleImage = (req, res) => {
  const { saleId, imageData, invoiceNo } = req.body;
  if (!saleId || !imageData) {
    return res.status(400).json({ error: 'Missing saleId or imageData' });
  }

  try {
    // Remove header from base64 string
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");

    const dir = path.join(userData, 'receipt_images');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = `receipt_${invoiceNo || saleId}_${Date.now()}.png`;
    const filePath = path.join(dir, fileName);

    fs.writeFile(filePath, base64Data, 'base64', (err) => {
      if (err) {
        console.error("Error saving receipt image:", err);
        return res.status(500).json({ error: 'Failed to save image file' });
      }
      res.json({
        message: 'Image saved successfully',
        fileName,
        path: filePath
      });
    });
  } catch (err) {
    console.error("Save image error:", err);
    res.status(500).json({ error: err.message });
  }
};


// PUT /api/sales/:id/refund
exports.refundSale = (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM sales WHERE id = ?`, [id], (err, sale) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    if (sale.status === 'refunded') return res.status(400).json({ error: 'Sale is already refunded' });

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.run(`UPDATE sales SET status = 'refunded', total = 0, tax = 0, grand_total = 0, paid = 0 WHERE id = ?`, [id], (err2) => {
        if (err2) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: err2.message });
        }


        db.all(`SELECT * FROM sale_items WHERE sale_id = ?`, [id], (err3, items) => {
          if (err3) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: err3.message });
          }

          let errorOccurred = false;
          for (const item of items) {
            const remainingToRefund = item.qty - (item.refunded_qty || 0);
            if (remainingToRefund > 0) {
              if (item.category !== 'load' && item.product_id) {
                db.run(
                  `UPDATE products SET qty = qty + ? WHERE id = ?`,
                  [remainingToRefund, item.product_id],
                  (err4) => {
                    if (err4) errorOccurred = true;
                  }
                );
              }
              // Mark as fully refunded in sale_item records
              db.run(
                `UPDATE sale_items SET refunded_qty = qty WHERE id = ?`,
                [item.id]
              );
            }
          }

          if (errorOccurred) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: "Failed to restore stock" });
          }

          db.run("COMMIT", (err5) => {
            if (err5) return res.status(500).json({ error: err5.message });
            // console.log(`Sale Refunded: ID ${id}`);
            res.json({ message: 'Sale fully refunded & remaining stock restored', id: Number(id) });
          });
        });
      });
    });
  });
};

// PUT /api/sales/:id/items/:itemId/refund
exports.refundItem = (req, res) => {
  const { id, itemId } = req.params;
  const { qtyToRefund = 1 } = req.body;

  db.get(`SELECT s.*, si.qty, si.refunded_qty, si.product_id, si.price, si.category 
          FROM sales s 
          JOIN sale_items si ON s.id = si.sale_id
          WHERE s.id = ? AND si.id = ?`, [id, itemId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Sale item not found' });

    const availableToRefund = row.qty - (row.refunded_qty || 0);
    if (qtyToRefund > availableToRefund) {
      return res.status(400).json({ error: `Only ${availableToRefund} items remaining to refund` });
    }

    // Proportional refund logic
    const subtotalReduction = row.price * qtyToRefund;

    // Calculate how much discount was applied to this specific reduction
    // discountRatio = total_discount / original_subtotal
    const discountRatio = (row.discount || 0) / (row.total || 1);
    const discountReduction = subtotalReduction * discountRatio;
    const grandTotalReduction = subtotalReduction - discountReduction;

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // 1. Update refunded_qty in sale_items
      db.run(
        `UPDATE sale_items SET refunded_qty = COALESCE(refunded_qty, 0) + ? WHERE id = ?`,
        [qtyToRefund, itemId],
        (err1) => {
          if (err1) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: err1.message });
          }

          // 2. Restore stock in products
          if (row.category !== 'load' && row.product_id) {
            db.run(
              `UPDATE products SET qty = qty + ? WHERE id = ?`,
              [qtyToRefund, row.product_id],
              (err2) => {
                if (err2) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: err2.message });
                }
                next();
              }
            );
          } else {
            next();
          }

          function next() {
            // 3. Adjust Sale Totals, Discounts, and Status
            db.run(
              `UPDATE sales 
                 SET total = total - ?, 
                     discount = discount - ?,
                     grand_total = grand_total - ?,
                     status = 'partial_refund' 
                 WHERE id = ? AND status != 'refunded'`,
              [subtotalReduction, discountReduction, grandTotalReduction, id],
              (err3) => {
                if (err3) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: err3.message });
                }

                // Adjust 'paid' assuming cash/card refund matches grand total reduction
                db.run(
                  "UPDATE sales SET paid = paid - ? WHERE id = ?",
                  [grandTotalReduction, id]
                );

                // Robust status check: if no items left to refund, update status and zero out financial fields
                db.run(
                  `UPDATE sales 
                     SET status = 'refunded', total = 0, discount = 0, tax = 0, grand_total = 0, paid = 0 
                     WHERE id = ? AND (SELECT SUM(qty - COALESCE(refunded_qty, 0)) FROM sale_items WHERE sale_id = ?) = 0`,
                  [id, id],
                  () => {
                    db.run("COMMIT", (err4) => {
                      if (err4) return res.status(500).json({ error: err4.message });
                      res.json({
                        message: 'Item(s) refunded successfully',
                        refundedQty: qtyToRefund,
                        subtotalReduction,
                        discountReduction,
                        grandTotalReduction
                      });
                    });
                  }
                );
              }
            );
          }
        }
      );
    }
    );
  });
};

// DELETE /api/sales/:id
exports.deleteSale = (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM sales WHERE id = ?`, [id], (err, sale) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    // first restore stock before deleting
    db.all(`SELECT * FROM sale_items WHERE sale_id = ?`, [id], (err2, items) => {
      if (err2) return res.status(500).json({ error: err2.message });

      for (const item of items) {
        db.run(
          `UPDATE products SET qty = qty + ? WHERE id = ?`,
          [item.qty, item.product_id],
          (err3) => {
            if (err3) console.warn("Stock restore failed:", err3.message);
          }
        );
      }

      db.run(`DELETE FROM sale_items WHERE sale_id = ?`, [id], function (err4) {
        if (err4) return res.status(500).json({ error: err4.message });

        db.run(`DELETE FROM sales WHERE id = ?`, [id], function (err5) {
          if (err5) return res.status(500).json({ error: err5.message });
          // console.log(`Sale Deleted: ID ${id}`);
          res.json({ message: 'Sale deleted successfully & stock restored', id: Number(id) });
        });
      });
    });
  });
};

// GET /api/sales/stats/top-products?limit=5&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
exports.getTopProducts = (req, res) => {
  const limit = req.query.limit || 5;
  const { startDate, endDate } = req.query;

  let query = `
    SELECT COALESCE(si.product_name, p.name) as name, 
           SUM(si.qty - COALESCE(si.refunded_qty, 0)) as total_qty, 
           SUM(si.total) as total_revenue
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'refunded'
  `;
  const params = [];

  if (startDate && endDate) {
    // Standardize ISO string comparison in SQLite
    query += ` AND date(s.sold_at) >= date(?) AND date(s.sold_at) <= date(?)`;
    params.push(startDate, endDate);
  }

  query += `
    GROUP BY COALESCE(si.product_name, p.name)
    HAVING total_qty > 0
    ORDER BY total_qty DESC
    LIMIT ?
  `;
  params.push(limit);

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// GET /api/sales/stats/category?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
exports.getCategoryStats = (req, res) => {
  const { startDate, endDate } = req.query;

  let query = `
    SELECT COALESCE(si.category, p.category, 'General') as category, 
           SUM(si.qty - COALESCE(si.refunded_qty, 0)) as total_qty, 
           SUM(si.total) as total_revenue
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'refunded'
  `;
  const params = [];

  if (startDate && endDate) {
    query += ` AND date(s.sold_at) >= date(?) AND date(s.sold_at) <= date(?)`;
    params.push(startDate, endDate);
  }

  query += `
    GROUP BY COALESCE(si.category, p.category, 'General')
    HAVING total_revenue > 0
    ORDER BY total_revenue DESC
  `;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// GET /api/sales/stats/brand?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
exports.getBrandStats = (req, res) => {
  const { startDate, endDate } = req.query;

  let query = `
    SELECT COALESCE(p.company, 'Load') as brand, 
           SUM(si.qty - COALESCE(si.refunded_qty, 0)) as total_qty, 
           SUM(si.total) as total_revenue
    FROM sale_items si
    LEFT JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'refunded'
  `;
  const params = [];

  if (startDate && endDate) {
    query += ` AND date(s.sold_at) >= date(?) AND date(s.sold_at) <= date(?)`;
    params.push(startDate, endDate);
  }

  query += `
    GROUP BY COALESCE(p.company, 'Load')
    HAVING total_revenue > 0
    ORDER BY total_revenue DESC
    LIMIT 10
  `;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};