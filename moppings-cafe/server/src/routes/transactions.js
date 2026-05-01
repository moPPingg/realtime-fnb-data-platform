import { Router } from 'express';
import * as transactionCtrl from '../controllers/transactionController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export function createTransactionRouter(io) {
  const router = Router();

  router.use(authenticate);
  router.use(authorize('view_dashboard'));

  router.get('/', transactionCtrl.list);
  router.get('/stats', authorize('view_dashboard'), transactionCtrl.getStats);
  router.get('/:id', transactionCtrl.getById);
  router.post('/', authorize('manage_inventory'), transactionCtrl.create(io));

  return router;
}