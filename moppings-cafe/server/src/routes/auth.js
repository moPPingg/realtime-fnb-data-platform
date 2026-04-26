import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/login', auth.login);
router.get('/me', authenticate, auth.me);

export default router;
