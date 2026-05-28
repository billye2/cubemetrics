import { createLogbookDoor } from '../shared/logbook';

export const brainstormDoor = createLogbookDoor({
  id: 'brainstorm',
  name: 'Brainstorm',
  category: 'notes',
  description: 'Capture and organize brainstorm ideas',
  logType: 'brainstorm',
  entryLabel: 'Idea',
});
