import { createGoalDoor } from '../shared/goaltracker';

export const skilltreeDoor = createGoalDoor({
  id: 'skilltree',
  name: 'Skill Tree',
  category: 'learning',
  description: 'Map and level up your skills',
  goalType: 'skill',
  itemLabel: 'Skill',
  hasTarget: true,
});
