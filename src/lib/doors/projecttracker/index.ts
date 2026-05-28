import { createGoalDoor } from '../shared/goaltracker';

export const projecttrackerDoor = createGoalDoor({
  id: 'projecttracker',
  name: 'Project Tracker',
  category: 'work',
  description: 'Track project progress and milestones',
  goalType: 'project',
  itemLabel: 'Project',
  hasTarget: true,
});
