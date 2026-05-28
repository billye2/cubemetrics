import { createTrackerDoor } from '../shared/tracker';

export const focusDoor = createTrackerDoor({
  id: 'focus',
  name: 'Focus Session',
  category: 'time',
  description: 'Track focused work sessions',
  trackerType: 'focus',
  unit: 'minutes',
  valuePrompt: 'Minutes focused',
});
