import mongoose from 'mongoose';

export async function connectDatabase(uri) {
  if (!uri) {
    console.log('MONGODB_URI not set; using persistent local JSON storage.');
    return;
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
