import { createFinanceDoor } from '../shared/financeitem';

export const budgetDoor = createFinanceDoor({
  id: 'budget',
  name: 'Budget Planner',
  category: 'finance',
  description: 'Plan and manage your budget',
  itemType: 'budget',
  itemLabel: 'Budget Item',
  hasDueDate: false,
});
