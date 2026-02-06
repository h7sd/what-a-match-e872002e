/**
 * Secure backend function caller.
 *
 * - Uses the app's existing auth session (so MFA-required calls work)
 * - Calls functions via PUBLIC_API_URL (derived from the backend project id)
 */

import { supabase } from '../integrations/supabase/client';
import { PUBLIC_API_URL } from './supabase-proxy-client';

interface InvokeOptions {
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: Error | null;
}

/**
 * Invoke a backend function via PUBLIC_API_URL.
 */
export async function invokeSecure<T = unknown>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  try {
    // Get the current session token (from the main app client)
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Always include apikey so the backend can authorize anon/public calls
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

    const contentType = response.headers.get('content-type') || '';

    // Be tolerant if an upstream returns non-JSON for errors, but also detect HTML.
    const raw = await response.text();
    const trimmed = raw.trim();
    const looksLikeHtml = trimmed.startsWith('<!') || /<html[\s>]/i.test(trimmed);

    if (looksLikeHtml) {
      return {
        data: null,
        error: new Error(`Unexpected HTML response (HTTP ${response.status}). This usually indicates an auth redirect, proxy error, or misconfigured function response.`),
      };
    }

    const data = trimmed
      ? (() => {
          // Some gateways mislabel JSON responses; try parsing anyway.
          if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
              return JSON.parse(trimmed);
            } catch {
              // fall through to raw
            }
          }
          return { error: trimmed };
        })()
      : null;

    if (!response.ok) {
      return {
        data: null,
        error: new Error((data as any)?.error || `HTTP ${response.status}`),
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
