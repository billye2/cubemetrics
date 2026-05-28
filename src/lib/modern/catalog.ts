export interface AppEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  modern: boolean;
}

export const CATEGORIES: { id: string; label: string }[] = [
  { id: 'time', label: 'Time & Focus' },
  { id: 'tasks', label: 'Tasks & Planning' },
  { id: 'goals', label: 'Goals & Progress' },
  { id: 'habits', label: 'Habits & Wellness' },
  { id: 'notes', label: 'Notes & Thinking' },
  { id: 'finance', label: 'Finance' },
  { id: 'learning', label: 'Learning & Reading' },
  { id: 'org', label: 'Organization' },
  { id: 'work', label: 'Work & Collaboration' },
  { id: 'lifestyle', label: 'Lifestyle' },
];

export const APPS: AppEntry[] = [
  { id: 'todo', name: 'Todo', category: 'tasks', icon: '✓', description: 'Tasks and priorities', modern: true },
  { id: 'journal', name: 'Journal', category: 'notes', icon: '✎', description: 'Daily entries', modern: true },
  { id: 'feedback', name: 'Feedback', category: 'work', icon: '✦', description: 'Suggestions for the product', modern: true },

  { id: 'pomodoro', name: 'Pomodoro', category: 'time', icon: '⏱', description: 'Focus timer', modern: false },
  { id: 'focus', name: 'Focus', category: 'time', icon: '◉', description: 'Deep work sessions', modern: false },
  { id: 'timetracker', name: 'Time Tracker', category: 'time', icon: '⌚', description: 'Track where time goes', modern: false },
  { id: 'countdown', name: 'Countdown', category: 'time', icon: '⏳', description: 'Important dates', modern: false },
  { id: 'meditation', name: 'Meditation', category: 'time', icon: '☯', description: 'Mindfulness sessions', modern: false },
  { id: 'stopwatch', name: 'Stopwatch', category: 'time', icon: '⏲', description: 'Time anything', modern: false },

  { id: 'dailyplanner', name: 'Daily Planner', category: 'tasks', icon: '☰', description: 'Plan your day', modern: false },
  { id: 'weeklyreview', name: 'Weekly Review', category: 'tasks', icon: '⌗', description: 'Reflect each week', modern: false },
  { id: 'routines', name: 'Routines', category: 'tasks', icon: '⟳', description: 'Recurring sequences', modern: false },
  { id: 'backlog', name: 'Backlog', category: 'tasks', icon: '☷', description: 'Someday/maybe', modern: false },

  { id: 'goals', name: 'Goals', category: 'goals', icon: '◎', description: 'Long-term goals', modern: false },
  { id: 'okr', name: 'OKRs', category: 'goals', icon: '◈', description: 'Objectives & key results', modern: false },
  { id: 'streaks', name: 'Streaks', category: 'goals', icon: '⚡', description: 'Consecutive days', modern: false },
  { id: 'milestones', name: 'Milestones', category: 'goals', icon: '◆', description: 'Big wins', modern: false },
  { id: 'visionboard', name: 'Vision Board', category: 'goals', icon: '✧', description: 'Where you’re heading', modern: false },
  { id: 'bucketlist', name: 'Bucket List', category: 'goals', icon: '☑', description: 'Life list', modern: false },

  { id: 'habits', name: 'Habits', category: 'habits', icon: '⊙', description: 'Daily habits', modern: false },
  { id: 'mood', name: 'Mood', category: 'habits', icon: '☺', description: 'How you feel', modern: false },
  { id: 'water', name: 'Water', category: 'habits', icon: '◐', description: 'Hydration log', modern: false },
  { id: 'sleep', name: 'Sleep', category: 'habits', icon: '☾', description: 'Sleep tracking', modern: false },
  { id: 'energy', name: 'Energy', category: 'habits', icon: '✸', description: 'Energy levels', modern: false },
  { id: 'weight', name: 'Weight', category: 'habits', icon: '⚖', description: 'Weight log', modern: false },
  { id: 'workout', name: 'Workout', category: 'habits', icon: '✚', description: 'Training log', modern: false },
  { id: 'mealplanner', name: 'Meals', category: 'habits', icon: '◍', description: 'Meal planning', modern: false },
  { id: 'screentime', name: 'Screen Time', category: 'habits', icon: '▢', description: 'Digital usage', modern: false },
  { id: 'gratitude', name: 'Gratitude', category: 'habits', icon: '♥', description: 'Daily gratitude', modern: false },

  { id: 'notes', name: 'Notes', category: 'notes', icon: '✐', description: 'Quick notes', modern: false },
  { id: 'meeting', name: 'Meetings', category: 'notes', icon: '☻', description: 'Meeting notes', modern: false },
  { id: 'standup', name: 'Standups', category: 'notes', icon: '⌂', description: 'Daily standups', modern: false },
  { id: 'brainstorm', name: 'Brainstorm', category: 'notes', icon: '✺', description: 'Idea sessions', modern: false },
  { id: 'flashcards', name: 'Flashcards', category: 'notes', icon: '◫', description: 'Spaced repetition', modern: false },
  { id: 'writingtracker', name: 'Writing', category: 'notes', icon: '✑', description: 'Writing progress', modern: false },
  { id: 'decisionmatrix', name: 'Decisions', category: 'notes', icon: '◰', description: 'Weighted decisions', modern: false },

  { id: 'expenses', name: 'Expenses', category: 'finance', icon: '⟢', description: 'Track spending', modern: false },
  { id: 'budget', name: 'Budget', category: 'finance', icon: '⊟', description: 'Monthly budget', modern: false },
  { id: 'bills', name: 'Bills', category: 'finance', icon: '⌗', description: 'Bills due', modern: false },
  { id: 'subscriptions', name: 'Subscriptions', category: 'finance', icon: '⟳', description: 'Recurring charges', modern: false },
  { id: 'savings', name: 'Savings', category: 'finance', icon: '◯', description: 'Savings goals', modern: false },
  { id: 'debtpayoff', name: 'Debt', category: 'finance', icon: '⊠', description: 'Payoff plan', modern: false },

  { id: 'reading', name: 'Reading', category: 'learning', icon: '☐', description: 'Books and articles', modern: false },
  { id: 'courses', name: 'Courses', category: 'learning', icon: '◧', description: 'Course tracking', modern: false },
  { id: 'vocabulary', name: 'Vocabulary', category: 'learning', icon: '✦', description: 'Words to learn', modern: false },
  { id: 'learninglog', name: 'Learning Log', category: 'learning', icon: '✦', description: 'What you learned', modern: false },
  { id: 'skilltree', name: 'Skill Tree', category: 'learning', icon: '⌬', description: 'Skills to build', modern: false },

  { id: 'bookmarks', name: 'Bookmarks', category: 'org', icon: '☖', description: 'Saved links', modern: false },
  { id: 'contacts', name: 'Contacts', category: 'org', icon: '☻', description: 'People', modern: false },
  { id: 'grocery', name: 'Grocery', category: 'org', icon: '◍', description: 'Shopping list', modern: false },
  { id: 'inventory', name: 'Inventory', category: 'org', icon: '▦', description: 'Things you own', modern: false },
  { id: 'calendar', name: 'Calendar', category: 'org', icon: '◰', description: 'Events', modern: false },
  { id: 'fileindex', name: 'File Index', category: 'org', icon: '☰', description: 'File catalog', modern: false },
  { id: 'wishlist', name: 'Wishlist', category: 'org', icon: '★', description: 'Things to buy', modern: false },

  { id: 'retro', name: 'Retro', category: 'work', icon: '⟲', description: 'Team retros', modern: false },
  { id: 'oneononep', name: '1-on-1s', category: 'work', icon: '☷', description: '1:1 notes', modern: false },
  { id: 'feedbacklog', name: 'Feedback Log', category: 'work', icon: '✎', description: 'Feedback given/received', modern: false },
  { id: 'projecttracker', name: 'Projects', category: 'work', icon: '◧', description: 'Project status', modern: false },
  { id: 'clienttracker', name: 'Clients', category: 'work', icon: '◉', description: 'Client work', modern: false },
  { id: 'invoices', name: 'Invoices', category: 'work', icon: '⌗', description: 'Billing', modern: false },

  { id: 'recipes', name: 'Recipes', category: 'lifestyle', icon: '◍', description: 'Recipe collection', modern: false },
  { id: 'travelplanner', name: 'Travel', category: 'lifestyle', icon: '✈', description: 'Trip planning', modern: false },
  { id: 'packing', name: 'Packing', category: 'lifestyle', icon: '☐', description: 'Packing lists', modern: false },
  { id: 'cleaning', name: 'Cleaning', category: 'lifestyle', icon: '✦', description: 'Cleaning schedule', modern: false },
  { id: 'plantcare', name: 'Plants', category: 'lifestyle', icon: '✿', description: 'Plant care', modern: false },
  { id: 'petcare', name: 'Pets', category: 'lifestyle', icon: '♥', description: 'Pet care', modern: false },
  { id: 'homemaint', name: 'Home', category: 'lifestyle', icon: '⌂', description: 'Home maintenance', modern: false },
  { id: 'warranty', name: 'Warranties', category: 'lifestyle', icon: '☖', description: 'Warranty tracking', modern: false },
];

export function getApp(id: string): AppEntry | undefined {
  return APPS.find((a) => a.id === id);
}

export function getAppsByCategory(categoryId: string): AppEntry[] {
  return APPS.filter((a) => a.category === categoryId);
}
