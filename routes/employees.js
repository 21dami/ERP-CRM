import { Router } from 'express';
import EmployeeController from '../controllers/EmployeeController.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission('employees.view'), EmployeeController.getAll);
router.get('/departments', requirePermission('employees.view'), EmployeeController.getDepartments);
router.get('/stats', requirePermission('employees.view'), EmployeeController.getStats);
router.get('/:id', requirePermission('employees.view'), EmployeeController.getById);
router.post('/', requirePermission('employees.create'), EmployeeController.create);
router.put('/:id', requirePermission('employees.update'), EmployeeController.update);
router.delete('/:id', requirePermission('employees.delete'), EmployeeController.delete);

export default router;
