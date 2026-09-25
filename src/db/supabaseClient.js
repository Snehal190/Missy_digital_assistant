import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cloud sync is optional — the app is fully functional local-only if these
// aren't set (see src/db/supabaseSync.js, which no-ops without a client).
export const supabase = url && key ? createClient(url, key) : null;
