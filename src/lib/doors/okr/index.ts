import { createGoalDoor } from '../shared/goaltracker';

export const okrDoor = createGoalDoor({
  id: 'okr',
  name: 'OKR Tracker',
  category: 'goals',
  description: 'Track objectives and key results',
  goalType: 'okr',
  itemLabel: 'Objective',
  hasTarget: true,
});
