import { createChecklistDoor } from '../shared/checklist';

export const visionboardDoor = createChecklistDoor({
  id: 'visionboard',
  name: 'Vision Board',
  category: 'goals',
  description: 'Curate your vision board items',
  listType: 'vision',
  itemLabel: 'Vision',
});
