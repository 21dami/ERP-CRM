import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.post('/change-password', authenticate, AuthController.changePassword);
router.post('/impersonate/:userId', authenticate, authorize('admin'), AuthController.impersonate);

export default router;
