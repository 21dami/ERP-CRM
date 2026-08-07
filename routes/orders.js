import { Router } from 'express';
import OrderController from '../controllers/OrderController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', OrderController.getAll);
router.get('/:id', OrderController.getById);
router.post('/', authorize('admin', 'sales'), OrderController.create);
router.put('/:id', authorize('admin', 'sales'), OrderController.update);
router.patch('/:id/status', authorize('admin', 'sales', 'warehouse'), OrderController.updateStatus);
router.delete('/:id', authorize('admin'), OrderController.delete);

export default router;
