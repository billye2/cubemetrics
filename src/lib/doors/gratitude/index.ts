import { createLogbookDoor } from '../shared/logbook';
export const gratitudeDoor = createLogbookDoor({
  id: 'gratitude', name: 'Gratitude Journal', category: 'habits',
  description: 'Daily gratitude entries',
  logType: 'gratitude', entryLabel: 'Entry', hasTitle: false,
});
