import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['manager', 'staff'], required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'staff' },
}, { timestamps: true, versionKey: false });

export const User = mongoose.models.User || mongoose.model('User', schema);
