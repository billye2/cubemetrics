import { describe, it, expect } from 'vitest';
import { menu } from '@/lib/ansi/menu';
import { stripAnsi } from '@/lib/ansi/text';

describe('menu', () => {
  it('renders menu with title and items', () => {
    const result = menu({
      title: 'MAIN MENU',
      items: [
        { key: '1', label: 'Option One' },
        { key: '2', label: 'Option Two' },
        { key: 'Q', label: 'Quit' },
      ],
    });
    const stripped = stripAnsi(result);
    expect(stripped).toContain('MAIN MENU');
    expect(stripped).toContain('[1]');
    expect(stripped).toContain('Option One');
    expect(stripped).toContain('[2]');
    expect(stripped).toContain('[Q]');
    expect(stripped).toContain('Quit');
  });

  it('includes footer when provided', () => {
    const result = menu({
      title: 'TEST',
      items: [{ key: '1', label: 'Test' }],
      footer: 'Press Q to quit',
    });
    const stripped = stripAnsi(result);
    expect(stripped).toContain('Press Q to quit');
  });

  it('renders all item keys as bracket-enclosed', () => {
    const result = menu({
      title: 'TEST',
      items: [
        { key: 'A', label: 'Alpha' },
        { key: 'B', label: 'Beta' },
      ],
    });
    const stripped = stripAnsi(result);
    expect(stripped).toContain('[A]');
    expect(stripped).toContain('[B]');
  });
});
