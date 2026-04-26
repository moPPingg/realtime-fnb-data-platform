import * as permissionService from '../services/permissionService.js';

export async function list(req, res, next) {
  try {
    res.json(await permissionService.getAllPermissions());
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { key, label } = req.body;
    if (!key || !label) return res.status(400).json({ error: 'key and label are required' });
    res.status(201).json(await permissionService.createPermission({ key, label }));
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    res.json(await permissionService.updatePermission(req.params.id, req.body));
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await permissionService.deletePermission(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}
