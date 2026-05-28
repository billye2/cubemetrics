import { createChecklistDoor } from '../shared/checklist';

export const clienttrackerDoor = createChecklistDoor({
  id: 'clienttracker',
  name: 'Client Tracker',
  category: 'work',
  description: 'Track clients and engagements',
  listType: 'client',
  itemLabel: 'Client',
});
