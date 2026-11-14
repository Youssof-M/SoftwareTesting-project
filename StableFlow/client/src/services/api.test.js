import { jest } from '@jest/globals';
import {
  request, listRecords, createRecord, deleteRecord, completeActivity,
  completeRoutine, login, setupManager, createStaffAccount, getStaffDailySchedule,
} from './api.js';

const storage = { token: null };
const unauthorized = jest.fn();
globalThis.localStorage = { getItem: (key) => key === 'stableflowToken' ? storage.token : null };
globalThis.window = { dispatchEvent: unauthorized };

beforeEach(() => {
  storage.token = null;
  unauthorized.mockClear();
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
});

test('request adds JSON and bearer headers and returns decoded JSON', async () => {
  storage.token = 'session-token';
  await expect(request('/horses')).resolves.toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/horses', {
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer session-token' },
  });
});

test('request dispatches unauthorized and reports API error messages', async () => {
  storage.token = 'expired-token';
  fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Sign in again.' }) });
  await expect(request('/horses')).rejects.toThrow('Sign in again.');
  expect(unauthorized).toHaveBeenCalledWith(expect.any(Event));
});

test('all API helpers send the expected paths and request bodies', async () => {
  await listRecords('horses');
  await createRecord('horses', { name: 'Clover' });
  await deleteRecord('horses', 'horse-1');
  await completeActivity('activity-1');
  await completeRoutine('routine-1', '2026-11-14');
  await login({ email: 'manager@example.com', password: 'secret' });
  await setupManager({ name: 'Manager' });
  await createStaffAccount({ name: 'Staff' });
  await getStaffDailySchedule('staff-1', '2026-11-14');

  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    'http://localhost:5000/api/horses',
    'http://localhost:5000/api/horses',
    'http://localhost:5000/api/horses/horse-1',
    'http://localhost:5000/api/activities/activity-1/complete',
    'http://localhost:5000/api/routines/routine-1/complete',
    'http://localhost:5000/api/auth/login',
    'http://localhost:5000/api/auth/setup',
    'http://localhost:5000/api/auth/users',
    'http://localhost:5000/api/staff/staff-1/schedule?date=2026-11-14',
  ]);
  expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'POST', body: '{"name":"Clover"}' });
  expect(fetch.mock.calls[4][1].body).toBe('{"date":"2026-11-14"}');
});
