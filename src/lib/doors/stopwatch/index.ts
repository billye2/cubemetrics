import { createTrackerDoor } from '../shared/tracker';

export const stopwatchDoor = createTrackerDoor({
  id: 'stopwatch',
  name: 'Stopwatch',
  category: 'time',
  description: 'Track elapsed time with a stopwatch',
  trackerType: 'stopwatch',
  unit: 'minutes',
  valuePrompt: 'Minutes elapsed',
});
