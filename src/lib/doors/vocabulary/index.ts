import { createChecklistDoor } from '../shared/checklist';

export const vocabularyDoor = createChecklistDoor({
  id: 'vocabulary',
  name: 'Vocabulary Builder',
  category: 'learning',
  description: 'Build and review your vocabulary',
  listType: 'vocab',
  itemLabel: 'Word',
});
