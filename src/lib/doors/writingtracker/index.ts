import { createTrackerDoor } from '../shared/tracker';

export const writingtrackerDoor = createTrackerDoor({
  id: 'writingtracker',
  name: 'Writing Tracker',
  category: 'notes',
  description: 'Track daily writing word counts',
  trackerType: 'writing',
  unit: 'words',
  valuePrompt: 'Words written',
});
