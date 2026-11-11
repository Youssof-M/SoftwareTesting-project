import { Router } from 'express';
import { authStatus, createStaffAccount, login, setupManager } from '../services/authService.js';
import { requireAuth, requireManager } from '../middleware/auth.js';

const router = Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.get('/status', asyncRoute(async (_req, res) => res.json(await authStatus())));
router.post('/setup', asyncRoute(async (req, res) => res.status(201).json(await setupManager(req.body))));
router.post('/login', asyncRoute(async (req, res) => res.json(await login(req.body))));
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
router.post('/users', requireAuth, requireManager, asyncRoute(async (req, res) => res.status(201).json(await createStaffAccount(req.body))));
export default router;
