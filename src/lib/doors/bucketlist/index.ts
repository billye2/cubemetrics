import { createChecklistDoor } from '../shared/checklist';
export const bucketlistDoor = createChecklistDoor({
  id: 'bucketlist', name: 'Bucket List', category: 'goals',
  description: 'Things to do before you die',
  listType: 'bucketlist', itemLabel: 'Goal',
});
