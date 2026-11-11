import { getStaffSchedule } from '../services/staffScheduleService.js';

export async function dailySchedule(req, res, next) {
  if (req.user.role !== 'manager' && req.user.staffId !== req.params.id) {
    return res.status(403).json({ message: 'You can only view your own daily schedule.' });
  }
  try {
    return res.json(await getStaffSchedule(req.params.id, req.query.date));
  } catch (error) { return next(error); }
}
