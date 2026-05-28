import { describe, it, expect } from 'vitest';
import { welcomeScreen } from '@/lib/ansi/art/welcome';
import { stripAnsi } from '@/lib/ansi/text';

describe('Welcome Screen', () => {
  it('contains XPBBS branding', () => {
    const screen = stripAnsi(welcomeScreen());
    expect(screen).toContain('XPBBS');
    expect(screen).toContain('Welcome');
  });

  it('shows login and quit options', () => {
    const screen = stripAnsi(welcomeScreen());
    expect(screen).toContain('[L]');
    expect(screen).toContain('Login');
    expect(screen).toContain('[Q]');
    expect(screen).toContain('Quit');
  });

  it('does not show registration option (OAuth only)', () => {
    const screen = stripAnsi(welcomeScreen());
    expect(screen).not.toContain('[N]');
    expect(screen).not.toContain('New User');
  });

  it('shows stats when provided', () => {
    const screen = stripAnsi(welcomeScreen({ totalUsers: 42, totalCalls: 100, onlineNow: 3 }));
    expect(screen).toContain('42');
    expect(screen).toContain('100');
    expect(screen).toContain('3');
  });

  it('contains box drawing characters', () => {
    const screen = welcomeScreen();
    expect(screen).toContain('╔');
    expect(screen).toContain('╗');
    expect(screen).toContain('╚');
    expect(screen).toContain('╝');
  });
});
