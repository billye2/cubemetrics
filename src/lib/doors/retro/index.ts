import { createLogbookDoor } from '../shared/logbook';

export const retroDoor = createLogbookDoor({
  id: 'retro',
  name: 'Retrospective Board',
  category: 'work',
  description: 'Run team retrospectives',
  logType: 'retro',
  entryLabel: 'Retro',
});
