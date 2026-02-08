/**
 * External Supabase Client & Public API URL
 * 
 * This module provides the Supabase client configured to connect to the
 * EXTERNAL Supabase project (ksejlspyueghbrhgoqtd) instead of Lovable Cloud.
 * 
 * All edge function calls and database operations will go to the external project.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

// External Supabase project credentials
const EXTERNAL_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL || 'https://ksejlspyueghbrhgoqtd.supabase.co';
const EXTERNAL_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || '';
const EXTERNAL_PROJECT_ID = import.meta.env.VITE_EXTERNAL_SUPABASE_PROJECT_ID || 'ksejlspyueghbrhgoqtd';

// Create external Supabase client
export const supabase = createClient<Database>(EXTERNAL_URL, EXTERNAL_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Public API URL points to external project for edge function calls
export const PUBLIC_API_URL = EXTERNAL_URL;

// Export project ID for edge function URLs
export const PROJECT_ID = EXTERNAL_PROJECT_ID;


