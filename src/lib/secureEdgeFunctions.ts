/**
 * Secure Edge Function caller that routes through the API proxy
 * to hide the Supabase project URL from network inspection.
 */

import { PUBLIC_API_URL } from '@/lib/supabase-proxy-client';
import { supabase } from '@/integrations/supabase/client';

interface InvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

/**
 * Invoke an edge function through the API proxy.
 * This hides the Supabase project URL from network inspection.
 */
export async function invokeSecure<T = unknown>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth header if we have a token
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
      // Use anon key for public functions
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
    }

    const response = await fetch(`${PUBLIC_API_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: new Error(data?.error || `HTTP ${response.status}`),
      };
    }

    return { data: data as T, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
