import { Router } from 'express';
import PermissionController from '../controllers/PermissionController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('roles.view', 'users.view'), PermissionController.catalog);

export default router;
