import { createChecklistDoor } from '../shared/checklist';
export const packingDoor = createChecklistDoor({
  id: 'packing', name: 'Packing List', category: 'lifestyle',
  description: 'Pack for your trip',
  listType: 'packing', itemLabel: 'Item',
});
