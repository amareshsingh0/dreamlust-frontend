// Type stub for @supabase/supabase-js when not installed
declare module '@supabase/supabase-js' {
  export interface SupabaseClientOptions {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
    };
  }

  export interface SupabaseQueryBuilder<T = any> {
    select(columns?: string): SupabaseQueryBuilder<T>;
    limit(count: number): SupabaseQueryBuilder<T>;
    then<TResult1 = { data: T | null; error: any | null }, TResult2 = never>(
      onfulfilled?: ((value: { data: T | null; error: any | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2>;
  }

  export interface SupabaseClient {
    from(table: string): SupabaseQueryBuilder;
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions
  ): SupabaseClient;
}
