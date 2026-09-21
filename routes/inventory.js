import { Router } from 'express';
import InventoryController from '../controllers/InventoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', InventoryController.getAll);
router.get('/low-stock', InventoryController.getLowStock);
router.get('/locations', InventoryController.getLocations);
router.get('/stats', InventoryController.getStats);
router.get('/:productId', InventoryController.getByProduct);
router.put('/adjust', authorize('admin', 'warehouse'), InventoryController.adjustStock);
router.put('/update', authorize('admin', 'warehouse'), InventoryController.updateQuantity);

export default router;
