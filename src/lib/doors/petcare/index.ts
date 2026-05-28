import { createChecklistDoor } from '../shared/checklist';

export const petcareDoor = createChecklistDoor({
  id: 'petcare',
  name: 'Pet Care Log',
  category: 'lifestyle',
  description: 'Track pet care tasks and schedules',
  listType: 'petcare',
  itemLabel: 'Task',
});
