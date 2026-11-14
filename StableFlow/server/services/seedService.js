import { makeRepository } from '../repositories/recordRepository.js';
import { ensureDemoAccounts } from './authService.js';

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function findOrCreate(kind, predicate, data) {
  const repository = makeRepository(kind);
  const existing = (await repository.findAll()).find(predicate);
  return existing || repository.create(data);
}

export async function seedStableFlow() {
  const horse = await findOrCreate('horses', (item) => item.horseId === 'SF-DEMO-001', {
    name: 'Clover', horseId: 'SF-DEMO-001', breed: 'Arabian', owner: 'StableFlow Demo',
    dietaryNotes: 'Hay in the morning and evening; fresh water always available.',
    medicalNotes: 'Routine veterinary check due this season.',
  });
  const staff = await findOrCreate('staff', (item) => item.email === 'alex@stableflow.demo', {
    name: 'Alex Morgan', role: 'Stable hand', email: 'alex@stableflow.demo',
  });
  const stall = await findOrCreate('stalls', (item) => item.name === 'North Wing 01', {
    name: 'North Wing 01', location: 'North wing', status: 'Available',
  });
  const today = localDate(new Date());
  const assignments = makeRepository('stallAssignments');
  let assignment = (await assignments.findAll()).find((item) =>
    String(item.stallId) === String(stall._id) && item.startDate <= today && item.endDate >= today);
  if (!assignment) assignment = await assignments.create({
    stallId: stall._id, horseId: horse._id, startDate: today, endDate: '9999-12-31',
  });

  const routine = await findOrCreate('routines', (item) =>
    String(item.horseId) === String(horse._id) && item.type === 'Feeding' && item.time === '08:00', {
    horseId: horse._id, type: 'Feeding', time: '08:00', frequency: 'Daily', staffId: staff._id, active: true,
  });
  const activity = await findOrCreate('activities', (item) =>
    String(item.horseId) === String(horse._id) && item.date === today && item.type === 'Veterinary' && item.time === '14:00', {
    horseId: horse._id, type: 'Veterinary', date: today, time: '14:00', durationMinutes: 60,
    staffId: staff._id, facility: 'Veterinary Clinic', status: 'scheduled',
  });
  const resource = await findOrCreate('resources', (item) => item.name === 'Indoor Arena', {
    name: 'Indoor Arena', category: 'Facility', availability: 'Available',
  });
  const credentials = await ensureDemoAccounts(staff);

  return { horse, staff, stall, assignment, routine, activity, resource, credentials };
}
