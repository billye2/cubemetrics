import { createFinanceDoor } from '../shared/financeitem';

export const debtpayoffDoor = createFinanceDoor({
  id: 'debtpayoff',
  name: 'Debt Payoff',
  category: 'finance',
  description: 'Track and pay off debts',
  itemType: 'debt',
  itemLabel: 'Debt',
  hasDueDate: true,
});
