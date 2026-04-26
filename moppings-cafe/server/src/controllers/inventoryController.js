import * as inventoryService from '../services/inventoryService.js';

/** GET /inventory?storeId=1 */
export async function list(req, res, next) {
  try {
    const { storeId } = req.query;
    res.json(await inventoryService.getInventory(storeId));
  } catch (err) { next(err); }
}

/** GET /inventory/low-stock */
export async function lowStock(req, res, next) {
  try {
    res.json(await inventoryService.getLowStock());
  } catch (err) { next(err); }
}

/** PUT /inventory/:id  — emits socket event */
export function updateStock(io) {
  return async (req, res, next) => {
    try {
      const { quantity, low_stock } = req.body;
      if (quantity === undefined)
        return res.status(400).json({ error: 'quantity is required' });

      const record = await inventoryService.updateStock(req.params.id, quantity, low_stock);

      // Broadcast real-time update
      io.emit('inventory:updated', record);

      res.json(record);
    } catch (err) { next(err); }
  };
}

/** POST /inventory — upsert */
export function upsert(io) {
  return async (req, res, next) => {
    try {
      const { store_id, product_id, quantity, low_stock } = req.body;
      if (!store_id || !product_id || quantity === undefined)
        return res.status(400).json({ error: 'store_id, product_id, quantity are required' });

      const record = await inventoryService.upsertInventory(store_id, product_id, quantity, low_stock);
      io.emit('inventory:updated', record);
      res.status(201).json(record);
    } catch (err) { next(err); }
  };
}
