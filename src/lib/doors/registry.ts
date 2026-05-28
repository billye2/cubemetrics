import type { Door } from './base';

// Phase 1 — original 8 doors
import { todoDoor } from './todo';
import { journalDoor } from './journal';
import { calendarDoor } from './calendar';
import { pomodoroDoor } from './pomodoro';
import { habitsDoor } from './habits';
import { expensesDoor } from './expenses';
import { notesDoor } from './notes';
import { readingDoor } from './reading';

// Trackers
import { moodDoor } from './mood';
import { waterDoor } from './water';
import { sleepDoor } from './sleep';
import { energyDoor } from './energy';
import { weightDoor } from './weight';
import { screentimeDoor } from './screentime';

// Checklists
import { groceryDoor } from './grocery';
import { wishlistDoor } from './wishlist';
import { packingDoor } from './packing';
import { bucketlistDoor } from './bucketlist';
import { bookmarksDoor } from './bookmarks';

// Logbooks
import { gratitudeDoor } from './gratitude';
import { meetingDoor } from './meeting';
import { standupDoor } from './standup';
import { workoutDoor } from './workout';
import { learninglogDoor } from './learninglog';
import { feedbacklogDoor } from './feedbacklog';

// Goals
import { goalsDoor } from './goals';
import { okrDoor } from './okr';
import { streaksDoor } from './streaks';
import { milestonesDoor } from './milestones';
import { visionboardDoor } from './visionboard';

// Finance
import { budgetDoor } from './budget';
import { billsDoor } from './bills';
import { subscriptionsDoor } from './subscriptions';
import { savingsDoor } from './savings';
import { debtpayoffDoor } from './debtpayoff';

// Time
import { focusDoor } from './focus';
import { timetrackerDoor } from './timetracker';
import { countdownDoor } from './countdown';
import { meditationDoor } from './meditation';
import { stopwatchDoor } from './stopwatch';

// Tasks
import { dailyplannerDoor } from './dailyplanner';
import { weeklyreviewDoor } from './weeklyreview';
import { routinesDoor } from './routines';
import { backlogDoor } from './backlog';

// Notes
import { brainstormDoor } from './brainstorm';
import { flashcardsDoor } from './flashcards';
import { writingtrackerDoor } from './writingtracker';
import { decisionmatrixDoor } from './decisionmatrix';

// Learning
import { coursesDoor } from './courses';
import { vocabularyDoor } from './vocabulary';
import { skilltreeDoor } from './skilltree';

// Organization
import { contactsDoor } from './contacts';
import { inventoryDoor } from './inventory';
import { fileindexDoor } from './fileindex';

// Work
import { retroDoor } from './retro';
import { oneononepDoor } from './oneononep';
import { projecttrackerDoor } from './projecttracker';
import { clienttrackerDoor } from './clienttracker';
import { invoicesDoor } from './invoices';
import { feedbackDoor } from './feedback';

// Lifestyle
import { recipesDoor } from './recipes';
import { travelplannerDoor } from './travelplanner';
import { cleaningDoor } from './cleaning';
import { plantcareDoor } from './plantcare';
import { petcareDoor } from './petcare';
import { homemaintDoor } from './homemaint';
import { warrantyDoor } from './warranty';
import { mealplannerDoor } from './mealplanner';

class DoorRegistry {
  private doors = new Map<string, Door>();

  register(door: Door) {
    this.doors.set(door.id, door);
  }

  get(id: string): Door | undefined {
    return this.doors.get(id);
  }

  getByCategory(category: string): Door[] {
    return Array.from(this.doors.values()).filter(d => d.category === category);
  }

  getAll(): Door[] {
    return Array.from(this.doors.values());
  }
}

export const doorRegistry = new DoorRegistry();

const allDoors: Door[] = [
  // Time & Focus
  pomodoroDoor, focusDoor, timetrackerDoor, countdownDoor, meditationDoor, stopwatchDoor,
  // Tasks & Planning
  todoDoor, dailyplannerDoor, weeklyreviewDoor, routinesDoor, backlogDoor,
  // Goals & Progress
  goalsDoor, okrDoor, streaksDoor, milestonesDoor, visionboardDoor, bucketlistDoor,
  // Habits & Wellness
  habitsDoor, moodDoor, waterDoor, sleepDoor, energyDoor, weightDoor,
  workoutDoor, mealplannerDoor, screentimeDoor, gratitudeDoor,
  // Notes & Thinking
  journalDoor, notesDoor, meetingDoor, standupDoor, brainstormDoor,
  flashcardsDoor, writingtrackerDoor, decisionmatrixDoor,
  // Finance
  expensesDoor, budgetDoor, billsDoor, subscriptionsDoor, savingsDoor, debtpayoffDoor,
  // Learning & Reading
  readingDoor, coursesDoor, vocabularyDoor, learninglogDoor, skilltreeDoor,
  // Organization
  bookmarksDoor, contactsDoor, groceryDoor, inventoryDoor, calendarDoor, fileindexDoor, wishlistDoor,
  // Work & Collaboration
  retroDoor, oneononepDoor, feedbacklogDoor, projecttrackerDoor, clienttrackerDoor, invoicesDoor, feedbackDoor,
  // Lifestyle
  recipesDoor, travelplannerDoor, packingDoor, cleaningDoor, plantcareDoor,
  petcareDoor, homemaintDoor, warrantyDoor,
];

for (const door of allDoors) {
  doorRegistry.register(door);
}
