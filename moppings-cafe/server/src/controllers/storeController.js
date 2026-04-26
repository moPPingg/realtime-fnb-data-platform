import * as inventoryService from '../services/inventoryService.js';

export async function listStores(req, res, next) {
  try {
    res.json(await inventoryService.getAllStores());
  } catch (err) { next(err); }
}

export async function createStore(req, res, next) {
  try {
    const { name, location } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await inventoryService.createStore({ name, location }));
  } catch (err) { next(err); }
}
