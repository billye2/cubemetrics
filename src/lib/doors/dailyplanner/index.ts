import { createChecklistDoor } from '../shared/checklist';

export const dailyplannerDoor = createChecklistDoor({
  id: 'dailyplanner',
  name: 'Daily Planner',
  category: 'tasks',
  description: 'Plan and organize your daily tasks',
  listType: 'dailyplan',
  itemLabel: 'Task',
});
