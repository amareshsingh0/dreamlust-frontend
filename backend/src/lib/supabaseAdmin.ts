// ⚠️ SECURITY WARNING: Service Role Key - BACKEND ONLY!
// ⚠️ NEVER import this in frontend components!
// ⚠️ This key bypasses Row Level Security (RLS)
// ⚠️ Only use in:
//    - Server-side API routes
//    - Backend functions
//    - Admin operations
//    - Background jobs

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase service role key or URL. Check your backend .env file."
  );
}

// Admin client with service role key (bypasses RLS)
// ⚠️ Only use this in backend/server-side code!
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

