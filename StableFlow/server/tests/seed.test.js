import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dataDirectory = await mkdtemp(join(tmpdir(), 'stableflow-seed-'));
const original = { data: process.env.STABLEFLOW_DATA_DIR, mongo: process.env.MONGODB_URI, secret: process.env.AUTH_SECRET };
beforeAll(() => {
  process.env.STABLEFLOW_DATA_DIR = dataDirectory;
  process.env.MONGODB_URI = '';
  process.env.AUTH_SECRET = 'seed-test-secret';
});
afterAll(async () => {
  await rm(dataDirectory, { recursive: true, force: true });
  if (original.data === undefined) delete process.env.STABLEFLOW_DATA_DIR; else process.env.STABLEFLOW_DATA_DIR = original.data;
  if (original.mongo === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = original.mongo;
  if (original.secret === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = original.secret;
});

test('demo seed is reusable, linked, and does not duplicate records or accounts', async () => {

  const { seedStableFlow } = await import('../services/seedService.js');
  const { login } = await import('../services/authService.js');
  const { makeRepository } = await import('../repositories/recordRepository.js');
  const first = await seedStableFlow();
  const managerLogin = await login(first.credentials.find((account) => account.role === 'manager'));
  const staffLogin = await login(first.credentials.find((account) => account.role === 'staff'));
  const updatedHorse = await makeRepository('horses').update(first.horse._id, { owner: 'Edited after seed' });
  const second = await seedStableFlow();

  expect(first.credentials).toHaveLength(2);
  expect(managerLogin.user.role).toBe('manager');
  expect(staffLogin.user.staffId).toBe(String(first.staff._id));
  expect(second.credentials).toHaveLength(0);
  expect(second.horse._id).toBe(first.horse._id);
  for (const kind of ['horses', 'staff', 'stallAssignments', 'routines', 'activities', 'resources']) {
    expect(await makeRepository(kind).findAll()).toHaveLength(1);
  }
  expect((await makeRepository('horses').findById(updatedHorse._id)).owner).toBe('Edited after seed');
});
