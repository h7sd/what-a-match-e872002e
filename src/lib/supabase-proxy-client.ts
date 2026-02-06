/**
 * Public backend base URL used for calling backend functions.
 *
 * IMPORTANT: We derive the canonical backend URL from the project id so we never
 * accidentally route function calls to a stale external proxy (which can cause 404s).
 */

// Re-export supabase client for backwards compatibility
export { supabase } from '../integrations/supabase/client';

const projectId = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ?? "";

export const PUBLIC_API_URL = projectId && /^[a-z0-9]+$/i.test(projectId)
  ? `https://${projectId}.supabase.co`
  : (import.meta.env.VITE_SUPABASE_URL as string);
