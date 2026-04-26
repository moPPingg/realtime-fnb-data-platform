import { Router } from 'express';
import * as inventoryCtrl from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

/**
 * The router factory receives the Socket.io instance so the inventory
 * controller can emit real-time events.
 */
export function createInventoryRouter(io) {
  const router = Router();

  router.use(authenticate);

  router.get('/low-stock', authorize('view_dashboard'), inventoryCtrl.lowStock);
  router.get('/', authorize('view_dashboard'), inventoryCtrl.list);
  router.post('/', authorize('manage_inventory'), inventoryCtrl.upsert(io));
  router.put('/:id', authorize('manage_inventory'), inventoryCtrl.updateStock(io));

  return router;
}
