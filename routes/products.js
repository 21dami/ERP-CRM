import { Router } from 'express';
import ProductController from '../controllers/ProductController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('products.view'), ProductController.getAll);
router.get('/categories', requirePermission('products.view'), ProductController.getCategories);
router.get('/units', requirePermission('products.view'), ProductController.getUnits);
router.get('/low-stock', requirePermission('products.view'), ProductController.getLowStock);
router.get('/:id', requirePermission('products.view'), ProductController.getById);
router.post('/', requirePermission('products.create'), ProductController.create);
router.put('/:id', requirePermission('products.update'), ProductController.update);
router.delete('/:id', requirePermission('products.delete'), ProductController.delete);

export default router;
