import { createChecklistDoor } from '../shared/checklist';

export const cleaningDoor = createChecklistDoor({
  id: 'cleaning',
  name: 'Cleaning Schedule',
  category: 'lifestyle',
  description: 'Schedule and track cleaning tasks',
  listType: 'cleaning',
  itemLabel: 'Task',
});
