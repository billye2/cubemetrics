export type UiType =
  | "modern"
  | "tracker"
  | "checklist"
  | "logbook"
  | "goal"
  | "finance";

export interface AppEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  ui: UiType;
  config?: FactoryConfig;
}

export interface FactoryConfig {
  // tracker
  trackerType?: string;
  unit?: string;
  labels?: string[];
  min?: number;
  max?: number;
  aggregate?: "sum" | "latest" | "average";
  // checklist
  listType?: string;
  itemLabel?: string;
  // logbook
  logType?: string;
  entryLabel?: string;
  hasTitle?: boolean;
  // goal
  goalType?: string;
  hasTarget?: boolean;
  // finance
  itemType?: string;
  hasDueDate?: boolean;
  hasAmount?: boolean;
}

export const CATEGORIES: { id: string; label: string }[] = [
  { id: "time", label: "Time & Focus" },
  { id: "tasks", label: "Tasks & Planning" },
  { id: "goals", label: "Goals & Progress" },
  { id: "habits", label: "Habits & Wellness" },
  { id: "notes", label: "Notes & Thinking" },
  { id: "finance", label: "Finance" },
  { id: "learning", label: "Learning & Reading" },
  { id: "org", label: "Organization" },
  { id: "work", label: "Work & Collaboration" },
  { id: "lifestyle", label: "Lifestyle" },
];

