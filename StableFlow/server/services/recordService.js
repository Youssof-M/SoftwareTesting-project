import mongoose from 'mongoose';
import { makeRepository } from '../repositories/recordRepository.js';

const kinds = ['horses', 'staff', 'stalls', 'stallAssignments', 'routines', 'activities', 'history', 'resources'];
const invalid = (message) => Object.assign(new Error(message), { status: 400 });
const minuteOfDay = (time) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };

export function makeService(kind) {
  if (!kinds.includes(kind)) throw Object.assign(new Error('Unknown record type.'), { status: 404 });
  const repository = makeRepository(kind);
  return {
    list: () => repository.findAll(),
    create: async (data) => {
      if (!data || typeof data !== 'object') throw invalid('A record is required.');
      if (kind === 'staff') delete data.password;
      if (['horses', 'staff', 'stalls', 'resources'].includes(kind) && !String(data.name || '').trim()) {
        throw invalid('Name is required.');
      }
      if (['routines', 'activities', 'history'].includes(kind)) {
        if (!mongoose.isValidObjectId(data.horseId)) throw invalid('Select a valid horse.');
        if (!String(data.type || '').trim()) throw invalid('Activity type is required.');
      }
      if (kind === 'stallAssignments') {
        if (!mongoose.isValidObjectId(data.stallId) || !mongoose.isValidObjectId(data.horseId)) throw invalid('Select a valid stall and horse.');
        if (!data.startDate) throw invalid('Start date is required.');
        data.endDate ||= '9999-12-31';
        if (data.endDate < data.startDate) throw invalid('End date must be on or after the start date.');
        if ((await repository.findStallOverlaps(data)).length) {
          throw Object.assign(new Error('Stall conflict: this stall is assigned to another horse during the selected dates.'), { status: 409 });
        }
      }
      if (kind === 'activities') {
        if (!data.date || !data.time) throw invalid('Date and time are required.');
        if (data.staffId && !mongoose.isValidObjectId(data.staffId)) throw invalid('Select a valid staff member.');
        data.durationMinutes = Number(data.durationMinutes) || 60;
        const start = minuteOfDay(data.time);
        const end = start + data.durationMinutes;
        const overlaps = (await repository.findConflicts(data)).some((other) => {
          const otherStart = minuteOfDay(other.time);
          const otherEnd = otherStart + (Number(other.durationMinutes) || 60);
          const sameHorse = String(other.horseId) === String(data.horseId);
          const sameStaff = data.staffId && String(other.staffId) === String(data.staffId);
          const sameFacility = data.facility && other.facility === data.facility;
          return (sameHorse || sameStaff || sameFacility) && start < otherEnd && otherStart < end;
        });
        if (overlaps) {
          throw Object.assign(new Error('Scheduling conflict: the horse, staff member, or facility is already booked at that time.'), { status: 409 });
        }
      }
      return repository.create(data);
    },
    update: (id, data) => repository.update(id, data),
    remove: (id) => repository.remove(id),
  };
}

export async function completeActivity(id, user) {
  const activities = makeRepository('activities');
  const history = makeRepository('history');
  const activity = await activities.findById(id);
  if (!activity) throw Object.assign(new Error('Activity not found.'), { status: 404 });
  if (user?.role === 'staff' && String(activity.staffId) !== user.staffId) {
    throw Object.assign(new Error('You can only complete activities assigned to your staff account.'), { status: 403 });
  }
  if (activity.status !== 'completed') {
    await activities.update(id, { status: 'completed' });
    const alreadyRecorded = (await history.findAll()).some((record) => record.activityId === String(activity._id));
    if (!alreadyRecorded) await history.create({
      horseId: activity.horseId, staffId: activity.staffId, type: activity.type,
      date: activity.date, notes: 'Completed scheduled activity', activityId: String(activity._id),
    });
  }
  return { ...activity, status: 'completed' };
}

export async function completeRoutine(id, requestedDate, user) {
  const routines = makeRepository('routines');
  const history = makeRepository('history');
  const routine = await routines.findById(id);
  if (!routine) throw Object.assign(new Error('Care routine not found.'), { status: 404 });
  if (user?.role === 'staff' && String(routine.staffId) !== user.staffId) {
    throw Object.assign(new Error('You can only complete routines assigned to your staff account.'), { status: 403 });
  }
  const date = requestedDate || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw invalid('Completion date must use YYYY-MM-DD.');
  const records = await history.findAll();
  const existing = records.find((record) => record.routineId === String(routine._id) && record.date === date);
  if (existing) return existing;
  return history.create({
    horseId: routine.horseId, staffId: routine.staffId, type: routine.type, date,
    notes: 'Completed recurring care routine', routineId: String(routine._id),
  });
}
