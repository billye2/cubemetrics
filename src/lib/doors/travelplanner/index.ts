import { createChecklistDoor } from '../shared/checklist';

export const travelplannerDoor = createChecklistDoor({
  id: 'travelplanner',
  name: 'Travel Planner',
  category: 'lifestyle',
  description: 'Plan and organize travel itineraries',
  listType: 'travel',
  itemLabel: 'Item',
});
