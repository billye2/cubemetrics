import { createTrackerDoor } from '../shared/tracker';
export const energyDoor = createTrackerDoor({
  id: 'energy', name: 'Energy Level', category: 'habits',
  description: 'Track your daily energy',
  trackerType: 'energy', unit: '',
  labels: ['Empty', 'Low', 'Medium', 'High', 'Peak'],
  valuePrompt: 'Energy level (0-4)',
});
