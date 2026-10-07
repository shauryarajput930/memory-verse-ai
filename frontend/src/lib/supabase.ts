import { createClient } from "@supabase/supabase-js";

// Read from environment variables with real project fallback to prevent placeholder DNS errors
export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://kvynvwxqwrtwmwmkmxak.supabase.co";

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_jL2UiAjt9yo65QVyPk6EDA__fGBnOch";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      !supabaseUrl.includes("placeholder.supabase.co") &&
      supabaseAnonKey &&
      !supabaseAnonKey.includes("placeholder-key")
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
