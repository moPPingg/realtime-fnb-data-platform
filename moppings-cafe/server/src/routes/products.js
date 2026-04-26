import { Router } from 'express';
import * as products from '../controllers/productController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', products.listProducts);
router.post('/', authorize('manage_inventory'), products.createProduct);

export default router;
