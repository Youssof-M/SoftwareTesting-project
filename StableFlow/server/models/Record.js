import mongoose from 'mongoose';

const id = { type: mongoose.Schema.Types.ObjectId };
const schemaOptions = { timestamps: true, versionKey: false };
const schemas = {
  horses: { name: { type: String, required: true, trim: true }, horseId: String, breed: String, owner: String, dietaryNotes: String, medicalNotes: String },
  staff: { name: { type: String, required: true, trim: true }, role: { type: String, default: 'Stable hand' }, email: String },
  stalls: { name: { type: String, required: true, trim: true }, location: String, status: { type: String, default: 'Available' }, horseId: id },
  stallAssignments: { stallId: { ...id, required: true }, horseId: { ...id, required: true }, startDate: { type: String, required: true }, endDate: { type: String, default: '9999-12-31' } },
  routines: { horseId: { ...id, required: true }, type: { type: String, required: true }, time: { type: String, required: true }, frequency: { type: String, default: 'Daily' }, staffId: id, active: { type: Boolean, default: true } },
  activities: { horseId: { ...id, required: true }, type: { type: String, required: true }, date: { type: String, required: true }, time: { type: String, required: true }, durationMinutes: { type: Number, default: 60 }, staffId: id, facility: String, status: { type: String, default: 'scheduled' } },
  history: { horseId: { ...id, required: true }, staffId: id, type: String, date: String, notes: String, activityId: String, routineId: String },
  resources: { name: { type: String, required: true, trim: true }, category: String, availability: { type: String, default: 'Available' } },
};

export const models = Object.fromEntries(Object.entries(schemas).map(([name, fields]) => [
  name,
  mongoose.models[name] || mongoose.model(name, new mongoose.Schema(fields, schemaOptions)),
]));
