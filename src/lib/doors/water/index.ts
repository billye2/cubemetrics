import { createTrackerDoor } from '../shared/tracker';
export const waterDoor = createTrackerDoor({
  id: 'water', name: 'Water Intake', category: 'habits',
  description: 'Track daily water consumption',
  trackerType: 'water', unit: 'glasses',
  valuePrompt: 'Glasses of water today',
});
