import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin'), UserController.getAll);
router.get('/count', authorize('admin'), UserController.count);
router.get('/:id', authorize('admin'), UserController.getById);
router.post('/', authorize('admin'), UserController.create);
router.put('/:id', authorize('admin'), UserController.update);
router.delete('/:id', authorize('admin'), UserController.delete);

export default router;
