import '../config/loadEnv.js';
import { connectDatabase } from '../config/database.js';
import { seedStableFlow } from '../services/seedService.js';

try {
  await connectDatabase(process.env.MONGODB_URI);
  const result = await seedStableFlow();
  console.log('StableFlow demo records are ready:');
  console.log(`- Horse: ${result.horse.name} (${result.horse.horseId})`);
  console.log(`- Staff: ${result.staff.name}`);
  console.log(`- Stall assignment: ${result.stall.name}`);
  console.log(`- Daily routine: ${result.routine.type} at ${result.routine.time}`);
  console.log(`- Appointment: ${result.activity.type} on ${result.activity.date} at ${result.activity.time}`);
  console.log(`- Resource: ${result.resource.name}`);
  if (result.credentials.length) {
    console.log('\nNew demo sign-in credentials (save these now; passwords are not stored in plaintext):');
    for (const account of result.credentials) console.log(`${account.role}: ${account.email} / ${account.password}`);
  } else {
    console.log('\nExisting manager and linked staff accounts were kept. Their passwords were not changed.');
  }
} catch (error) {
  console.error('Could not seed StableFlow:', error.message);
  process.exitCode = 1;
}
