import { createChecklistDoor } from '../shared/checklist';
export const wishlistDoor = createChecklistDoor({
  id: 'wishlist', name: 'Wishlist', category: 'org',
  description: 'Things you want to get',
  listType: 'wishlist', itemLabel: 'Item',
});
