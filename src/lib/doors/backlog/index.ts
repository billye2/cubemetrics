import { createChecklistDoor } from '../shared/checklist';

export const backlogDoor = createChecklistDoor({
  id: 'backlog',
  name: 'Backlog Manager',
  category: 'tasks',
  description: 'Manage your backlog of items',
  listType: 'backlog',
  itemLabel: 'Item',
});
