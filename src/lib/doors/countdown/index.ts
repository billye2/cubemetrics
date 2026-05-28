import { createTrackerDoor } from '../shared/tracker';

export const countdownDoor = createTrackerDoor({
  id: 'countdown',
  name: 'Countdown Timer',
  category: 'time',
  description: 'Count down to important events',
  trackerType: 'countdown',
  unit: 'minutes',
  valuePrompt: 'Minutes remaining',
});
