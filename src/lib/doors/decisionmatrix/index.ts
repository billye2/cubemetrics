import { createLogbookDoor } from '../shared/logbook';

export const decisionmatrixDoor = createLogbookDoor({
  id: 'decisionmatrix',
  name: 'Decision Matrix',
  category: 'notes',
  description: 'Log and evaluate decisions',
  logType: 'decision',
  entryLabel: 'Decision',
});
