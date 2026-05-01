import { query } from '../db.js';

export async function createAuditLog({ userId, action, tableName, recordId, oldValue, newValue, ipAddress }) {
  const { rows } = await query(
    `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, action, tableName, recordId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, ipAddress]
  );
  return rows[0];
}

export async function getAuditLogs(filters = {}) {
  const { userId, action, tableName, startDate, endDate, limit = 100, offset = 0 } = filters;
  
  const conditions = [];
  const params = [];
  let i = 1;

  if (userId) { conditions.push(`al.user_id = $${i++}`); params.push(userId); }
  if (action) { conditions.push(`al.action = $${i++}`); params.push(action); }
  if (tableName) { conditions.push(`al.table_name = $${i++}`); params.push(tableName); }
  if (startDate) { conditions.push(`al.created_at >= $${i++}`); params.push(startDate); }
  if (endDate) { conditions.push(`al.created_at <= $${i++}`); params.push(endDate); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(`
    SELECT al.*, u.name AS user_name, u.email AS user_email
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT $${i++} OFFSET $${i++}
  `, [...params, limit, offset]);

  return rows;
}

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  VIEW: 'VIEW'
};