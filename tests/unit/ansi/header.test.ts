import { describe, it, expect } from 'vitest';
import { bbsBanner, sectionHeader } from '@/lib/ansi/header';
import { stripAnsi } from '@/lib/ansi/text';

describe('bbsBanner', () => {
  it('contains XPBBS text', () => {
    const result = stripAnsi(bbsBanner());
    expect(result).toContain('XPBBS v1.0');
  });

  it('contains ASCII art block characters', () => {
    const result = bbsBanner();
    expect(result).toContain('██');
  });
});

describe('sectionHeader', () => {
  it('wraps title in asterisks and uppercase', () => {
    const result = stripAnsi(sectionHeader('test'));
    expect(result).toContain('*** TEST ***');
  });
});
