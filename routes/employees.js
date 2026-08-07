import { Router } from 'express';
import EmployeeController from '../controllers/EmployeeController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', EmployeeController.getAll);
router.get('/departments', EmployeeController.getDepartments);
router.get('/stats', EmployeeController.getStats);
router.get('/:id', EmployeeController.getById);
router.post('/', authorize('admin', 'hr'), EmployeeController.create);
router.put('/:id', authorize('admin', 'hr'), EmployeeController.update);
router.delete('/:id', authorize('admin'), EmployeeController.delete);

export default router;
