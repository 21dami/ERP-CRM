import { Router } from 'express';
import ClientController from '../controllers/ClientController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', ClientController.getAll);
router.get('/count', ClientController.count);
router.get('/:id', ClientController.getById);
router.post('/', authorize('admin', 'sales'), ClientController.create);
router.put('/:id', authorize('admin', 'sales'), ClientController.update);
router.delete('/:id', authorize('admin'), ClientController.delete);

export default router;
