import { createLogbookDoor } from '../shared/logbook';
export const standupDoor = createLogbookDoor({
  id: 'standup', name: 'Standup Notes', category: 'notes',
  description: 'Daily standup updates',
  logType: 'standup', entryLabel: 'Update',
});
