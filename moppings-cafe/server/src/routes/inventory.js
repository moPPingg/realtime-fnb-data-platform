import { Router } from 'express';
import * as inventoryCtrl from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireStoreAccess } from '../middleware/storeAccess.js';

export function createInventoryRouter(io) {
  const router = Router();

  router.use(authenticate);

  router.get('/low-stock', authorize('view_dashboard'), requireStoreAccess, inventoryCtrl.lowStock);
  router.get('/', authorize('view_dashboard'), requireStoreAccess, inventoryCtrl.list);
  router.post('/', authorize('manage_inventory'), inventoryCtrl.upsert(io));
  router.put('/:id', authorize('manage_inventory'), inventoryCtrl.updateStock(io));

  return router;
}
