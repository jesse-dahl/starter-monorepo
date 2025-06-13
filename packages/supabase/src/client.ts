import { createClient } from '@supabase/supabase-js';
import { env } from '@starter-kit/env';

// Regular client for public operations
const supabase = createClient(
  env().SUPABASE_URL,
  env().SUPABASE_ANON_KEY
);

// Admin client for server-side operations (user management, etc.)
export const supabaseAdmin = createClient(
  env().SUPABASE_URL,
  env().SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default supabase;
