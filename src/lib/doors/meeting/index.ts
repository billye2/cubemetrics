import { createLogbookDoor } from '../shared/logbook';
export const meetingDoor = createLogbookDoor({
  id: 'meeting', name: 'Meeting Notes', category: 'notes',
  description: 'Capture meeting notes',
  logType: 'meeting', entryLabel: 'Notes',
});
