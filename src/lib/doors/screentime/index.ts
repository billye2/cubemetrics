import { createTrackerDoor } from '../shared/tracker';
export const screentimeDoor = createTrackerDoor({
  id: 'screentime', name: 'Screen Time', category: 'habits',
  description: 'Track daily screen time',
  trackerType: 'screentime', unit: 'hours',
  valuePrompt: 'Hours of screen time',
});
