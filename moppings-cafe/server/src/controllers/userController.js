import * as userService from '../services/userService.js';

export async function list(req, res, next) {
  try {
    res.json(await userService.getAllUsers());
  } catch (err) { next(err); }
}

export async function getOne(req, res, next) {
  try {
    res.json(await userService.getUserById(req.params.id));
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const { name, email, password, role_id } = req.body;
    if (!name || !email || !password || !role_id)
      return res.status(400).json({ error: 'name, email, password, role_id are required' });
    const user = await userService.createUser({ name, email, password, role_id });
    res.status(201).json(user);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    res.json(await userService.updateUser(req.params.id, req.body));
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}
