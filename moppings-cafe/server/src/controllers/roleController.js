import * as roleService from '../services/roleService.js';

export async function list(req, res, next) {
  try {
    res.json(await roleService.getAllRoles());
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await roleService.createRole({ name, description }));
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    res.json(await roleService.updateRole(req.params.id, req.body));
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await roleService.deleteRole(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

export async function setPermissions(req, res, next) {
  try {
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds))
      return res.status(400).json({ error: 'permissionIds must be an array' });
    res.json(await roleService.setRolePermissions(req.params.id, permissionIds));
  } catch (err) { next(err); }
}

export async function getPermissions(req, res, next) {
  try {
    res.json(await roleService.getRolePermissions(req.params.id));
  } catch (err) { next(err); }
}
