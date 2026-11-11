import test from 'node:test';
import assert from 'node:assert/strict';
import { filterHorses } from './horseSearch.js';
import { buildStaffSchedule } from './staffSchedule.js';

test('horse search matches names and stable IDs without case sensitivity', () => {
  const horses = [{ name: 'Clover', horseId: 'SF-17' }, { name: 'Rowan', horseId: 'SF-29' }];
  assert.deepEqual(filterHorses(horses, 'clov'), [horses[0]]);
  assert.deepEqual(filterHorses(horses, 'sf-29'), [horses[1]]);
  assert.deepEqual(filterHorses(horses, '  '), horses);
});

test('daily staff schedule includes assigned work and omits care already completed today', () => {
  const schedule = buildStaffSchedule({
    staffId: 'staff-1', date: '2026-11-11',
    activities: [
      { _id: 'appointment-1', staffId: 'staff-1', date: '2026-11-11', time: '10:00', type: 'Veterinary' },
      { _id: 'appointment-2', staffId: 'staff-2', date: '2026-11-11', time: '11:00', type: 'Training' },
    ],
    routines: [
      { _id: 'routine-1', staffId: 'staff-1', time: '08:00', type: 'Feeding', frequency: 'Daily' },
      { _id: 'routine-2', staffId: 'staff-1', time: '07:00', type: 'Grooming', frequency: 'Daily' },
      { _id: 'routine-3', staffId: 'staff-1', time: '09:00', type: 'Farrier', frequency: 'Weekly' },
    ],
    history: [{ routineId: 'routine-2', date: '2026-11-11' }],
  });
  assert.deepEqual(schedule.map((item) => item._id), ['routine-1', 'appointment-1']);
});

test('schedule calculation stays within the ten-second NFR target on a large local set', () => {
  const activities = Array.from({ length: 10000 }, (_, index) => ({
    _id: String(index), staffId: index % 10 === 0 ? 'staff-1' : 'staff-2',
    date: '2026-11-11', time: `${String(index % 24).padStart(2, '0')}:00`, type: 'Training',
  }));
  const start = performance.now();
  const schedule = buildStaffSchedule({ activities, routines: [], history: [], staffId: 'staff-1', date: '2026-11-11' });
  const elapsed = performance.now() - start;
  assert.equal(schedule.length, 1000);
  assert.ok(elapsed < 10000, `Schedule calculation took ${elapsed.toFixed(1)}ms`);
});
