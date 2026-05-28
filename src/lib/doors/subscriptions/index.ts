import { createFinanceDoor } from '../shared/financeitem';

export const subscriptionsDoor = createFinanceDoor({
  id: 'subscriptions',
  name: 'Subscription Manager',
  category: 'finance',
  description: 'Manage recurring subscriptions',
  itemType: 'subscription',
  itemLabel: 'Subscription',
  hasDueDate: false,
});
