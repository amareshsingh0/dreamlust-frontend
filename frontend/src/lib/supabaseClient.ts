import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a default client with placeholder values if env vars are missing
// This prevents the app from crashing during development
let supabase: ReturnType<typeof createClient> | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase environment variables not configured. Database features will be unavailable."
  );
  console.warn("Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");

  // Create a minimal client that won't crash the app
  supabase = createClient(
    'https://placeholder.supabase.co',
    'placeholder-anon-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  );
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

