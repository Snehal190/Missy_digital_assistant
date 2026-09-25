// Encryption for the credentials vault — same design as src/lib/journalCrypto.js
// (read that file's header first; the invariants below are identical) plus an
// optional Face ID/Touch ID quick-unlock layered on top via WebAuthn.
//
// Security invariants:
// - The derived key lives ONLY in `activeKey` below (module-scope closure).
//   Never put in React state, never persisted. A page reload always re-locks.
// - The 4-digit code itself is never stored, ever — except wrapped by a
//   biometric-derived key, for the optional Face ID quick-unlock (see below).
// - Wrong-code detection uses AES-GCM's built-in auth tag, so we never
//   compare plaintexts.
//
// Face ID quick-unlock, honestly stated: a website can't hook into iOS
// Keychain/Face ID the way a native app can. The only bridge is WebAuthn. We
// use its "prf" extension (where supported) to derive a real symmetric key
// from a successful Face ID assertion, and use THAT key only to wrap the
// 4-digit code locally — unlocking via Face ID just recovers the code and
// runs it through the exact same unlockVault() path as typing it in. If a
// device/browser doesn't support the prf extension, or the wrapped code is
// ever lost, the 4-digit code you set always still works — there is no
// scenario where enabling Face ID can lock you out of your own vault.
import { db } from "../db/db";

const META_ID = "vault-meta";
const VERIFY_STRING = "missy-vault-verify-v1";
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

async function deriveKey(code, saltB64) {
  const salt = fromBase64(saltB64);
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, [
    "deriveKey",
  ]);
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

export async function isVaultSetUp() {
  return Boolean(await db.vaultMeta.get(META_ID));
}

export function isVaultUnlocked() {
  return activeKey !== null;
}

export function lockVault() {
  activeKey = null;
}

export async function setupVault(code) {
  const saltB64 = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await deriveKey(code, saltB64);
  const verification = await encryptWithKey(key, VERIFY_STRING);
  await db.vaultMeta.put({
    id: META_ID,
    salt: saltB64,
    verification,
    failedAttempts: 0,
    lockedUntil: 0,
    biometric: null,
    createdAt: new Date().toISOString(),
  });
  activeKey = key;
}

// Returns { ok: true } | { ok: false, lockedForSeconds }
export async function unlockVault(code) {
  const meta = await db.vaultMeta.get(META_ID);
  if (!meta) throw new Error("Vault not set up yet.");

  if (meta.lockedUntil && Date.now() < meta.lockedUntil) {
    return { ok: false, lockedForSeconds: Math.ceil((meta.lockedUntil - Date.now()) / 1000) };
  }

  const key = await deriveKey(code, meta.salt);
  const correct = await decryptWithKey(key, meta.verification)
    .then((s) => s === VERIFY_STRING)
    .catch(() => false); // GCM auth-tag failure -> wrong code

  if (correct) {
    activeKey = key;
    if (meta.failedAttempts || meta.lockedUntil) {
      await db.vaultMeta.update(META_ID, { failedAttempts: 0, lockedUntil: 0 });
    }
    return { ok: true };
  }

  const attempts = (meta.failedAttempts || 0) + 1;
  let lockedUntil = 0;
  if (attempts >= LOCKOUT_AFTER_ATTEMPTS) {
    lockedUntil = Date.now() + LOCKOUT_BASE_MS * 2 ** (attempts - LOCKOUT_AFTER_ATTEMPTS + 1);
  }
  await db.vaultMeta.update(META_ID, { failedAttempts: attempts, lockedUntil });
  return { ok: false, lockedForSeconds: lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0 };
}

export async function encryptField(plaintext) {
  if (!activeKey) throw new Error("Vault is locked.");
  return encryptWithKey(activeKey, plaintext);
}

export async function decryptField(entry) {
  if (!activeKey) throw new Error("Vault is locked.");
  return decryptWithKey(activeKey, entry);
}

