import mongoose from 'mongoose';
import { makeRepository } from '../repositories/recordRepository.js';

export async function getStaffSchedule(staffId, date) {
  if (!mongoose.isValidObjectId(staffId)) throw Object.assign(new Error('Select a valid staff member.'), { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw Object.assign(new Error('Date must use YYYY-MM-DD.'), { status: 400 });
  const [activities, routines, history] = await Promise.all([
    makeRepository('activities').findForStaffSchedule({ staffId, date }),
    makeRepository('routines').findForStaffSchedule({ staffId, date }),
    makeRepository('history').findForStaffSchedule({ staffId, date }),
  ]);
  const completed = new Set(history.map((entry) => entry.routineId));
  return [
    ...activities.map((activity) => ({ ...activity, kind: 'activity', workType: activity.type })),
    ...routines.filter((routine) => !completed.has(String(routine._id)))
      .map((routine) => ({ ...routine, kind: 'routine', workType: `${routine.type} · daily` })),
  ].sort((a, b) => a.time.localeCompare(b.time));
}
