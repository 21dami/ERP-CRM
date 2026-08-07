import { Router } from 'express';
import SalesController from '../controllers/SalesController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', SalesController.getAll);
router.get('/stats', SalesController.getStats);
router.get('/monthly-revenue', SalesController.getMonthlyRevenue);
router.get('/top-products', SalesController.getTopProducts);
router.get('/:id', SalesController.getById);
router.post('/', authorize('admin', 'sales', 'accounting'), SalesController.create);

export default router;
