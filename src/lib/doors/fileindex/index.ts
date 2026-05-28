import { createChecklistDoor } from '../shared/checklist';

export const fileindexDoor = createChecklistDoor({
  id: 'fileindex',
  name: 'File Index',
  category: 'org',
  description: 'Index and organize your files',
  listType: 'fileindex',
  itemLabel: 'File',
});
