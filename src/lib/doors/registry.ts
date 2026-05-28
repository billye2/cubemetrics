import type { Door } from './base';
import { todoDoor } from './todo';
import { journalDoor } from './journal';
import { calendarDoor } from './calendar';
import { pomodoroDoor } from './pomodoro';
import { habitsDoor } from './habits';
import { expensesDoor } from './expenses';
import { notesDoor } from './notes';
import { readingDoor } from './reading';

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

// Register all doors
doorRegistry.register(todoDoor);
doorRegistry.register(journalDoor);
doorRegistry.register(calendarDoor);
doorRegistry.register(pomodoroDoor);
doorRegistry.register(habitsDoor);
doorRegistry.register(expensesDoor);
doorRegistry.register(notesDoor);
doorRegistry.register(readingDoor);
