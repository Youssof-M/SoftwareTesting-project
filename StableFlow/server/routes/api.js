import { Router } from 'express';
import { makeController, complete, completeCareRoutine } from '../controllers/recordController.js';
import auth from './auth.js';
import { requireAuth, requireManager } from '../middleware/auth.js';
import { dailySchedule } from '../controllers/staffController.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'StableFlow API' }));
router.use('/auth', auth);
router.use(requireAuth);
router.get('/staff/:id/schedule', dailySchedule);
for (const kind of ['horses', 'staff', 'stalls', 'stallAssignments', 'routines', 'activities', 'history', 'resources']) {
  const controller = makeController(kind);
  router.get(`/${kind}`, controller.list);
  router.post(`/${kind}`, requireManager, controller.create);
  router.put(`/${kind}/:id`, requireManager, controller.update);
  router.delete(`/${kind}/:id`, requireManager, controller.remove);
}
router.post('/activities/:id/complete', complete);
router.post('/routines/:id/complete', completeCareRoutine);
export default router;
