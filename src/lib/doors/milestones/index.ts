import { createGoalDoor } from '../shared/goaltracker';

export const milestonesDoor = createGoalDoor({
  id: 'milestones',
  name: 'Milestone Tracker',
  category: 'goals',
  description: 'Track milestones and key achievements',
  goalType: 'milestone',
  itemLabel: 'Milestone',
  hasTarget: true,
});
