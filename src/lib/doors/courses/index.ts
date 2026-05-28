import { createGoalDoor } from '../shared/goaltracker';

export const coursesDoor = createGoalDoor({
  id: 'courses',
  name: 'Course Tracker',
  category: 'learning',
  description: 'Track course progress and completion',
  goalType: 'course',
  itemLabel: 'Course',
  hasTarget: true,
});
