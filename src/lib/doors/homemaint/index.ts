import { createChecklistDoor } from '../shared/checklist';

export const homemaintDoor = createChecklistDoor({
  id: 'homemaint',
  name: 'Home Maintenance',
  category: 'lifestyle',
  description: 'Track home maintenance tasks',
  listType: 'homemaint',
  itemLabel: 'Task',
});
