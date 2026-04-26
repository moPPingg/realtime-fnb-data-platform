import * as inventoryService from '../services/inventoryService.js';

export async function listProducts(req, res, next) {
  try {
    res.json(await inventoryService.getAllProducts());
  } catch (err) { next(err); }
}

export async function createProduct(req, res, next) {
  try {
    const { name, category, unit } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.status(201).json(await inventoryService.createProduct({ name, category, unit }));
  } catch (err) { next(err); }
}
