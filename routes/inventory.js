import { Router } from 'express';
import InventoryController from '../controllers/InventoryController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('inventory.view'), InventoryController.getAll);
router.get('/low-stock', requirePermission('inventory.view'), InventoryController.getLowStock);
router.get('/locations', requirePermission('inventory.view'), InventoryController.getLocations);
router.get('/stats', requirePermission('inventory.view'), InventoryController.getStats);
router.get('/:productId', requirePermission('inventory.view'), InventoryController.getByProduct);
router.put('/adjust', requirePermission('inventory.update'), InventoryController.adjustStock);
router.put('/update', requirePermission('inventory.update'), InventoryController.updateQuantity);

export default router;
