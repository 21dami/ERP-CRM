import { Router } from 'express';
import SalesController from '../controllers/SalesController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('sales.view'), SalesController.getAll);
router.get('/stats', requirePermission('sales.view'), SalesController.getStats);
router.get('/monthly-revenue', requirePermission('dashboard.view'), SalesController.getMonthlyRevenue);
router.get('/top-products', requirePermission('sales.view'), SalesController.getTopProducts);
router.get('/:id', requirePermission('sales.view'), SalesController.getById);
router.post('/', requirePermission('sales.create'), SalesController.create);
router.patch('/:id/refund', requirePermission('sales.refund'), SalesController.refund);
router.delete('/:id', requirePermission('sales.delete'), SalesController.delete);

export default router;
