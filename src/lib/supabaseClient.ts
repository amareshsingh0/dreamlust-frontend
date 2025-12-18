import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Graceful degradation instead of throwing error
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn(
      "⚠️ Missing Supabase environment variables. Supabase features will be disabled. " +
      "Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
    );
  }
  
  // Create a mock client that safely does nothing
  export const supabase = {
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
  } as any;
} else {
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
}
