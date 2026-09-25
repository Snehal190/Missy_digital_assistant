# Missy

A personal daily-momentum assistant: plan your day by voice every morning, capture ideas and vocabulary through the day, and review + score yourself every evening. Local-first — everything lives in your browser's IndexedDB.

## Setup

```bash
npm install
cp .env.example .env   # then add your GEMINI_API_KEY
npm run dev
```

This starts two processes together (via `concurrently`):
- Vite dev server at http://localhost:5173 (the app)
- A small Express server at http://localhost:8787 (`server/index.js`) that proxies the voice-planning request to the Gemini API, so your API key never reaches the browser

Without an API key, everything works except "Speak your day" turning a transcript into a schedule — you'll get a clear error and can still add tasks manually or by quick-add shorthand (e.g. "Gym 7am").

"Speak your day" records audio (not live browser speech-to-text) and sends it to Gemini for transcription + task extraction in one call — this handles Indian English/Hinglish code-switching far better than the browser's built-in speech recognition, which is still used for the smaller dictation mic buttons elsewhere (Ideas, Vocabulary, Private journal). Recordings are capped at 3 minutes and go straight to `gemini-2.5-flash`; a "type instead" fallback (and the original text-based `/api/plan-day` endpoint) is always available if recording isn't possible or upload fails.

## Use it on your phone

Missy is a PWA — with `npm run dev` running on your Mac:

1. Connect your phone to the **same Wi-Fi** as this Mac.
2. Open `http://<your-mac's-LAN-IP>:5173` in your phone's browser (Vite prints this as "Network:" in the terminal on startup).
3. **iPhone (Safari):** tap Share → "Add to Home Screen". **Android (Chrome):** tap the menu → "Add to Home screen" / "Install app".

You'll get a home-screen icon that opens full-screen, no browser chrome. This only works while your Mac is on the same network and `npm run dev` is running — it isn't reachable from outside your Wi-Fi. Note the app was intentionally kept as a PWA rather than a native `.apk`: a `.apk` is Android-only and wouldn't install on an iPhone anyway, and this reaches both.

## Cloud backup (optional)

Missy works fully offline/local-only with no setup. To also back up your history to Supabase:

1. Create a Supabase project, run `supabase/schema.sql` once in its SQL Editor, and add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to `.env` (see `.env.example`).
2. In the app: Settings → Cloud backup → enter your email → click the magic link Supabase emails you. This signs you in and creates your Supabase auth user.
3. **If you're upgrading a project that was set up before auth existed** (i.e. `schema.sql` still had permissive "allow anon all" policies): after step 2, copy your user id from Supabase Dashboard → Authentication → Users, paste it into `supabase/migrations/0001_auth_lockdown.sql` (7 places), and run that file once. It adds a `user_id` column, backfills your existing rows, and swaps in policies scoped to `auth.uid() = user_id` — without this, your old data stays invisible to your signed-in session (RLS blocks it) until you own it.
4. After signing in, use **Force full resync** (Settings → Cloud backup) once to push any data that accumulated before you signed in.

Signed out, the header shows "Backup paused" and nothing leaves the device — signing back in resumes the sync queue automatically. The private journal (see below) is never part of this, signed in or not.

## Scripts

- `npm run dev` — web + API together
- `npm run dev:web` / `npm run dev:api` — either one alone
- `npm run build` — production build of the frontend (the API server still needs to run separately/be deployed as a serverless function)

## Data

All data (tasks, ideas, vocabulary, scores, settings) is stored locally via Dexie/IndexedDB — nothing is sent anywhere except the transcript text sent to Gemini when you use voice planning, and (if you've signed in) a durable, retrying background sync to your own Supabase project. Export a full JSON backup anytime from Settings.

**Private journal** (accessible from the bottom nav) is a separate, stricter space: entries are encrypted at rest with a passphrase only you know, and are never sent to Supabase or any AI endpoint — not even the transcript. See Private → Settings for passphrase management and a plaintext export (separate from the main export, and requires re-entering your passphrase).

## Architecture notes

- `src/db/repository.js` is the only place UI code touches the database — swapping IndexedDB for a real backend later means changing this one file.
- `src/db/syncQueue.js` is a durable outbox: every write is queued and retried with backoff rather than fired-and-forgotten, so an offline/failed sync self-heals instead of silently diverging from local. `src/db/supabaseSync.js` is the thin layer repository.js actually calls, which attaches your `user_id` automatically.
- `src/db/journalRepository.js` / `src/lib/journalCrypto.js` are deliberately isolated — neither imports the sync layer or the Gemini client.
- `server/index.js` holds the Gemini system prompt + JSON response schema for turning a rambling transcript into a structured schedule.
- Score weighting and category tags are tunable in Settings (`src/config/constants.js` holds the defaults).
