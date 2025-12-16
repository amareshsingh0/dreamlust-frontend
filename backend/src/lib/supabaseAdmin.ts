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

// Lazy initialization - only create client if both URL and key are provided
// This allows the server to start even if Supabase is not configured
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role key or URL. Check your backend .env file."
    );
  }

  if (!supabaseAdminInstance) {
    // Admin client with service role key (bypasses RLS)
    // ⚠️ Only use this in backend/server-side code!
    supabaseAdminInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminInstance;
}

// Export function to check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && serviceRoleKey);
}

