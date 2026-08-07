import { Router } from 'express';
import ProductController from '../controllers/ProductController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', ProductController.getAll);
router.get('/categories', ProductController.getCategories);
router.get('/low-stock', ProductController.getLowStock);
router.get('/:id', ProductController.getById);
router.post('/', authorize('admin', 'warehouse'), ProductController.create);
router.put('/:id', authorize('admin', 'warehouse'), ProductController.update);
router.delete('/:id', authorize('admin'), ProductController.delete);

export default router;
