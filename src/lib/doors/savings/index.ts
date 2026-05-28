import { createGoalDoor } from '../shared/goaltracker';

export const savingsDoor = createGoalDoor({
  id: 'savings',
  name: 'Savings Goals',
  category: 'finance',
  description: 'Set and track savings goals',
  goalType: 'savings',
  itemLabel: 'Goal',
  hasTarget: true,
});
