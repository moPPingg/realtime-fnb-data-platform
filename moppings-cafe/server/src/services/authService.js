import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

export async function login(email, password) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.password, u.active, u.store_id,
            r.name AS role,
            r.id AS role_id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email]
  );

  const user = rows[0];
  if (!user) throw { status: 401, message: 'Invalid credentials' };
  if (!user.active) throw { status: 403, message: 'Account is disabled' };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw { status: 401, message: 'Invalid credentials' };

  const { rows: permRows } = await query(
    `SELECT p.key
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1`,
    [user.role_id]
  );
  const permissions = permRows.map(r => r.key);

  const token = jwt.sign(
    { 
      userId: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      storeId: user.store_id 
    },
    JWT_SECRET,
    { expiresIn: 28800 }
  );

  return {
    token,
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      storeId: user.store_id,
      permissions 
    },
  };
}
