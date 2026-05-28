import { describe, it, expect } from 'vitest';
import { doorRegistry } from '@/lib/doors/registry';

describe('Door Registry', () => {
  it('has 50+ doors registered', () => {
    const all = doorRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(50);
  });

  it('every door has required fields', () => {
    for (const door of doorRegistry.getAll()) {
      expect(door.id).toBeTruthy();
      expect(door.name).toBeTruthy();
      expect(door.category).toBeTruthy();
      expect(door.description).toBeTruthy();
      expect(door.version).toBeTruthy();
      expect(typeof door.handle).toBe('function');
    }
  });

  it('every door has a unique id', () => {
    const ids = doorRegistry.getAll().map(d => d.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all 10 categories have doors', () => {
    const expectedCategories = [
      'time', 'tasks', 'goals', 'habits', 'notes',
      'finance', 'learning', 'org', 'work', 'lifestyle',
    ];
    for (const cat of expectedCategories) {
      const doors = doorRegistry.getByCategory(cat);
      expect(doors.length, `category "${cat}" should have doors`).toBeGreaterThan(0);
    }
  });

  it('can look up doors by id', () => {
    expect(doorRegistry.get('todo')).toBeDefined();
    expect(doorRegistry.get('journal')).toBeDefined();
    expect(doorRegistry.get('calendar')).toBeDefined();
    expect(doorRegistry.get('pomodoro')).toBeDefined();
    expect(doorRegistry.get('habits')).toBeDefined();
    expect(doorRegistry.get('expenses')).toBeDefined();
    expect(doorRegistry.get('notes')).toBeDefined();
    expect(doorRegistry.get('reading')).toBeDefined();
  });

  it('returns undefined for unknown door', () => {
    expect(doorRegistry.get('nonexistent')).toBeUndefined();
  });

  it('time category has timer-related doors', () => {
    const timeDoors = doorRegistry.getByCategory('time');
    const ids = timeDoors.map(d => d.id);
    expect(ids).toContain('pomodoro');
    expect(ids).toContain('focus');
    expect(ids).toContain('meditation');
  });

  it('finance category has money-related doors', () => {
    const financeDoors = doorRegistry.getByCategory('finance');
    const ids = financeDoors.map(d => d.id);
    expect(ids).toContain('expenses');
    expect(ids).toContain('budget');
    expect(ids).toContain('bills');
  });
});
