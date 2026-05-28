import { describe, it, expect } from 'vitest';
import { progressBar, streakDisplay } from '@/lib/ansi/progress';
import { stripAnsi } from '@/lib/ansi/text';

describe('progressBar', () => {
  it('shows 0% for zero progress', () => {
    const result = stripAnsi(progressBar(0, 100));
    expect(result).toContain('0%');
  });

  it('shows 100% for complete progress', () => {
    const result = stripAnsi(progressBar(100, 100));
    expect(result).toContain('100%');
  });

  it('shows 50% for half progress', () => {
    const result = stripAnsi(progressBar(50, 100));
    expect(result).toContain('50%');
  });

  it('clamps to 100% when over target', () => {
    const result = stripAnsi(progressBar(150, 100));
    expect(result).toContain('100%');
  });
});

describe('streakDisplay', () => {
  it('shows no streak for zero', () => {
    const result = stripAnsi(streakDisplay(0));
    expect(result).toContain('No streak');
  });

  it('shows streak count for positive values', () => {
    const result = stripAnsi(streakDisplay(5));
    expect(result).toContain('5 day streak');
  });
});
