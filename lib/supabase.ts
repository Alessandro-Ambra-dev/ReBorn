
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://sszjcaftsffhbkjypmqm.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzempjYWZ0c2ZmaGJranlwbXFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMjQ4NjYsImV4cCI6MjA4NTkwMDg2Nn0.IRTybBSlqZurk5l1nPM5IXNkzBL4sXpMndJBcY_gVqQ";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
