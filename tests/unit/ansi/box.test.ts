import { describe, it, expect } from 'vitest';
import { box, divider, horizontalLine } from '@/lib/ansi/box';
import { stripAnsi } from '@/lib/ansi/text';

describe('box', () => {
  it('renders a box with content', () => {
    const result = box(['Hello', 'World'], { width: 20, style: 'single' });
    const lines = result.split('\r\n');
    expect(lines).toHaveLength(4);
    const stripped = lines.map(l => stripAnsi(l));
    expect(stripped[0]).toContain('┌');
    expect(stripped[0]).toContain('┐');
    expect(stripped[1]).toContain('│');
    expect(stripped[3]).toContain('└');
    expect(stripped[3]).toContain('┘');
  });

  it('renders double-style box', () => {
    const result = box(['Test'], { width: 20, style: 'double' });
    const stripped = stripAnsi(result);
    expect(stripped).toContain('╔');
    expect(stripped).toContain('╗');
    expect(stripped).toContain('╚');
    expect(stripped).toContain('╝');
  });

  it('includes title in top border', () => {
    const result = box(['Content'], { width: 30, title: 'MENU' });
    const stripped = stripAnsi(result);
    expect(stripped).toContain('MENU');
  });

  it('respects width parameter', () => {
    const result = box(['Hi'], { width: 40, style: 'single' });
    const lines = result.split('\r\n');
    const topStripped = stripAnsi(lines[0]);
    expect(topStripped.length).toBe(40);
  });
});

describe('divider', () => {
  it('renders a horizontal divider', () => {
    const result = divider({ width: 20, style: 'double' });
    const stripped = stripAnsi(result);
    expect(stripped).toContain('╠');
    expect(stripped).toContain('╣');
  });
});

describe('horizontalLine', () => {
  it('renders a horizontal line of given width', () => {
    const result = horizontalLine({ width: 10, style: 'single' });
    const stripped = stripAnsi(result);
    expect(stripped).toBe('──────────');
  });
});
