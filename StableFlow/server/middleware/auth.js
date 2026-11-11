import { verifyToken } from '../services/authService.js';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
  try { req.user = verifyToken(token); return next(); }
  catch (error) { return res.status(error.status || 401).json({ message: error.message }); }
}

export function requireManager(req, res, next) {
  if (req.user?.role !== 'manager') return res.status(403).json({ message: 'Manager access is required for this action.' });
  return next();
}
