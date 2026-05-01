import { query } from '../db.js';

export async function getInventory(storeId) {
  const sql = storeId
    ? `SELECT i.id, i.quantity, i.low_stock, i.updated_at,
              p.id AS product_id, p.name AS product, p.category, p.unit,
              s.id AS store_id, s.name AS store, s.location
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN stores s ON s.id = i.store_id
       WHERE i.store_id = $1
       ORDER BY p.category, p.name`
    : `SELECT i.id, i.quantity, i.low_stock, i.updated_at,
              p.id AS product_id, p.name AS product, p.category, p.unit,
              s.id AS store_id, s.name AS store, s.location
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN stores s ON s.id = i.store_id
       ORDER BY s.name, p.category, p.name`;

  const { rows } = storeId ? await query(sql, [storeId]) : await query(sql);
  return rows;
}

export async function updateStock(id, quantity, low_stock) {
  const { rows } = await query(
    `UPDATE inventory
     SET quantity = $1, low_stock = COALESCE($2, low_stock), updated_at = NOW()
     WHERE id = $3
     RETURNING id, store_id, product_id, quantity, low_stock, updated_at`,
    [quantity, low_stock, id]
  );
  if (!rows[0]) throw { status: 404, message: 'Inventory record not found' };
  return rows[0];
}

export async function upsertInventory(store_id, product_id, quantity, low_stock = 10) {
  await query(
    `INSERT INTO inventory (store_id, product_id, quantity, low_stock)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (store_id, product_id)
     DO UPDATE SET quantity = $3, low_stock = $4, updated_at = NOW()`,
    [store_id, product_id, quantity, low_stock]
  );
  
  const { rows } = await query(
    `SELECT i.id, i.quantity, i.low_stock, i.updated_at,
            p.id AS product_id, p.name AS product, p.category, p.unit,
            s.id AS store_id, s.name AS store, s.location
     FROM inventory i
     JOIN products p ON p.id = i.product_id
     JOIN stores s ON s.id = i.store_id
     WHERE i.store_id = $1 AND i.product_id = $2`,
    [store_id, product_id]
  );
  return rows[0];
}

export async function getLowStock(storeId) {
  const sql = storeId
    ? `SELECT i.id, i.quantity, i.low_stock,
              p.name AS product, p.category, p.unit,
              s.name AS store, s.id AS store_id
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN stores s ON s.id = i.store_id
       WHERE i.store_id = $1 AND i.quantity <= i.low_stock
       ORDER BY (i.quantity::float / NULLIF(i.low_stock, 0)) ASC`
    : `SELECT i.id, i.quantity, i.low_stock,
              p.name AS product, p.category, p.unit,
              s.name AS store, s.id AS store_id
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN stores s ON s.id = i.store_id
       WHERE i.quantity <= i.low_stock
       ORDER BY (i.quantity::float / NULLIF(i.low_stock, 0)) ASC`;

  const { rows } = storeId ? await query(sql, [storeId]) : await query(sql);
  return rows;
}

export async function getAllStores() {
  const { rows } = await query('SELECT id, name, location, created_at FROM stores ORDER BY name');
  return rows;
}

export async function createStore({ name, location }) {
  const { rows } = await query(
    'INSERT INTO stores (name, location) VALUES ($1, $2) RETURNING id, name, location, created_at',
    [name, location]
  );
  return rows[0];
}

export async function getAllProducts() {
  const { rows } = await query(
    'SELECT id, name, category, unit, created_at FROM products ORDER BY category, name'
  );
  return rows;
}

export async function createProduct({ name, category, unit }) {
  const { rows } = await query(
    'INSERT INTO products (name, category, unit) VALUES ($1, $2, $3) RETURNING id, name, category, unit',
    [name, category, unit ?? 'pcs']
  );
  return rows[0];
}
