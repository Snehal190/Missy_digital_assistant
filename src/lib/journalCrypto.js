// Encryption for the private journal. This module owns the derived
// CryptoKey and the crypto-metadata row (`journalMeta`) — nothing else in
// the app should touch `db.journalMeta` directly.
//
// Security invariants:
// - The derived key lives ONLY in `activeKey` below (module-scope closure).
//   It is never put in React state, never returned to a component, never
//   persisted anywhere. A page reload always re-locks (this variable resets).
// - The passphrase itself is never stored, ever.
// - Wrong-passphrase detection uses AES-GCM's built-in auth tag (via a
//   small "verification" ciphertext), so we never compare plaintexts.
import { db } from "../db/db";

const META_ID = "journal-meta";
const VERIFY_STRING = "missy-journal-verify-v1";
const PBKDF2_ITERATIONS = 250_000;
const LOCKOUT_BASE_MS = 2000;
const LOCKOUT_AFTER_ATTEMPTS = 5;

let activeKey = null;

function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromBase64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(passphrase, saltB64) {
  const salt = fromBase64(saltB64);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // not extractable — can't be pulled back out as raw bytes
    ["encrypt", "decrypt"],
  );
}

async function encryptWithKey(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return { ciphertext: toBase64(buf), iv: toBase64(iv) };
}

async function decryptWithKey(key, { ciphertext, iv }) {
  const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return new TextDecoder().decode(buf);
}

export async function isJournalSetUp() {
  return Boolean(await db.journalMeta.get(META_ID));
}

export function isJournalUnlocked() {
  return activeKey !== null;
}

export function lockJournal() {
  activeKey = null;
}

export async function setupJournal(passphrase) {
  const saltB64 = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await deriveKey(passphrase, saltB64);
  const verification = await encryptWithKey(key, VERIFY_STRING);
  await db.journalMeta.put({
    id: META_ID,
    salt: saltB64,
    verification,
    failedAttempts: 0,
    lockedUntil: 0,
    createdAt: new Date().toISOString(),
  });
  activeKey = key;
}

// Returns { ok: true } | { ok: false, lockedForSeconds }
export async function unlockJournal(passphrase) {
  const meta = await db.journalMeta.get(META_ID);
  if (!meta) throw new Error("Journal not set up yet.");

  if (meta.lockedUntil && Date.now() < meta.lockedUntil) {
    return { ok: false, lockedForSeconds: Math.ceil((meta.lockedUntil - Date.now()) / 1000) };
  }

  const key = await deriveKey(passphrase, meta.salt);
  const correct = await decryptWithKey(key, meta.verification)
    .then((s) => s === VERIFY_STRING)
    .catch(() => false); // GCM auth-tag failure -> wrong passphrase

  if (correct) {
    activeKey = key;
    if (meta.failedAttempts || meta.lockedUntil) {
      await db.journalMeta.update(META_ID, { failedAttempts: 0, lockedUntil: 0 });
    }
    return { ok: true };
  }

  const attempts = (meta.failedAttempts || 0) + 1;
  let lockedUntil = 0;
  if (attempts >= LOCKOUT_AFTER_ATTEMPTS) {
    lockedUntil = Date.now() + LOCKOUT_BASE_MS * 2 ** (attempts - LOCKOUT_AFTER_ATTEMPTS + 1);
  }
  await db.journalMeta.update(META_ID, { failedAttempts: attempts, lockedUntil });
  return { ok: false, lockedForSeconds: lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0 };
}

export async function encryptEntryText(plaintext) {
  if (!activeKey) throw new Error("Journal is locked.");
  return encryptWithKey(activeKey, plaintext);
}

export async function decryptEntryText(entry) {
  if (!activeKey) throw new Error("Journal is locked.");
  return decryptWithKey(activeKey, entry);
}

// Verifies the OLD passphrase, re-encrypts every entry plus the
// verification blob under a freshly-derived key/salt, then persists
// everything in one Dexie transaction (crypto work happens before the
// transaction opens — Dexie transactions must not await non-Dexie promises).
export async function changeJournalPassphrase(oldPassphrase, newPassphrase) {
  const meta = await db.journalMeta.get(META_ID);
  if (!meta) throw new Error("Journal not set up yet.");

  const oldKey = await deriveKey(oldPassphrase, meta.salt);
  const oldCorrect = await decryptWithKey(oldKey, meta.verification)
    .then((s) => s === VERIFY_STRING)
    .catch(() => false);
  if (!oldCorrect) throw new Error("Current passphrase is incorrect.");

  const newSaltB64 = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const newKey = await deriveKey(newPassphrase, newSaltB64);
  const newVerification = await encryptWithKey(newKey, VERIFY_STRING);

  const entries = await db.journal.toArray();
  const reencrypted = [];
  for (const entry of entries) {
    const plaintext = await decryptWithKey(oldKey, entry);
    reencrypted.push({ id: entry.id, ...(await encryptWithKey(newKey, plaintext)) });
  }

  await db.transaction("rw", db.journal, db.journalMeta, async () => {
    for (const r of reencrypted) {
      await db.journal.update(r.id, { ciphertext: r.ciphertext, iv: r.iv });
    }
    await db.journalMeta.update(META_ID, {
      salt: newSaltB64,
      verification: newVerification,
      failedAttempts: 0,
      lockedUntil: 0,
    });
  });

  activeKey = newKey;
}
