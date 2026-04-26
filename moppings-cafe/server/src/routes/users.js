import { Router } from 'express';
import * as users from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.use(authorize('manage_users'));

router.get('/', users.list);
router.get('/:id', users.getOne);
router.post('/', users.create);
router.put('/:id', users.update);
router.delete('/:id', users.remove);

export default router;
