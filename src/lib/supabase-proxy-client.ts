import { createClient } from '@supabase/supabase-js';
import type { Database } from '../integrations/supabase/types';

const HARDCODED_URL = 'https://ksejlspyueghbrhgoqtd.supabase.co';
const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZWpsc3B5dWVnaGJyaGdvcXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTEyMjMsImV4cCI6MjA4NTk2NzIyM30.nxVpcXn31Ipf6xYs6q4qoDM5h85-RnsYpUc5CCW3UXA';
const HARDCODED_PROJECT_ID = 'ksejlspyueghbrhgoqtd';

const EXTERNAL_URL = import.meta.env.VITE_EXTERNAL_SUPABASE_URL || HARDCODED_URL;
const EXTERNAL_ANON_KEY = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || HARDCODED_ANON_KEY;
const EXTERNAL_PROJECT_ID = import.meta.env.VITE_EXTERNAL_SUPABASE_PROJECT_ID || HARDCODED_PROJECT_ID;

const originalFetch = window.fetch.bind(window);

export const supabase = createClient<Database>(EXTERNAL_URL, EXTERNAL_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (input, init) => originalFetch(input, init),
  },
});

export const PUBLIC_API_URL = EXTERNAL_URL;

export const PROJECT_ID = EXTERNAL_PROJECT_ID;

export { originalFetch };
