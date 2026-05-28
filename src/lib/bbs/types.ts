export type InputType = 'key' | 'line' | 'refresh';
export type InputMode = 'key' | 'line';

export interface BBSRequest {
  input: string;
  inputType: InputType;
}

export interface BBSResponse {
  screen: string;
  inputMode: InputMode;
  prompt?: string;
  echo?: boolean;
}

export interface BBSSession {
  user_id: string;
  current_location: string;
  door_state: Record<string, unknown>;
  last_activity: string;
  recent_doors: string[];
}

export interface BBSProfile {
  id: string;
  handle: string;
  role: 'user' | 'sysop';
  level: number;
  total_calls: number;
  last_login: string | null;
  first_login: string;
  bio: string;
  location: string;
  created_at: string;
}

export interface Door {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  handle(
    input: string,
    inputType: InputType,
    userId: string,
    session: BBSSession,
    supabase: SupabaseClient
  ): Promise<BBSResponse>;
}

// Re-export for convenience — actual type comes from @supabase/supabase-js
import type { SupabaseClient } from '@supabase/supabase-js';
export type { SupabaseClient };
