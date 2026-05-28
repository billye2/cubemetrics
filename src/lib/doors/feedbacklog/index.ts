import { createLogbookDoor } from '../shared/logbook';
export const feedbacklogDoor = createLogbookDoor({
  id: 'feedbacklog', name: 'Feedback Log', category: 'work',
  description: 'Track feedback given and received',
  logType: 'feedback', entryLabel: 'Feedback',
});
