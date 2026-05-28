import { createChecklistDoor } from '../shared/checklist';

export const flashcardsDoor = createChecklistDoor({
  id: 'flashcards',
  name: 'Flashcards',
  category: 'notes',
  description: 'Create and review flashcards',
  listType: 'flashcard',
  itemLabel: 'Card',
});
