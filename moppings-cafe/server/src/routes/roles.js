import { Router } from 'express';
import * as roles from '../controllers/roleController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.use(authenticate);

// Read available to anyone authenticated
router.get('/', roles.list);
router.get('/:id/permissions', roles.getPermissions);

// Mutation — admin / manager with manage_users
router.post('/', authorize('manage_users'), roles.create);
router.put('/:id', authorize('manage_users'), roles.update);
router.delete('/:id', authorize('manage_users'), roles.remove);
router.put('/:id/permissions', authorize('manage_users'), roles.setPermissions);

export default router;
