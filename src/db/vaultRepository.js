// Credentials vault data access.
//
// SECURITY / PRIVACY — do not weaken these without a deliberate decision:
// 1. This file must NEVER import supabaseSync.js or call any of its
//    functions. Vault entries are local-only, full stop — same rule as the
//    private journal (see journalRepository.js's header for why).
// 2. This file must NEVER import src/lib/api.js or call Gemini/any AI
//    endpoint.
// 3. Username/password/url/notes are only ever handled as ciphertext
//    outside of vaultCrypto.encryptField/decryptField. `label` and
//    `createdAt` are the only plaintext fields, kept unencrypted so the
//    (still fully lock-gated) list can render without decrypting every row.
import { db } from "./db";
import {
  isVaultSetUp,
  isVaultUnlocked,
  lockVault,
  setupVault,
  unlockVault,
  changeVaultCode,
  isBiometricSupported,
  isBiometricEnabled,
  enableBiometricUnlock,
  disableBiometricUnlock,
  unlockWithBiometric,
  encryptField,
  decryptField,
} from "../lib/vaultCrypto";

export {
  isVaultSetUp,
  isVaultUnlocked,
  lockVault,
  setupVault,
  unlockVault,
  changeVaultCode,
  isBiometricSupported,
  isBiometricEnabled,
  enableBiometricUnlock,
  disableBiometricUnlock,
  unlockWithBiometric,
};

export const vaultRepo = {
  // Plaintext list for the UI — label/createdAt only, never the secret
  // fields (see file header). Only ever called while unlocked.
  async listMeta() {
    const rows = await db.vault.orderBy("createdAt").reverse().toArray();
    return rows.map(({ id, label, createdAt }) => ({ id, label, createdAt }));
  },
  async getDecrypted(id) {
    const row = await db.vault.get(id);
    if (!row) return null;
    const data = JSON.parse(await decryptField(row));
    return { id: row.id, label: row.label, createdAt: row.createdAt, ...data };
  },
  async create({ label, username, password, url, notes }) {
    const { ciphertext, iv } = await encryptField(
      JSON.stringify({ username: username || "", password: password || "", url: url || "", notes: notes || "" }),
    );
    return db.vault.add({ label, ciphertext, iv, createdAt: new Date().toISOString() });
  },
  async update(id, { label, username, password, url, notes }) {
    const existing = await vaultRepo.getDecrypted(id);
    if (!existing) return;
    const merged = {
      username: username !== undefined ? username : existing.username,
      password: password !== undefined ? password : existing.password,
      url: url !== undefined ? url : existing.url,
      notes: notes !== undefined ? notes : existing.notes,
    };
    const changes = await encryptField(JSON.stringify(merged));
    if (label !== undefined) changes.label = label;
    return db.vault.update(id, changes);
  },
  async remove(id) {
    return db.vault.delete(id);
  },
  async clearAll() {
    await Promise.all([db.vault.clear(), db.vaultMeta.clear()]);
  },
};
