// Re-export from the official Lovable Cloud client
// This file exists for backwards compatibility
export { supabase } from '@/integrations/supabase/client';

// Public API URL from the Lovable Cloud Supabase instance
export const PUBLIC_API_URL = import.meta.env.VITE_SUPABASE_URL;
export const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

// Native fetch reference for edge cases
export const originalFetch: typeof fetch = (window as any).__nativeFetch || window.fetch.bind(window);

// XHR-based sign in as fallback (rarely needed)
export function xhrSignIn(email: string, password: string): Promise<{ data: any; error: any }> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  return new Promise((resolve) => {
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
