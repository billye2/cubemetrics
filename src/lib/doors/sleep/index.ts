import { createTrackerDoor } from '../shared/tracker';
export const sleepDoor = createTrackerDoor({
  id: 'sleep', name: 'Sleep Log', category: 'habits',
  description: 'Track your sleep hours',
  trackerType: 'sleep', unit: 'hours',
  valuePrompt: 'Hours of sleep',
});
