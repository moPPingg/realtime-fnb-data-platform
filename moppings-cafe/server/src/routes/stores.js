import { Router } from 'express';
import * as stores from '../controllers/storeController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', stores.listStores);
router.post('/', authorize('manage_inventory'), stores.createStore);

export default router;
