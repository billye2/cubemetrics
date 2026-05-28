import { createFinanceDoor } from '../shared/financeitem';

export const billsDoor = createFinanceDoor({
  id: 'bills',
  name: 'Bill Tracker',
  category: 'finance',
  description: 'Track bills and due dates',
  itemType: 'bill',
  itemLabel: 'Bill',
  hasDueDate: true,
});
