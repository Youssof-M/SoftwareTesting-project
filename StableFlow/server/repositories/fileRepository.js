import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const dataDirectory = resolve(process.env.STABLEFLOW_DATA_DIR || resolve(dirname(fileURLToPath(import.meta.url)), '../data'));
const dataPath = (kind) => resolve(dataDirectory, `${kind}.json`);

async function read(kind) {
  const path = dataPath(kind);
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(dirname(path), { recursive: true });
    return [];
  }
}

async function write(kind, rows) {
  const path = dataPath(kind);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

export function makeFileRepository(kind) {
  return {
    findAll: async () => (await read(kind)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    findById: async (id) => (await read(kind)).find((row) => row._id === id) || null,
    create: async (data) => {
      const rows = await read(kind);
      const now = new Date().toISOString();
      const record = { ...data, _id: new mongoose.Types.ObjectId().toString(), createdAt: now, updatedAt: now };
      rows.push(record);
      await write(kind, rows);
      return record;
    },
    update: async (id, data) => {
      const rows = await read(kind);
      const index = rows.findIndex((row) => row._id === id);
      if (index < 0) return null;
      rows[index] = { ...rows[index], ...data, _id: id, updatedAt: new Date().toISOString() };
      await write(kind, rows);
      return rows[index];
    },
    remove: async (id) => {
      const rows = await read(kind);
      const index = rows.findIndex((row) => row._id === id);
      if (index < 0) return null;
      const [record] = rows.splice(index, 1);
      await write(kind, rows);
      return record;
    },
    findConflicts: async (activity) => (await read(kind)).filter((row) =>
      row.date === activity.date && row.status !== 'completed'),
    findStallOverlaps: async (assignment) => (await read(kind)).filter((row) =>
      row.stallId === String(assignment.stallId) &&
      row.startDate <= (assignment.endDate || '9999-12-31') &&
      row.endDate >= assignment.startDate
    ),
    findForStaffSchedule: async ({ staffId, date }) => (await read(kind)).filter((row) => {
      if (String(row.staffId) !== String(staffId)) return false;
      if (kind === 'activities') return row.date === date;
      if (kind === 'routines') return row.active !== false && (!row.frequency || row.frequency === 'Daily');
      if (kind === 'history') return row.date === date && Boolean(row.routineId);
      return false;
    }),
  };
}
