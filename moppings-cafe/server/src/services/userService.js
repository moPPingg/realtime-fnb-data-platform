import bcrypt from 'bcryptjs';
import { query } from '../db.js';

export async function getAllUsers() {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.active, u.created_at,
            r.id AS role_id, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     ORDER BY u.created_at DESC`
  );
  return rows;
}

export async function getUserById(id) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.active, u.created_at,
            r.id AS role_id, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
  if (!rows[0]) throw { status: 404, message: 'User not found' };
  return rows[0];
}

export async function createUser({ name, email, password, role_id }) {
  const hashed = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (name, email, password, role_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role_id, active, created_at`,
    [name, email, hashed, role_id]
  );
  return rows[0];
}

export async function updateUser(id, { name, email, role_id, active, password }) {
  // Build dynamic SET clause
  const fields = [];
  const values = [];
  let i = 1;

  if (name !== undefined)    { fields.push(`name = $${i++}`);    values.push(name); }
  if (email !== undefined)   { fields.push(`email = $${i++}`);   values.push(email); }
  if (role_id !== undefined) { fields.push(`role_id = $${i++}`); values.push(role_id); }
  if (active !== undefined)  { fields.push(`active = $${i++}`);  values.push(active); }
  if (password)              { fields.push(`password = $${i++}`); values.push(await bcrypt.hash(password, 10)); }
  fields.push(`updated_at = NOW()`);

  values.push(id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, name, email, role_id, active`,
    values
  );
  if (!rows[0]) throw { status: 404, message: 'User not found' };
  return rows[0];
}

export async function deleteUser(id) {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
  if (rowCount === 0) throw { status: 404, message: 'User not found' };
}
