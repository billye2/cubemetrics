import { describe, it, expect } from 'vitest';

const API_URL = process.env.BBS_API_URL || 'https://cubemetrics.com';

async function send(input: string, inputType: 'key' | 'line' | 'refresh') {
  const res = await fetch(`${API_URL}/api/bbs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, inputType }),
  });
  return res.json();
}

function strip(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('BBS API E2E', () => {
  it('returns welcome screen on refresh', async () => {
    const res = await send('', 'refresh');
    expect(res.inputMode).toBe('key');
    expect(res.screen).toBeTruthy();
    const text = strip(res.screen);
    expect(text).toContain('XPBBS');
    expect(text).toContain('[L]');
    expect(text).toContain('[Q]');
  });

  it('returns screen with ANSI escape codes', async () => {
    const res = await send('', 'refresh');
    expect(res.screen).toContain('\x1b[');
  });

  it('handles login trigger', async () => {
    const res = await send('L', 'key');
    expect(res.prompt).toBe('__OAUTH_GOOGLE__');
  });

  it('handles quit command', async () => {
    const res = await send('Q', 'key');
    const text = strip(res.screen);
    expect(text).toContain('Goodbye');
  });

  it('returns key inputMode for welcome screen', async () => {
    const res = await send('', 'refresh');
    expect(res.inputMode).toBe('key');
  });

  it('ignores invalid keys at welcome', async () => {
    const res = await send('Z', 'key');
    const text = strip(res.screen);
    expect(text).toContain('XPBBS');
  });

  it('responds to POST with JSON content type', async () => {
    const res = await fetch(`${API_URL}/api/bbs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '', inputType: 'refresh' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('OAuth login endpoint returns redirect', async () => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      redirect: 'manual',
    });
    expect([302, 307, 308]).toContain(res.status);
  });
});
