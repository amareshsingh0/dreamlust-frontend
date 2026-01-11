import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create mock client for when Supabase is not configured
const createMockClient = () => ({
  auth: {
    signIn: () => Promise.reject(new Error("Supabase not configured")),
    signOut: () => Promise.reject(new Error("Supabase not configured")),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  },
  from: () => ({
    select: () => Promise.resolve({ data: null, error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
  storage: {
    from: () => ({
      upload: () => Promise.reject(new Error("Supabase not configured")),
      download: () => Promise.reject(new Error("Supabase not configured")),
    }),
  },
}) as unknown as SupabaseClient;

// Graceful degradation instead of throwing error
let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn(
      "⚠️ Missing Supabase environment variables. Supabase features will be disabled. " +
      "Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
    );
  }
  supabase = createMockClient();
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
