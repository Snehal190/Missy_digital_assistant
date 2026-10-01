// Supabase auth session — single source of truth for "who is signed in",
// used both by the sync layer (synchronously, via getCurrentUserId) and by
// React components (reactively, via the useAuthSession hook).
//
// No sign-in step: every device that opens Missy gets its own anonymous
// Supabase user automatically, the first time it loads. That identity is
// exactly as private as the local Dexie data it backs up (nobody else can
// read it — it's just a real auth.uid() with the same RLS-scoped rows any
// other user would get), it just never asks for an email/password/magic
// link. Requires "Anonymous sign-ins" enabled in the Supabase project's
// Auth settings — if it's off, signInAnonymously() fails and this device
// simply stays local-only until it's turned on, same as being signed out.
import { supabase } from "./supabaseClient";

let currentUser = null; // { id, email } | null
let ready = !supabase; // true once we know the real initial session state
const listeners = new Set();

function setUser(user) {
  currentUser = user ? { id: user.id, email: user.email } : null;
  ready = true;
  listeners.forEach((fn) => fn(currentUser, ready));
}

if (supabase) {
  supabase.auth.getSession().then(async ({ data }) => {
    if (data.session?.user) {
      setUser(data.session.user);
      return;
    }
    const { data: signedIn, error } = await supabase.auth.signInAnonymously();
    setUser(error ? null : signedIn.user);
  });
  supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
}

// Synchronous — safe to call from the sync layer on every write.
export function getCurrentUserId() {
  return currentUser?.id ?? null;
}

export function getCurrentUser() {
  return currentUser;
}

export function isAuthReady() {
  return ready;
}

export function subscribeAuth(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
