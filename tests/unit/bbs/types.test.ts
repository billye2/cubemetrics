import { describe, it, expect } from 'vitest';
import type { BBSRequest, BBSResponse, BBSSession, BBSProfile, InputType, InputMode } from '@/lib/bbs/types';

describe('BBS Types', () => {
  it('BBSRequest accepts valid input types', () => {
    const req: BBSRequest = { input: 'L', inputType: 'key' };
    expect(req.inputType).toBe('key');

    const req2: BBSRequest = { input: 'hello', inputType: 'line' };
    expect(req2.inputType).toBe('line');

    const req3: BBSRequest = { input: '', inputType: 'refresh' };
    expect(req3.inputType).toBe('refresh');
  });

  it('BBSResponse has required fields', () => {
    const res: BBSResponse = { screen: 'test', inputMode: 'key' };
    expect(res.screen).toBe('test');
    expect(res.inputMode).toBe('key');
    expect(res.prompt).toBeUndefined();
    expect(res.echo).toBeUndefined();
  });

  it('BBSResponse supports optional fields', () => {
    const res: BBSResponse = {
      screen: 'test',
      inputMode: 'line',
      prompt: 'Enter: ',
      echo: false,
    };
    expect(res.prompt).toBe('Enter: ');
    expect(res.echo).toBe(false);
  });

  it('BBSSession has location and state', () => {
    const session: BBSSession = {
      user_id: 'abc',
      current_location: 'door:todo:add',
      door_state: { page: 1 },
      last_activity: '2026-01-01',
      recent_doors: ['todo', 'notes'],
    };
    expect(session.current_location).toBe('door:todo:add');
    expect(session.door_state.page).toBe(1);
  });
});
