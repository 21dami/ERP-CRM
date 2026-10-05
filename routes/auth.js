import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.get('/permissions', authenticate, AuthController.permissions);
router.post('/change-password', authenticate, AuthController.changePassword);
router.post('/impersonate/:userId', authenticate, requirePermission('users.impersonate'), AuthController.impersonate);

export default router;
