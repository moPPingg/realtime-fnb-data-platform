import { query } from '../db.js';

export async function getTopSellingProducts(limit = 10, storeId = null) {
  const sql = storeId
    ? `SELECT 
        p.id,
        p.name AS product,
        p.category,
        p.unit,
        SUM(-it.change_amount) AS total_sold,
        COUNT(DISTINCT it.store_id) AS stores_sold
       FROM inventory_transactions it
       JOIN products p ON p.id = it.product_id
       WHERE it.type = 'sale' AND it.store_id = $2
       GROUP BY p.id, p.name, p.category, p.unit
       ORDER BY total_sold DESC
       LIMIT $1`
    : `SELECT 
        p.id,
        p.name AS product,
        p.category,
        p.unit,
        SUM(-it.change_amount) AS total_sold,
        COUNT(DISTINCT it.store_id) AS stores_sold
       FROM inventory_transactions it
       JOIN products p ON p.id = it.product_id
       WHERE it.type = 'sale'
       GROUP BY p.id, p.name, p.category, p.unit
       ORDER BY total_sold DESC
       LIMIT $1`;

  const params = storeId ? [limit, storeId] : [limit];
  const { rows } = await query(sql, params);
  return rows;
}

export async function getLowStockItems(storeId = null) {
  const sql = storeId
    ? `SELECT 
        i.id,
        i.quantity,
        i.low_stock,
        s.id AS store_id,
        s.name AS store,
        p.id AS product_id,
        p.name AS product,
        p.category,
        p.unit,
        p.price
       FROM inventory i
       JOIN stores s ON s.id = i.store_id
       JOIN products p ON p.id = i.product_id
       WHERE i.store_id = $1 AND i.quantity <= i.low_stock
       ORDER BY i.quantity ASC`
    : `SELECT 
        i.id,
        i.quantity,
        i.low_stock,
        s.id AS store_id,
        s.name AS store,
        p.id AS product_id,
        p.name AS product,
        p.category,
        p.unit,
        p.price
       FROM inventory i
       JOIN stores s ON s.id = i.store_id
       JOIN products p ON p.id = i.product_id
       WHERE i.quantity <= i.low_stock
       ORDER BY i.quantity ASC`;

  const { rows } = storeId ? await query(sql, [storeId]) : await query(sql);
  return rows;
}

export async function getInventoryByStore() {
  const { rows } = await query(`
    SELECT 
      s.id AS store_id,
      s.name AS store,
      s.location,
      COUNT(i.id) AS product_count,
      SUM(i.quantity) AS total_quantity,
      SUM(CASE WHEN i.quantity <= i.low_stock THEN 1 ELSE 0 END) AS low_stock_count
    FROM stores s
    JOIN inventory i ON i.store_id = s.id
    GROUP BY s.id, s.name, s.location
    ORDER BY s.id
  `);
  return rows;
}

export async function getStoreComparison() {
  const { rows } = await query(`
    SELECT 
      s.id AS store_id,
      s.name AS store,
      COALESCE(SUM(i.quantity), 0) AS total_quantity,
      COALESCE(AVG(i.quantity), 0) AS avg_quantity,
      COUNT(i.id) AS product_count
    FROM stores s
    LEFT JOIN inventory i ON i.store_id = s.id
    GROUP BY s.id, s.name
    ORDER BY total_quantity DESC
  `);
  return rows;
}

export async function getCategoryBreakdown() {
  const { rows } = await query(`
    SELECT 
      p.category,
      COUNT(p.id) AS product_count,
      SUM(i.quantity) AS total_stock,
      AVG(i.quantity) AS avg_stock
    FROM products p
    JOIN inventory i ON i.product_id = p.id
    GROUP BY p.category
    ORDER BY total_stock DESC
  `);
  return rows;
}

export async function getInventoryValueByStore() {
  const { rows } = await query(`
    SELECT 
      s.id AS store_id,
      s.name AS store,
      SUM(i.quantity * p.price) AS total_value
    FROM stores s
    JOIN inventory i ON i.store_id = s.id
    JOIN products p ON p.id = i.product_id
    GROUP BY s.id, s.name
    ORDER BY total_value DESC
  `);
  return rows;
}

export async function getTransactionSummary(days = 30) {
  const { rows } = await query(`
    SELECT 
      type,
      COUNT(*) AS count,
      SUM(change_amount) AS net_change,
      AVG(ABS(change_amount)) AS avg_amount
    FROM inventory_transactions
    WHERE created_at >= NOW() - INTERVAL '1 day' * $1
    GROUP BY type
    ORDER BY count DESC
  `, [days]);
  return rows;
}

export async function getSalesOverTime(days = 30) {
  const { rows } = await query(`
    SELECT 
      DATE(created_at) AS date,
      SUM(-change_amount) AS total_sales
    FROM inventory_transactions
    WHERE type = 'sale' AND created_at >= NOW() - INTERVAL '1 day' * $1
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [days]);
  return rows;
}

export async function getImportsOverTime(days = 30) {
  const { rows } = await query(`
    SELECT 
      DATE(created_at) AS date,
      SUM(change_amount) AS total_imports
    FROM inventory_transactions
    WHERE type = 'import' AND created_at >= NOW() - INTERVAL '1 day' * $1
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `, [days]);
  return rows;
}

export async function getDashboardKPI(storeId = null) {
  const storeFilter = storeId ? `AND i.store_id = ${storeId}` : '';
  const userFilter = storeId ? `AND store_id = ${storeId}` : '';
  
  const { rows } = await query(`
    SELECT 
      (SELECT COUNT(*) FROM stores${storeId ? ' WHERE id = ' + storeId : ''}) AS store_count,
      (SELECT COUNT(*) FROM products) AS product_count,
      (SELECT COUNT(*) FROM users WHERE active = true${storeId ? ' AND store_id = ' + storeId : ''}) AS user_count,
      (SELECT SUM(quantity) FROM inventory i WHERE 1=1 ${storeFilter}) AS total_stock,
      (SELECT COUNT(*) FROM inventory i WHERE quantity <= low_stock ${storeFilter}) AS low_stock_count,
      (SELECT COUNT(*) FROM inventory_transactions WHERE type = 'sale' AND created_at >= NOW() - INTERVAL '1 day' ${userFilter}) AS daily_sales
  `);
  return rows[0];
}