import { query } from '../db.js';

export async function getAllRoles() {
  const { rows } = await query(
    `SELECT r.id, r.name, r.description, r.created_at,
            COALESCE(
              json_agg(p.key) FILTER (WHERE p.key IS NOT NULL), '[]'
            ) AS permissions
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     LEFT JOIN permissions p ON p.id = rp.permission_id
     GROUP BY r.id
     ORDER BY r.id`
  );
  return rows;
}

export async function createRole({ name, description }) {
  const { rows } = await query(
    `INSERT INTO roles (name, description) VALUES ($1, $2)
     RETURNING id, name, description, created_at`,
    [name, description]
  );
  return rows[0];
}

export async function updateRole(id, { name, description }) {
  const { rows } = await query(
    `UPDATE roles SET name = $1, description = $2 WHERE id = $3
     RETURNING id, name, description`,
    [name, description, id]
  );
  if (!rows[0]) throw { status: 404, message: 'Role not found' };
  return rows[0];
}

export async function deleteRole(id) {
  const { rowCount } = await query('DELETE FROM roles WHERE id = $1', [id]);
  if (rowCount === 0) throw { status: 404, message: 'Role not found' };
}

export async function setRolePermissions(roleId, permissionIds) {
  // Replace all permissions for this role atomically
  await query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
  if (permissionIds.length > 0) {
    const values = permissionIds.map((pid, i) => `($1, $${i + 2})`).join(', ');
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
      [roleId, ...permissionIds]
    );
  }
  return getRolePermissions(roleId);
}

export async function getRolePermissions(roleId) {
  const { rows } = await query(
    `SELECT p.id, p.key, p.label
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id = $1`,
    [roleId]
  );
  return rows;
}
