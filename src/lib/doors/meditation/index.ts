import { createTrackerDoor } from '../shared/tracker';

export const meditationDoor = createTrackerDoor({
  id: 'meditation',
  name: 'Meditation Timer',
  category: 'time',
  description: 'Track meditation sessions',
  trackerType: 'meditation',
  unit: 'minutes',
  valuePrompt: 'Minutes meditated',
});
