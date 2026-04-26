import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected client error', err.message);
});

/**
 * Execute a parameterised query.
 * @param {string} text  SQL statement
 * @param {any[]}  params Query parameters
 */
export const query = (text, params) => pool.query(text, params);

export default pool;
