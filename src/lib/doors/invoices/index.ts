import { createFinanceDoor } from '../shared/financeitem';

export const invoicesDoor = createFinanceDoor({
  id: 'invoices',
  name: 'Invoice Tracker',
  category: 'work',
  description: 'Track invoices and payments',
  itemType: 'invoice',
  itemLabel: 'Invoice',
  hasDueDate: true,
});
