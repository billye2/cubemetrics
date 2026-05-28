import { createChecklistDoor } from '../shared/checklist';

export const warrantyDoor = createChecklistDoor({
  id: 'warranty',
  name: 'Warranty Tracker',
  category: 'lifestyle',
  description: 'Track warranty information and expiration dates',
  listType: 'warranty',
  itemLabel: 'Warranty',
});
