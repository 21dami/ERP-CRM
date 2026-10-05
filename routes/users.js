import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('users.view'), UserController.getAll);
router.get('/count', requirePermission('users.view'), UserController.count);
router.get('/:id', requirePermission('users.view'), UserController.getById);
router.post('/', requirePermission('users.create'), UserController.create);
router.put('/:id', requirePermission('users.update'), UserController.update);
router.delete('/:id', requirePermission('users.delete'), UserController.delete);

export default router;
