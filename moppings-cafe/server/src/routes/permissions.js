import { Router } from 'express';
import * as perms from '../controllers/permissionController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', perms.list);
router.post('/', authorize('manage_users'), perms.create);
router.put('/:id', authorize('manage_users'), perms.update);
router.delete('/:id', authorize('manage_users'), perms.remove);

export default router;
