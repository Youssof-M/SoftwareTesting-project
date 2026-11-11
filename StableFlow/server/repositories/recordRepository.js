import { models } from '../models/Record.js';
import mongoose from 'mongoose';
import { makeFileRepository } from './fileRepository.js';

export function makeRepository(kind) {
  if (mongoose.connection.readyState !== 1) return makeFileRepository(kind);
  const model = models[kind];
  if (!model) throw new Error(`Unknown record type: ${kind}`);
  return {
    findAll: () => model.find().sort({ createdAt: -1 }).lean(),
    findById: (id) => model.findById(id),
    create: (data) => model.create(data),
    update: (id, data) => model.findByIdAndUpdate(id, data, { new: true, runValidators: true }),
    remove: (id) => model.findByIdAndDelete(id),
    findConflicts: (activity) => model.find({
      date: activity.date,
      status: { $ne: 'completed' },
      $or: [
        { horseId: activity.horseId },
        ...(activity.staffId ? [{ staffId: activity.staffId }] : []),
        ...(activity.facility ? [{ facility: activity.facility }] : []),
      ],
    }).lean(),
    findStallOverlaps: (assignment) => model.find({
      stallId: assignment.stallId,
      startDate: { $lte: assignment.endDate || '9999-12-31' },
      endDate: { $gte: assignment.startDate },
    }).lean(),
    findForStaffSchedule: ({ staffId, date }) => {
      if (kind === 'activities') return model.find({ staffId, date }).sort({ time: 1 }).lean();
      if (kind === 'routines') return model.find({ staffId, active: { $ne: false }, $or: [{ frequency: 'Daily' }, { frequency: { $exists: false } }] }).sort({ time: 1 }).lean();
      if (kind === 'history') return model.find({ staffId, date, routineId: { $exists: true } }).select('routineId').lean();
      return Promise.resolve([]);
    },
  };
}
