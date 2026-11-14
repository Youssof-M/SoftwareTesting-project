import './config/loadEnv.js';
import express from 'express';
import cors from 'cors';
import api from './routes/api.js';
import { connectDatabase } from './config/database.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', api);
app.use(notFound);
app.use(errorHandler);

try {
  await connectDatabase(process.env.MONGODB_URI);
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => console.log(`StableFlow API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Could not start StableFlow API:', error.message);
  process.exit(1);
}
