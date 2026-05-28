import { describe, it, expect } from 'vitest';
import { stripAnsi, visibleLength, center, padRight, padLeft, truncate, wordWrap, colorize } from '@/lib/ansi/text';
import { FG, RESET, BOLD } from '@/lib/ansi/colors';

describe('stripAnsi', () => {
  it('removes ANSI escape codes', () => {
    expect(stripAnsi(`${FG.red}hello${RESET}`)).toBe('hello');
  });

  it('returns plain text unchanged', () => {
    expect(stripAnsi('hello')).toBe('hello');
  });

  it('handles multiple codes', () => {
    expect(stripAnsi(`${BOLD}${FG.cyan}test${RESET}`)).toBe('test');
  });
});

describe('visibleLength', () => {
  it('returns length excluding ANSI codes', () => {
    expect(visibleLength(`${FG.red}hello${RESET}`)).toBe(5);
  });

  it('returns plain text length', () => {
    expect(visibleLength('hello')).toBe(5);
  });
});

describe('center', () => {
  it('centers text in given width', () => {
    const result = center('hi', 10);
    expect(result).toBe('    hi');
  });

  it('returns text unchanged if wider than width', () => {
    const result = center('hello world', 5);
    expect(result).toBe('hello world');
  });
});

describe('padRight', () => {
  it('pads text to given width', () => {
    expect(padRight('hi', 5)).toBe('hi   ');
  });

  it('returns text unchanged if already wider', () => {
    expect(padRight('hello', 3)).toBe('hello');
  });
});

describe('padLeft', () => {
  it('pads text on the left', () => {
    expect(padLeft('hi', 5)).toBe('   hi');
  });
});

describe('truncate', () => {
  it('truncates long text with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('returns short text unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });
});

describe('wordWrap', () => {
  it('wraps text at word boundaries', () => {
    const lines = wordWrap('one two three four', 10);
    expect(lines).toEqual(['one two', 'three four']);
  });

  it('handles single word longer than width', () => {
    const lines = wordWrap('superlongword', 5);
    expect(lines).toEqual(['superlongword']);
  });
});

describe('colorize', () => {
  it('wraps text with color codes and reset', () => {
    const result = colorize('hello', FG.red, BOLD);
    expect(result).toBe(`${FG.red}${BOLD}hello${RESET}`);
  });
});
