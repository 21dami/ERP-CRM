import { Router } from 'express';
import OrderController from '../controllers/OrderController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('orders.view'), OrderController.getAll);
router.get('/:id', requirePermission('orders.view'), OrderController.getById);
router.post('/', requirePermission('orders.create'), OrderController.create);
router.put('/:id', requirePermission('orders.update'), OrderController.update);
router.patch('/:id/status', requirePermission('orders.update_status'), OrderController.updateStatus);
router.delete('/:id', requirePermission('orders.delete'), OrderController.delete);

export default router;
