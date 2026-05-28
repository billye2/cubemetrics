import { createTrackerDoor } from '../shared/tracker';

export const timetrackerDoor = createTrackerDoor({
  id: 'timetracker',
  name: 'Time Tracker',
  category: 'time',
  description: 'Track hours worked on tasks',
  trackerType: 'timesheet',
  unit: 'hours',
  valuePrompt: 'Hours worked',
});
