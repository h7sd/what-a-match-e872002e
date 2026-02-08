import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get env vars - Lovable Cloud provides these automatically
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Validate that we have the required config
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.');
}

// Create the Supabase client
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Public API URL
export const PUBLIC_API_URL = SUPABASE_URL;
export const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';

// Native fetch reference for edge cases
export const originalFetch: typeof fetch = typeof window !== 'undefined' 
  ? ((window as any).__nativeFetch || window.fetch.bind(window))
  : fetch;

// XHR-based sign in as fallback
export function xhrSignIn(email: string, password: string): Promise<{ data: any; error: any }> {
  return new Promise((resolve) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      resolve({ data: null, error: { message: 'Supabase not configured', status: 500 } });
      return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/auth/v1/token?grant_type=password`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: body, error: null });
        } else {
          resolve({ data: null, error: { message: body.msg || body.message || body.error_description || 'Authentication failed', status: xhr.status } });
        }
      } catch {
        resolve({ data: null, error: { message: 'Failed to parse auth response', status: xhr.status } });
      }
    };
    xhr.onerror = () => {
      resolve({ data: null, error: { message: 'Network error during authentication', status: 0 } });
    };
    xhr.send(JSON.stringify({ email, password }));
  });
}
