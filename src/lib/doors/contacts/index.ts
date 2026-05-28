import { createChecklistDoor } from '../shared/checklist';

export const contactsDoor = createChecklistDoor({
  id: 'contacts',
  name: 'Contact Manager',
  category: 'org',
  description: 'Manage your contacts',
  listType: 'contact',
  itemLabel: 'Contact',
});