export const APPS: AppEntry[] = [
  // Fully modern (custom pages)
  { id: "todo", name: "Todo", category: "tasks", icon: "✓", description: "Tasks and priorities", ui: "modern" },
  { id: "journal", name: "Journal", category: "notes", icon: "✎", description: "Daily entries", ui: "modern" },
  { id: "feedback", name: "Feedback", category: "work", icon: "✦", description: "Suggestions for the product", ui: "modern" },
  { id: "notes", name: "Notes", category: "notes", icon: "✐", description: "Quick notes", ui: "modern" },

  // Trackers
  { id: "mood", name: "Mood", category: "habits", icon: "☺", description: "How you feel", ui: "tracker", config: { trackerType: "mood", labels: ["Awful", "Bad", "Meh", "Okay", "Good", "Great"], min: 0, max: 5, aggregate: "average" } },
  { id: "water", name: "Water", category: "habits", icon: "◐", description: "Glasses of water", ui: "tracker", config: { trackerType: "water", unit: "glasses", min: 0, max: 16, aggregate: "sum" } },
  { id: "sleep", name: "Sleep", category: "habits", icon: "☾", description: "Hours of sleep", ui: "tracker", config: { trackerType: "sleep", unit: "hours", min: 0, max: 14, aggregate: "latest" } },
  { id: "energy", name: "Energy", category: "habits", icon: "✸", description: "Energy level", ui: "tracker", config: { trackerType: "energy", labels: ["Drained", "Low", "Okay", "Good", "High"], min: 0, max: 4, aggregate: "average" } },
  { id: "weight", name: "Weight", category: "habits", icon: "⚖", description: "Weight log", ui: "tracker", config: { trackerType: "weight", unit: "lbs", min: 0, max: 500, aggregate: "latest" } },
  { id: "screentime", name: "Screen Time", category: "habits", icon: "▢", description: "Hours on screens", ui: "tracker", config: { trackerType: "screentime", unit: "hours", min: 0, max: 24, aggregate: "sum" } },
  { id: "writingtracker", name: "Writing", category: "notes", icon: "✑", description: "Words written today", ui: "tracker", config: { trackerType: "writing", unit: "words", min: 0, max: 100000, aggregate: "sum" } },

  // Checklists
  { id: "grocery", name: "Grocery", category: "org", icon: "◍", description: "Shopping list", ui: "checklist", config: { listType: "grocery", itemLabel: "Item" } },
  { id: "wishlist", name: "Wishlist", category: "org", icon: "★", description: "Things to buy", ui: "checklist", config: { listType: "wishlist", itemLabel: "Item" } },
  { id: "packing", name: "Packing", category: "lifestyle", icon: "☐", description: "Packing lists", ui: "checklist", config: { listType: "packing", itemLabel: "Item" } },
  { id: "bucketlist", name: "Bucket List", category: "goals", icon: "☑", description: "Life list", ui: "checklist", config: { listType: "bucket", itemLabel: "Goal" } },
  { id: "bookmarks", name: "Bookmarks", category: "org", icon: "☖", description: "Saved links", ui: "checklist", config: { listType: "bookmark", itemLabel: "Bookmark" } },
  { id: "backlog", name: "Backlog", category: "tasks", icon: "☷", description: "Someday/maybe", ui: "checklist", config: { listType: "backlog", itemLabel: "Item" } },
  { id: "contacts", name: "Contacts", category: "org", icon: "☻", description: "People", ui: "checklist", config: { listType: "contacts", itemLabel: "Contact" } },
  { id: "inventory", name: "Inventory", category: "org", icon: "▦", description: "Things you own", ui: "checklist", config: { listType: "inventory", itemLabel: "Item" } },
  { id: "fileindex", name: "File Index", category: "org", icon: "☰", description: "File catalog", ui: "checklist", config: { listType: "fileindex", itemLabel: "File" } },
  { id: "homemaint", name: "Home", category: "lifestyle", icon: "⌂", description: "Home maintenance", ui: "checklist", config: { listType: "homemaint", itemLabel: "Task" } },
  { id: "cleaning", name: "Cleaning", category: "lifestyle", icon: "✦", description: "Cleaning schedule", ui: "checklist", config: { listType: "cleaning", itemLabel: "Task" } },
  { id: "plantcare", name: "Plants", category: "lifestyle", icon: "✿", description: "Plant care", ui: "checklist", config: { listType: "plantcare", itemLabel: "Plant" } },
  { id: "petcare", name: "Pets", category: "lifestyle", icon: "♥", description: "Pet care", ui: "checklist", config: { listType: "petcare", itemLabel: "Task" } },
  { id: "warranty", name: "Warranties", category: "lifestyle", icon: "☖", description: "Warranty tracking", ui: "checklist", config: { listType: "warranty", itemLabel: "Warranty" } },
  { id: "travelplanner", name: "Travel", category: "lifestyle", icon: "✈", description: "Trip planning", ui: "checklist", config: { listType: "travel", itemLabel: "Item" } },
  { id: "vocabulary", name: "Vocabulary", category: "learning", icon: "✦", description: "Words to learn", ui: "checklist", config: { listType: "vocab", itemLabel: "Word" } },
  { id: "routines", name: "Routines", category: "tasks", icon: "⟳", description: "Recurring sequences", ui: "checklist", config: { listType: "routine", itemLabel: "Routine" } },
  { id: "dailyplanner", name: "Daily Planner", category: "tasks", icon: "☰", description: "Today's plan", ui: "checklist", config: { listType: "dailyplan", itemLabel: "Item" } },
  { id: "visionboard", name: "Vision Board", category: "goals", icon: "✧", description: "Where you're heading", ui: "checklist", config: { listType: "vision", itemLabel: "Vision" } },
  { id: "flashcards", name: "Flashcards", category: "notes", icon: "◫", description: "Cards to review", ui: "checklist", config: { listType: "flashcard", itemLabel: "Card" } },
  { id: "mealplanner", name: "Meals", category: "habits", icon: "◍", description: "Meal planning", ui: "checklist", config: { listType: "meal", itemLabel: "Meal" } },
  { id: "clienttracker", name: "Clients", category: "work", icon: "◉", description: "Client work", ui: "checklist", config: { listType: "client", itemLabel: "Client" } },

  // Logbooks
  { id: "gratitude", name: "Gratitude", category: "habits", icon: "♥", description: "Daily gratitude", ui: "logbook", config: { logType: "gratitude", entryLabel: "Entry", hasTitle: false } },
  { id: "meeting", name: "Meetings", category: "notes", icon: "☻", description: "Meeting notes", ui: "logbook", config: { logType: "meeting", entryLabel: "Meeting", hasTitle: true } },
  { id: "standup", name: "Standups", category: "notes", icon: "⌂", description: "Daily standups", ui: "logbook", config: { logType: "standup", entryLabel: "Standup", hasTitle: false } },
  { id: "brainstorm", name: "Brainstorm", category: "notes", icon: "✺", description: "Idea sessions", ui: "logbook", config: { logType: "brainstorm", entryLabel: "Session", hasTitle: true } },
  { id: "decisionmatrix", name: "Decisions", category: "notes", icon: "◰", description: "Decisions log", ui: "logbook", config: { logType: "decision", entryLabel: "Decision", hasTitle: true } },
  { id: "workout", name: "Workout", category: "habits", icon: "✚", description: "Training log", ui: "modern" },
  { id: "learninglog", name: "Learning Log", category: "learning", icon: "✦", description: "What you learned", ui: "logbook", config: { logType: "learning", entryLabel: "Lesson", hasTitle: true } },
  { id: "weeklyreview", name: "Weekly Review", category: "tasks", icon: "⌗", description: "Reflect each week", ui: "logbook", config: { logType: "weekly", entryLabel: "Review", hasTitle: true } },
  { id: "feedbacklog", name: "Feedback Log", category: "work", icon: "✎", description: "Feedback given/received", ui: "logbook", config: { logType: "feedbacklog", entryLabel: "Entry", hasTitle: true } },
  { id: "oneononep", name: "1-on-1s", category: "work", icon: "☷", description: "1:1 notes", ui: "logbook", config: { logType: "oneonone", entryLabel: "Meeting", hasTitle: true } },
  { id: "retro", name: "Retro", category: "work", icon: "⟲", description: "Team retros", ui: "logbook", config: { logType: "retro", entryLabel: "Retro", hasTitle: true } },
  { id: "recipes", name: "Recipes", category: "lifestyle", icon: "◍", description: "Recipe collection", ui: "logbook", config: { logType: "recipe", entryLabel: "Recipe", hasTitle: true } },

  // Goals
  { id: "goals", name: "Goals", category: "goals", icon: "◎", description: "Long-term goals", ui: "goal", config: { goalType: "smart", hasTarget: true } },
  { id: "okr", name: "OKRs", category: "goals", icon: "◈", description: "Objectives & key results", ui: "goal", config: { goalType: "okr", hasTarget: true } },
  { id: "milestones", name: "Milestones", category: "goals", icon: "◆", description: "Big wins", ui: "goal", config: { goalType: "milestone", hasTarget: false } },
  { id: "streaks", name: "Streaks", category: "goals", icon: "⚡", description: "Consecutive days", ui: "goal", config: { goalType: "streak", hasTarget: false } },
  { id: "courses", name: "Courses", category: "learning", icon: "◧", description: "Course tracking", ui: "goal", config: { goalType: "course", hasTarget: true } },
  { id: "skilltree", name: "Skill Tree", category: "learning", icon: "⌬", description: "Skills to build", ui: "goal", config: { goalType: "skill", hasTarget: false } },
  { id: "projecttracker", name: "Projects", category: "work", icon: "◧", description: "Project status", ui: "goal", config: { goalType: "project", hasTarget: false } },
  { id: "savings", name: "Savings", category: "finance", icon: "◯", description: "Savings goals", ui: "goal", config: { goalType: "savings", hasTarget: true } },
  { id: "debtpayoff", name: "Debt", category: "finance", icon: "⊠", description: "Payoff plan", ui: "goal", config: { goalType: "debt", hasTarget: true } },

  // Finance items
  { id: "budget", name: "Budget", category: "finance", icon: "⊟", description: "Monthly budget", ui: "finance", config: { itemType: "budget", hasAmount: true } },
  { id: "bills", name: "Bills", category: "finance", icon: "⌗", description: "Bills due", ui: "finance", config: { itemType: "bill", hasAmount: true, hasDueDate: true } },
  { id: "subscriptions", name: "Subscriptions", category: "finance", icon: "⟳", description: "Recurring charges", ui: "finance", config: { itemType: "subscription", hasAmount: true } },
  { id: "invoices", name: "Invoices", category: "work", icon: "⌗", description: "Billing", ui: "finance", config: { itemType: "invoice", hasAmount: true, hasDueDate: true } },

  // Tracker-backed time apps (minutes logged per session)
  { id: "focus", name: "Focus", category: "time", icon: "◉", description: "Timer for one deep-work session", ui: "modern" },
  { id: "timetracker", name: "Time Tracker", category: "time", icon: "⌚", description: "Log where your day went, by category", ui: "modern" },
  { id: "countdown", name: "Countdown", category: "time", icon: "⏳", description: "Live countdown to upcoming dates", ui: "modern" },
  { id: "meditation", name: "Meditation", category: "time", icon: "☯", description: "Minutes meditated", ui: "tracker", config: { trackerType: "meditation", unit: "minutes", min: 0, max: 240, aggregate: "sum" } },
  { id: "stopwatch", name: "Stopwatch", category: "time", icon: "⏲", description: "Time anything", ui: "tracker", config: { trackerType: "stopwatch", unit: "minutes", min: 0, max: 1440, aggregate: "sum" } },
  { id: "calendar", name: "Calendar", category: "org", icon: "◰", description: "Events", ui: "modern" },

  // Modern custom pages for stateful / specialized apps
  { id: "pomodoro", name: "Pomodoro", category: "time", icon: "⏱", description: "Focus timer", ui: "modern" },
  { id: "expenses", name: "Expenses", category: "finance", icon: "⟢", description: "Track spending", ui: "modern" },
  { id: "reading", name: "Reading", category: "learning", icon: "☐", description: "Books and articles", ui: "modern" },
  { id: "habits", name: "Habits", category: "habits", icon: "⊙", description: "Daily habits", ui: "modern" },
];

export function getApp(id: string): AppEntry | undefined {
  return APPS.find((a) => a.id === id);
}

export function getAppsByCategory(categoryId: string): AppEntry[] {
  return APPS.filter((a) => a.category === categoryId);
}
