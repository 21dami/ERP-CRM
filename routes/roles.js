import { Router } from 'express';
import RoleController from '../controllers/RoleController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('roles.view', 'users.view'), RoleController.getAll);
router.get('/count', requirePermission('roles.view', 'users.view'), RoleController.count);
router.get('/:id', requirePermission('roles.view', 'users.view'), RoleController.getById);
router.post('/', requirePermission('roles.create'), RoleController.create);
router.put('/:id/permissions', requirePermission('roles.update'), RoleController.setPermissions);
router.put('/:id', requirePermission('roles.update'), RoleController.update);
router.delete('/:id', requirePermission('roles.delete'), RoleController.delete);

export default router;
