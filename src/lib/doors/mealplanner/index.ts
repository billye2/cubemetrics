import { createChecklistDoor } from '../shared/checklist';

export const mealplannerDoor = createChecklistDoor({
  id: 'mealplanner',
  name: 'Meal Planner',
  category: 'habits',
  description: 'Plan meals for the week',
  listType: 'mealplan',
  itemLabel: 'Meal',
});
