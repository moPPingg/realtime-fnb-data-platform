import { query } from '../db.js';

export async function getAllPermissions() {
  const { rows } = await query(
    'SELECT id, key, label, created_at FROM permissions ORDER BY key'
  );
  return rows;
}

export async function createPermission({ key, label }) {
  const { rows } = await query(
    `INSERT INTO permissions (key, label) VALUES ($1, $2)
     RETURNING id, key, label, created_at`,
    [key, label]
  );
  return rows[0];
}

export async function updatePermission(id, { key, label }) {
  const { rows } = await query(
    `UPDATE permissions SET key = $1, label = $2 WHERE id = $3
     RETURNING id, key, label`,
    [key, label, id]
  );
  if (!rows[0]) throw { status: 404, message: 'Permission not found' };
  return rows[0];
}

export async function deletePermission(id) {
  const { rowCount } = await query('DELETE FROM permissions WHERE id = $1', [id]);
  if (rowCount === 0) throw { status: 404, message: 'Permission not found' };
}
