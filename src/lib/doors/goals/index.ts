import { createGoalDoor } from '../shared/goaltracker';

export const goalsDoor = createGoalDoor({
  id: 'goals',
  name: 'Goal Tracker',
  category: 'goals',
  description: 'Track SMART goals with progress',
  goalType: 'smart',
  itemLabel: 'Goal',
  hasTarget: true,
});
