import { createLogbookDoor } from '../shared/logbook';
export const workoutDoor = createLogbookDoor({
  id: 'workout', name: 'Workout Log', category: 'habits',
  description: 'Log exercises and workouts',
  logType: 'workout', entryLabel: 'Workout',
});
