import { createLogbookDoor } from '../shared/logbook';
export const learninglogDoor = createLogbookDoor({
  id: 'learninglog', name: 'Learning Log', category: 'learning',
  description: 'Document what you learn',
  logType: 'learning', entryLabel: 'Entry',
});
