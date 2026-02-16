// Wrapper to ensure correct Supabase credentials are used
// This overrides the auto-generated client when env vars are stale
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const CORRECT_URL = 'https://ktfkuidoulxogiscwnws.supabase.co';
const CORRECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0Zmt1aWRvdWx4b2dpc2N3bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNzYwMTUsImV4cCI6MjA4Njg1MjAxNX0.Fmv1UllFQbrjJYgCG4ud8Tf5PWfexU9QD68ITkD4p3w';

// Use env vars if they match the correct project, otherwise use hardcoded values
const url = import.meta.env.VITE_SUPABASE_URL?.includes('ktfkuidoulxogiscwnws') 
  ? import.meta.env.VITE_SUPABASE_URL 
  : CORRECT_URL;

const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.includes('ktfkuidoulxogiscwnws')
  ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  : CORRECT_KEY;

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
