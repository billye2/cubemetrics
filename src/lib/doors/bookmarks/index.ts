import { createChecklistDoor } from '../shared/checklist';
export const bookmarksDoor = createChecklistDoor({
  id: 'bookmarks', name: 'Bookmark Manager', category: 'org',
  description: 'Save and organize links',
  listType: 'bookmarks', itemLabel: 'Bookmark',
});
