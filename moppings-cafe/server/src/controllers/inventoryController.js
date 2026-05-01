import * as inventoryService from '../services/inventoryService.js';
import { query } from '../db.js';

export async function list(req, res, next) {
  try {
    const { storeId } = req.query;
    
    if (req.user.role !== 'admin') {
      const effectiveStoreId = storeId || req.user.storeId;
      if (storeId && parseInt(storeId) !== req.user.storeId) {
        return res.status(403).json({ error: 'Access denied to this store' });
      }
      res.json(await inventoryService.getInventory(effectiveStoreId));
    } else {
      res.json(await inventoryService.getInventory(storeId));
    }
  } catch (err) { next(err); }
}

export async function lowStock(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      res.json(await inventoryService.getLowStock(req.user.storeId));
    } else {
      res.json(await inventoryService.getLowStock());
    }
  } catch (err) { next(err); }
}

export function updateStock(io) {
  return async (req, res, next) => {
    try {
      const { quantity, low_stock } = req.body;
      const { id } = req.params;

      if (quantity === undefined)
        return res.status(400).json({ error: 'quantity is required' });

      const { rows: [current] } = await query(
        'SELECT store_id, product_id, quantity FROM inventory WHERE id = $1',
        [id]
      );
      if (!current) {
        return res.status(404).json({ error: 'Inventory not found' });
      }

      if (req.user.role !== 'admin' && current.store_id !== req.user.storeId) {
        return res.status(403).json({ error: 'Access denied to this store' });
      }

      const changeAmount = quantity - current.quantity;

      const record = await inventoryService.updateStock(id, quantity, low_stock);

      if (changeAmount !== 0) {
        const type = changeAmount > 0 ? 'import' : 'sale';
        const { rows: [trans] } = await query(
          `INSERT INTO inventory_transactions (store_id, product_id, change_amount, type, created_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [current.store_id, current.product_id, changeAmount, type, req.user.id]
        );
        io.emit('transaction:created', trans);
      }

      io.emit('inventory:updated', record);

      res.json(record);
    } catch (err) { next(err); }
  };
}

export function upsert(io) {
  return async (req, res, next) => {
    try {
      const { store_id, product_id, quantity, low_stock } = req.body;
      if (!store_id || !product_id || quantity === undefined)
        return res.status(400).json({ error: 'store_id, product_id, quantity are required' });

      if (req.user.role !== 'admin' && store_id !== req.user.storeId) {
        return res.status(403).json({ error: 'Cannot add inventory to other stores' });
      }

      const { rows: [prev] } = await query(
        'SELECT quantity FROM inventory WHERE store_id = $1 AND product_id = $2',
        [store_id, product_id]
      );
      
      const prevQty = prev?.quantity || 0;
      const changeAmount = quantity - prevQty;

      const record = await inventoryService.upsertInventory(store_id, product_id, quantity, low_stock);

      if (changeAmount !== 0) {
        const type = changeAmount > 0 ? 'import' : 'sale';
        const { rows: [trans] } = await query(
          `INSERT INTO inventory_transactions (store_id, product_id, change_amount, type, created_by)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [store_id, product_id, changeAmount, type, req.user.id]
        );
        io.emit('transaction:created', trans);
      }

      io.emit('inventory:updated', record);
      res.status(201).json(record);
    } catch (err) { next(err); }
  };
}
