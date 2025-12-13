// ⚠️ SECURITY WARNING: Service Role Key - BACKEND ONLY!
// ⚠️ NEVER import this in frontend components!
// ⚠️ This key bypasses Row Level Security (RLS)
// ⚠️ Only use in:
//    - Server-side API routes
//    - Backend functions
//    - Admin operations
//    - Background jobs
//
// ⚠️ NOTE: Service role key is NOT exposed to frontend by Vite
//    Vite only exposes variables with VITE_ prefix
//    This file should only be used in a backend/server environment
//    In a real backend, use: process.env.SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// ⚠️ Service role key is NOT available in frontend (by design)
// This will be undefined in frontend - which is correct!
// In a backend environment, access via process.env.SUPABASE_SERVICE_ROLE_KEY
const serviceRoleKey = (import.meta.env as any).SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing Supabase URL");
}

if (!serviceRoleKey) {
  console.warn(
    "⚠️ Service role key not found. This is expected in frontend builds."
  );
  console.warn(
    "⚠️ supabaseAdmin should only be used in backend/server-side code."
  );
}

// Admin client with service role key (bypasses RLS)
// ⚠️ Only use this in backend/server-side code!
// ⚠️ Will not work in frontend (service role key not exposed)
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

