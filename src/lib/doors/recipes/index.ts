import { createLogbookDoor } from '../shared/logbook';

export const recipesDoor = createLogbookDoor({
  id: 'recipes',
  name: 'Recipe Box',
  category: 'lifestyle',
  description: 'Collect and organize recipes',
  logType: 'recipe',
  entryLabel: 'Recipe',
});
