import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.post('/change-password', authenticate, AuthController.changePassword);

export default router;
