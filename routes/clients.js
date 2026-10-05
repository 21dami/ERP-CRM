import { Router } from 'express';
import ClientController from '../controllers/ClientController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('clients.view'), ClientController.getAll);
router.get('/count', requirePermission('clients.view'), ClientController.count);
router.get('/:id', requirePermission('clients.view'), ClientController.getById);
router.post('/', requirePermission('clients.create'), ClientController.create);
router.put('/:id', requirePermission('clients.update'), ClientController.update);
router.delete('/:id', requirePermission('clients.delete'), ClientController.delete);

export default router;
