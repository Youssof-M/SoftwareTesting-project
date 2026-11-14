import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mongoose from 'mongoose';

const dataDirectory = await mkdtemp(join(tmpdir(), 'stableflow-records-'));
const originalDataDirectory = process.env.STABLEFLOW_DATA_DIR;
process.env.STABLEFLOW_DATA_DIR = dataDirectory;
const { makeFileRepository } = await import('../repositories/fileRepository.js');
const { makeService, completeActivity, completeRoutine } = await import('../services/recordService.js');

const id = () => new mongoose.Types.ObjectId().toString();
const cleanData = async () => {
  await Promise.all(['horses', 'staff', 'stalls', 'stallAssignments', 'routines', 'activities', 'history', 'resources']
    .map((kind) => rm(join(dataDirectory, `${kind}.json`), { force: true })));
};

beforeEach(cleanData);
afterAll(async () => {
  await rm(dataDirectory, { recursive: true, force: true });
  if (originalDataDirectory === undefined) delete process.env.STABLEFLOW_DATA_DIR;
  else process.env.STABLEFLOW_DATA_DIR = originalDataDirectory;
});

test('file repository creates, reads, updates, sorts, and removes records', async () => {
  const repository = makeFileRepository('horses');
  const first = await repository.create({ name: 'Clover' });
  const second = await repository.create({ name: 'Rowan' });
  expect(await repository.findById(first._id)).toMatchObject({ name: 'Clover' });
  expect(await repository.findAll()).toHaveLength(2);
  expect(await repository.update(first._id, { owner: 'Sam' })).toMatchObject({ name: 'Clover', owner: 'Sam' });
  expect(await repository.remove(second._id)).toMatchObject({ name: 'Rowan' });
  expect(await repository.findById(second._id)).toBeNull();
});

test('record service validates required names and record links', async () => {
  await expect(makeService('horses').create({ name: ' ' })).rejects.toMatchObject({ status: 400, message: 'Name is required.' });
  await expect(makeService('routines').create({ horseId: 'bad-id', type: 'Feeding' })).rejects.toMatchObject({ status: 400 });
  expect(() => makeService('not-a-record')).toThrow(expect.objectContaining({ status: 404 }));
  await expect(makeService('horses').create({ name: 'Clover' })).resolves.toMatchObject({ name: 'Clover' });
});

test('stall assignments default their end date and reject overlapping occupancy', async () => {
  const service = makeService('stallAssignments');
  const stallId = id();
  const horseId = id();
  const first = await service.create({ stallId, horseId, startDate: '2026-11-01' });
  expect(first.endDate).toBe('9999-12-31');
  await expect(service.create({ stallId, horseId: id(), startDate: '2026-11-30' }))
    .rejects.toMatchObject({ status: 409 });
  await expect(service.create({ stallId: id(), horseId, startDate: '2026-12-02', endDate: '2026-12-01' }))
    .rejects.toMatchObject({ status: 400 });
});

test('activities reject overlapping bookings and allow non-overlapping appointments', async () => {
  const service = makeService('activities');
  const horseId = id();
  const staffId = id();
  await service.create({ horseId, staffId, date: '2026-12-10', time: '10:00', durationMinutes: 60, type: 'Veterinary' });
  await expect(service.create({ horseId: id(), staffId, date: '2026-12-10', time: '10:30', type: 'Training' }))
    .rejects.toMatchObject({ status: 409 });
  await expect(service.create({ horseId, staffId, date: '2026-12-10', time: '11:00', type: 'Training' }))
    .resolves.toMatchObject({ type: 'Training', durationMinutes: 60 });
});

test('staff can only complete assigned work and repeated completion does not duplicate history', async () => {
  const horseId = id();
  const staffId = id();
  const routine = await makeService('routines').create({ horseId, staffId, type: 'Feeding', time: '08:00' });
  await expect(completeRoutine(routine._id, '2026-11-14', { role: 'staff', staffId: id() }))
    .rejects.toMatchObject({ status: 403 });
  const completion = await completeRoutine(routine._id, '2026-11-14', { role: 'staff', staffId });
  expect(await completeRoutine(routine._id, '2026-11-14', { role: 'staff', staffId })).toEqual(completion);
  expect(await makeFileRepository('history').findAll()).toHaveLength(1);

  const activity = await makeService('activities').create({ horseId, staffId, type: 'Training', date: '2026-11-14', time: '09:00' });
  await expect(completeActivity(activity._id, { role: 'staff', staffId: id() })).rejects.toMatchObject({ status: 403 });
  expect((await completeActivity(activity._id, { role: 'staff', staffId })).status).toBe('completed');
  expect((await makeFileRepository('history').findAll()).filter((entry) => entry.activityId)).toHaveLength(1);
});
