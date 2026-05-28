import { createChecklistDoor } from '../shared/checklist';

export const routinesDoor = createChecklistDoor({
  id: 'routines',
  name: 'Routine Checklist',
  category: 'tasks',
  description: 'Manage daily routines step by step',
  listType: 'routine',
  itemLabel: 'Step',
});
