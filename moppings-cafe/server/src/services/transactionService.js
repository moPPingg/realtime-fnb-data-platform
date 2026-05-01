import { query } from '../db.js';
import pool from '../db.js';

export async function listTransactions({ storeId, productId, type, limit = 100, offset = 0 }) {
  let sql = `
    SELECT 
      it.id,
      it.store_id,
      it.product_id,
      it.change_amount,
      it.type,
      it.created_by,
      it.created_at,
      s.name AS store,
      s.name AS store_name,
      p.name AS product,
      p.name AS product_name,
      p.category,
      p.unit,
      u.name AS created_by_name
    FROM inventory_transactions it
    JOIN stores s ON s.id = it.store_id
    JOIN products p ON p.id = it.product_id
    LEFT JOIN users u ON u.id = it.created_by
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (storeId) {
    sql += ` AND it.store_id = $${paramIndex}`;
    params.push(storeId);
    paramIndex++;
  }
  if (productId) {
    sql += ` AND it.product_id = $${paramIndex}`;
    params.push(productId);
    paramIndex++;
  }
  if (type) {
    sql += ` AND it.type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM').replace(/LEFT JOIN users.*/, '').replace(/ORDER BY.*$/, '');
  
  const [countResult, dataResult] = await Promise.all([
    query(countSql, params),
    query(`${sql} ORDER BY it.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, limit, offset])
  ]);

  return {
    data: dataResult.rows,
    count: parseInt(countResult.rows[0]?.count || 0)
  };
}

export async function createTransaction(storeId, productId, changeAmount, type, createdBy) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert the transaction
    const { rows: [trans] } = await client.query(
      `INSERT INTO inventory_transactions (store_id, product_id, change_amount, type, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [storeId, productId, changeAmount, type, createdBy]
    );

    // Update inventory quantity
    await client.query(
      `INSERT INTO inventory (store_id, product_id, quantity, low_stock)
       VALUES ($1, $2, $3, 10)
       ON CONFLICT (store_id, product_id)
       DO UPDATE SET quantity = GREATEST(0, inventory.quantity + $3), updated_at = NOW()`,
      [storeId, productId, changeAmount]
    );

    // Fetch updated inventory for return
    const { rows: [inventory] } = await client.query(
      `SELECT i.*, p.name AS product, s.name AS store
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN stores s ON s.id = i.store_id
       WHERE i.store_id = $1 AND i.product_id = $2`,
      [storeId, productId]
    );

    await client.query('COMMIT');
    return { transaction: trans, inventory };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getTransactionById(id) {
  const { rows } = await query(`
    SELECT 
      it.*,
      s.name AS store,
      p.name AS product,
      p.category,
      u.name AS created_by_name
    FROM inventory_transactions it
    JOIN stores s ON s.id = it.store_id
    JOIN products p ON p.id = it.product_id
    LEFT JOIN users u ON u.id = it.created_by
    WHERE it.id = $1
  `, [id]);
  return rows[0];
}

export async function getTransactionStats(storeId, productId) {
  const { rows } = await query(`
    SELECT 
      type,
      COUNT(*) AS count,
      SUM(change_amount) AS total_change,
      AVG(change_amount) AS avg_change,
      MIN(created_at) AS first_transaction,
      MAX(created_at) AS last_transaction
    FROM inventory_transactions
    WHERE ($1::int IS NULL OR store_id = $1)
      AND ($2::int IS NULL OR product_id = $2)
    GROUP BY type
  `, [storeId || null, productId || null]);
  return rows;
}