import { createTrackerDoor } from '../shared/tracker';
export const weightDoor = createTrackerDoor({
  id: 'weight', name: 'Weight Tracker', category: 'habits',
  description: 'Track your weight over time',
  trackerType: 'weight', unit: 'lbs',
  valuePrompt: 'Weight',
});
