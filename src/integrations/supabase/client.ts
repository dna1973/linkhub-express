import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { rememberRecoveryLink } from '@/lib/passwordRecovery';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// Schema dedicado no Supabase self-hosted (os tipos continuam descritos como "public").
const SUPABASE_SCHEMA = (import.meta.env.VITE_SUPABASE_SCHEMA || 'public') as 'public';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos no .env');
}

// Antes do createClient: o supabase-js limpa o hash do link de recuperação ao trocá-lo por sessão
rememberRecoveryLink();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: SUPABASE_SCHEMA },
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
