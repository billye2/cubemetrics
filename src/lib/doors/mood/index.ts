import { createTrackerDoor } from '../shared/tracker';
export const moodDoor = createTrackerDoor({
  id: 'mood', name: 'Mood Tracker', category: 'habits',
  description: 'Track your daily mood',
  trackerType: 'mood', unit: '',
  labels: ['Awful', 'Bad', 'Meh', 'Okay', 'Good', 'Great'],
  valuePrompt: 'How are you feeling? (0-5)',
});
