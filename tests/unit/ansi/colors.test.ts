import { describe, it, expect } from 'vitest';
import { FG, BG, RESET, BOLD, DIM, theme } from '@/lib/ansi/colors';

describe('ANSI Colors', () => {
  it('exports exactly 8 foreground colors', () => {
    expect(Object.keys(FG)).toHaveLength(8);
  });

  it('exports exactly 8 background colors', () => {
    expect(Object.keys(BG)).toHaveLength(8);
  });

  it('does not export bright color variants', () => {
    const keys = Object.keys(FG);
    const brightKeys = keys.filter(k => k.startsWith('bright'));
    expect(brightKeys).toHaveLength(0);
  });

  it('does not export BLINK', () => {
    const exports = { FG, BG, RESET, BOLD, DIM };
    expect('BLINK' in exports).toBe(false);
  });

  it('FG codes use 30-37 range', () => {
    const values = Object.values(FG);
    for (const v of values) {
      const code = parseInt(v.match(/\[(\d+)m/)?.[1] || '0');
      expect(code).toBeGreaterThanOrEqual(30);
      expect(code).toBeLessThanOrEqual(37);
    }
  });

  it('theme uses only valid color references', () => {
    for (const value of Object.values(theme)) {
      expect(value).toContain('\x1b[');
    }
  });
});
