import { createChecklistDoor } from '../shared/checklist';

export const plantcareDoor = createChecklistDoor({
  id: 'plantcare',
  name: 'Plant Care',
  category: 'lifestyle',
  description: 'Track plant care schedules',
  listType: 'plantcare',
  itemLabel: 'Plant',
});
