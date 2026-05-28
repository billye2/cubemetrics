import { createLogbookDoor } from '../shared/logbook';

export const weeklyreviewDoor = createLogbookDoor({
  id: 'weeklyreview',
  name: 'Weekly Review',
  category: 'tasks',
  description: 'Reflect on and review your week',
  logType: 'weeklyreview',
  entryLabel: 'Review',
});
