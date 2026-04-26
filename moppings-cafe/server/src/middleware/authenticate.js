import jwt from 'jsonwebtoken';
import { query } from '../db.js';

/**
 * Verify the Bearer token and attach req.user = { id, name, email, role, permissions[] }
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh permissions for this user's role
    const { rows } = await query(
      `SELECT p.key
       FROM users u
       JOIN roles r ON r.id = u.role_id
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE u.id = $1 AND u.active = true`,
      [payload.userId]
    );

    req.user = {
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      permissions: rows.map((r) => r.key),
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
