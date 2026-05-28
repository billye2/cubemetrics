import { createGoalDoor } from '../shared/goaltracker';

export const streaksDoor = createGoalDoor({
  id: 'streaks',
  name: 'Streak Counter',
  category: 'goals',
  description: 'Track consecutive day streaks',
  goalType: 'streak',
  itemLabel: 'Streak',
  hasTarget: false,
});
