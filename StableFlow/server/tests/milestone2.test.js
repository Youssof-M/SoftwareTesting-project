import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const serverDirectory = resolve('server');

async function freePort() {
  const listener = createServer();
  await new Promise((resolveListen, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolveListen));
  const { port } = listener.address();
  await new Promise((resolveClose) => listener.close(resolveClose));
  return port;
}

async function startApi(port, dataDirectory) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: serverDirectory,
    env: { ...process.env, PORT: String(port), MONGODB_URI: '', AUTH_SECRET: 'milestone-two-test-secret-2026', STABLEFLOW_DATA_DIR: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
  child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
  const base = `http://127.0.0.1:${port}/api`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`API exited before starting:\n${logs}`);
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return { child, base, logs: () => logs };
    } catch { /* The listener is still starting. */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  child.kill();
  throw new Error(`API did not start:\n${logs}`);
}

async function stopApi(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolveExit) => {
    child.once('exit', resolveExit);
    child.kill();
  });
}

function apiClient(base, token = '') {
  return async (path, { method = 'GET', body } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
}

test('Milestone 2 connected beta workflow, validation, permissions, and persistence', async () => {
  const dataDirectory = await mkdtemp(join(tmpdir(), 'stableflow-m2-'));
  let child;
  try {
  const port = await freePort();
  let api = await startApi(port, dataDirectory);
  child = api.child;
  let request = apiClient(api.base);

  expect((await request('/health')).body.status).toBe('ok');
  assert.equal((await request('/horses')).status, 401, 'records require sign-in');
  const setup = await request('/auth/setup', { method: 'POST', body: { name: 'Stable Manager', email: 'manager@test.local', password: 'ManagerPass!2026' } });
  assert.equal(setup.status, 201);
  const managerRequest = apiClient(api.base, setup.body.token);

  assert.equal((await managerRequest('/horses', { method: 'POST', body: {} })).status, 400, 'invalid records get a clear validation response');
  const horseResponse = await managerRequest('/horses', { method: 'POST', body: { name: 'Clover', horseId: 'SF-17', dietaryNotes: 'Hay twice daily' } });
  assert.equal(horseResponse.status, 201);
  const horse = horseResponse.body;
  assert.equal((await managerRequest('/horses')).body[0].name, 'Clover');
  assert.equal((await managerRequest(`/horses/${horse._id}`, { method: 'PUT', body: { owner: 'Stable Demo' } })).body.owner, 'Stable Demo');

  const staff = (await managerRequest('/staff', { method: 'POST', body: { name: 'Alex Handler', role: 'Stable hand', email: 'alex@test.local' } })).body;
  assert.equal((await managerRequest('/auth/users', { method: 'POST', body: { name: staff.name, email: staff.email, password: 'StaffPass!2026', staffId: staff._id } })).status, 201);
  const secondHorse = (await managerRequest('/horses', { method: 'POST', body: { name: 'Rowan', horseId: 'SF-29' } })).body;
  const stall = (await managerRequest('/stalls', { method: 'POST', body: { name: 'Stall 1', location: 'North wing' } })).body;
  assert.equal((await managerRequest('/stallAssignments', { method: 'POST', body: { stallId: stall._id, horseId: horse._id, startDate: '2026-11-11' } })).status, 201);
  const stallConflict = await managerRequest('/stallAssignments', { method: 'POST', body: { stallId: stall._id, horseId: secondHorse._id, startDate: '2026-11-12' } });
  assert.equal(stallConflict.status, 409, 'overlapping stall occupancy is rejected');

  const routine = (await managerRequest('/routines', { method: 'POST', body: { horseId: horse._id, type: 'Feeding', time: '08:00', frequency: 'Daily', staffId: staff._id, active: true } })).body;
  assert.equal((await managerRequest('/resources', { method: 'POST', body: { name: 'Indoor arena', category: 'Facility', availability: 'Available' } })).status, 201);
  assert.equal((await managerRequest('/resources')).body[0].name, 'Indoor arena');
  const activity = (await managerRequest('/activities', { method: 'POST', body: { horseId: horse._id, type: 'Veterinary', date: '2026-12-10', time: '10:00', staffId: staff._id, facility: 'Clinic' } })).body;
  const activityConflict = await managerRequest('/activities', { method: 'POST', body: { horseId: horse._id, type: 'Training', date: '2026-12-10', time: '10:30', staffId: staff._id, facility: 'Arena' } });
  assert.equal(activityConflict.status, 409, 'overlapping horse/staff appointments are rejected');

  const staffLogin = await request('/auth/login', { method: 'POST', body: { email: staff.email, password: 'StaffPass!2026' } });
  assert.equal(staffLogin.status, 200);
  const staffRequest = apiClient(api.base, staffLogin.body.token);
  assert.equal((await staffRequest('/horses', { method: 'POST', body: { name: 'Unauthorized' } })).status, 403, 'staff cannot perform manager changes');
  assert.equal((await staffRequest('/activities')).status, 200, 'staff can view work schedules');
  const scheduleStart = performance.now();
  const dailySchedule = await staffRequest(`/staff/${staff._id}/schedule?date=2026-11-11`);
  const scheduleDuration = performance.now() - scheduleStart;
  assert.equal(dailySchedule.status, 200);
  assert.ok(dailySchedule.body.some((item) => item._id === routine._id), 'daily schedule includes the assigned feeding routine');
  assert.ok(scheduleDuration < 10000, `Daily schedule took ${scheduleDuration.toFixed(1)}ms`);
  assert.equal((await staffRequest(`/staff/${secondHorse._id}/schedule?date=2026-11-11`)).status, 403, 'staff cannot view another staff member schedule');
  const unassignedRoutine = (await managerRequest('/routines', { method: 'POST', body: { horseId: horse._id, type: 'Grooming', time: '09:00', frequency: 'Daily' } })).body;
  assert.equal((await staffRequest(`/routines/${unassignedRoutine._id}/complete`, { method: 'POST', body: { date: '2026-11-11' } })).status, 403);
  assert.equal((await staffRequest(`/routines/${routine._id}/complete`, { method: 'POST', body: { date: '2026-11-11' } })).status, 200);
  assert.equal((await staffRequest(`/staff/${staff._id}/schedule?date=2026-11-11`)).body.some((item) => item._id === routine._id), false, 'completed care is removed from the daily schedule');
  assert.equal((await staffRequest(`/activities/${activity._id}/complete`, { method: 'POST' })).status, 200);
  const history = (await managerRequest('/history')).body;
  assert.ok(history.some((entry) => entry.routineId === routine._id), 'completed care is recorded in service history');
  assert.ok(history.some((entry) => entry.activityId === activity._id), 'completed appointment is recorded in service history');

  await stopApi(api.child);
  api = await startApi(port, dataDirectory);
  child = api.child;
  request = apiClient(api.base, setup.body.token);
  const persistedHorses = await request('/horses');
  assert.equal(persistedHorses.status, 200);
  assert.ok(persistedHorses.body.some((entry) => entry._id === horse._id), 'records survive an API restart');
  assert.equal((await request('/history')).body.length, 2);
  } finally {
    if (child) await stopApi(child);
    await rm(dataDirectory, { recursive: true, force: true });
  }
});
