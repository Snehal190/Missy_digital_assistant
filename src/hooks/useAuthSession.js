import { useEffect, useState } from "react";
import { getCurrentUser, isAuthReady, subscribeAuth } from "../db/auth";

// Returns { user, ready } — user is null when signed out, ready is false
// only for the brief moment before the initial session check resolves.
export function useAuthSession() {
  const [user, setUser] = useState(getCurrentUser());
  const [ready, setReady] = useState(isAuthReady());

  useEffect(
    () =>
      subscribeAuth((nextUser, nextReady) => {
        setUser(nextUser);
        setReady(nextReady);
      }),
    [],
  );

  return { user, ready };
}
