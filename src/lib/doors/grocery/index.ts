import { createChecklistDoor } from '../shared/checklist';
export const groceryDoor = createChecklistDoor({
  id: 'grocery', name: 'Grocery List', category: 'org',
  description: 'Shopping list for groceries',
  listType: 'grocery', itemLabel: 'Item',
});
