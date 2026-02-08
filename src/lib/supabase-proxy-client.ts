// Re-export from the main Supabase client (Lovable Cloud)
export { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const PUBLIC_API_URL = SUPABASE_URL;
export const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export const originalFetch: typeof fetch = (window as any).__nativeFetch || window.fetch.bind(window);

export function xhrSignIn(email: string, password: string): Promise<{ data: any; error: any }> {
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
