// Supabase auth session — single source of truth for "who is signed in",
// used both by the sync layer (synchronously, via getCurrentUserId) and by
// React components (reactively, via the useAuthSession hook).
//
// Email magic-link is the implemented method. To swap to anonymous sign-in
// instead (skips the login step entirely), replace signInWithEmail's body
// with a single call: `await supabase.auth.signInAnonymously()`.
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
  supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
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

export async function signInWithEmail(email) {
  if (!supabase) throw new Error("Cloud backup isn't configured.");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
