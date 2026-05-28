import { createChecklistDoor } from '../shared/checklist';

export const inventoryDoor = createChecklistDoor({
  id: 'inventory',
  name: 'Inventory Tracker',
  category: 'org',
  description: 'Track your inventory items',
  listType: 'inventory',
  itemLabel: 'Item',
});