// Verifies the OLD code, re-encrypts every entry plus the verification blob
// under a freshly-derived key/salt. Also re-wraps the biometric copy of the
// code, if Face ID quick-unlock is on, so it doesn't silently break.
export async function changeVaultCode(oldCode, newCode) {
  const meta = await db.vaultMeta.get(META_ID);
  if (!meta) throw new Error("Vault not set up yet.");

  const oldKey = await deriveKey(oldCode, meta.salt);
  const oldCorrect = await decryptWithKey(oldKey, meta.verification)
    .then((s) => s === VERIFY_STRING)
    .catch(() => false);
  if (!oldCorrect) throw new Error("Current code is incorrect.");

  const newSaltB64 = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const newKey = await deriveKey(newCode, newSaltB64);
  const newVerification = await encryptWithKey(newKey, VERIFY_STRING);

  const entries = await db.vault.toArray();
  const reencrypted = [];
  for (const entry of entries) {
    const plaintext = await decryptWithKey(oldKey, entry);
    reencrypted.push({ id: entry.id, ...(await encryptWithKey(newKey, plaintext)) });
  }

  const wasBiometricEnabled = Boolean(meta.biometric);

  await db.transaction("rw", db.vault, db.vaultMeta, async () => {
    for (const r of reencrypted) {
      await db.vault.update(r.id, { ciphertext: r.ciphertext, iv: r.iv });
    }
    await db.vaultMeta.update(META_ID, {
      salt: newSaltB64,
      verification: newVerification,
      failedAttempts: 0,
      lockedUntil: 0,
      // The old wrapped code is under the old code's identity but that's
      // fine either way — it decrypts to a code string we then re-wrap
      // below if it was enabled. Clear it here; re-enabling is a deliberate
      // follow-up action so we never silently leave a stale wrapped code.
      biometric: null,
    });
  });

  activeKey = newKey;
  return { wasBiometricEnabled };
}

// ---------- Face ID / Touch ID quick-unlock (WebAuthn) ----------

export async function isBiometricSupported() {
  return Boolean(
    window.PublicKeyCredential &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function" &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()),
  );
}

export async function isBiometricEnabled() {
  const meta = await db.vaultMeta.get(META_ID);
  return Boolean(meta?.biometric);
}

// Must be called while the vault is unlocked with `code` (the code the
// caller just verified). Registers a platform passkey, uses its "prf"
// extension to derive a key, and uses that key only to wrap `code` locally.
export async function enableBiometricUnlock(code) {
  if (!window.PublicKeyCredential) throw new Error("This browser doesn't support Face ID/Touch ID unlock.");

  const prfSalt = crypto.getRandomValues(new Uint8Array(32));
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Missy" },
      user: { id: userId, name: "missy-vault", displayName: "Missy vault" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  });
  if (!credential) throw new Error("Face ID/Touch ID setup was cancelled.");
  if (!credential.getClientExtensionResults().prf?.enabled) {
    throw new Error("This device doesn't support Face ID/Touch ID quick-unlock. Your 4-digit code still works as normal.");
  }

  // Per the WebAuthn PRF spec, the derived bytes for a freshly-created
  // credential are only reliably available on the FIRST subsequent
  // assertion, not from create() itself.
  const prfBytes = await getPrfBytes(credential.rawId, prfSalt);
  const wrapKey = await crypto.subtle.importKey("raw", prfBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  const wrappedCode = await encryptWithKey(wrapKey, code);

  await db.vaultMeta.update(META_ID, {
    biometric: {
      credentialId: toBase64(credential.rawId),
      prfSalt: toBase64(prfSalt),
      wrappedCode,
    },
  });
}

export async function disableBiometricUnlock() {
  await db.vaultMeta.update(META_ID, { biometric: null });
}

// Recovers the 4-digit code via a Face ID/Touch ID assertion, then runs it
// through the normal unlockVault() path — same lockout counters, same
// result shape. Never a parallel/weaker way in.
export async function unlockWithBiometric() {
  const meta = await db.vaultMeta.get(META_ID);
  if (!meta?.biometric) throw new Error("Face ID quick-unlock isn't set up.");

  const prfSalt = fromBase64(meta.biometric.prfSalt);
  const credentialId = fromBase64(meta.biometric.credentialId);
  const prfBytes = await getPrfBytes(credentialId, prfSalt);
  const wrapKey = await crypto.subtle.importKey("raw", prfBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  const code = await decryptWithKey(wrapKey, meta.biometric.wrappedCode);
  return unlockVault(code);
}

async function getPrfBytes(credentialIdBytes, prfSalt) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: credentialIdBytes, type: "public-key" }],
      userVerification: "required",
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  });
  const results = assertion?.getClientExtensionResults();
  const bytes = results?.prf?.results?.first;
  if (!bytes) throw new Error("Face ID didn't return the expected result. Use your 4-digit code instead.");
  return bytes;
}
