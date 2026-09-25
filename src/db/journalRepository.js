// Private journal data access.
//
// SECURITY / PRIVACY — do not weaken these without a deliberate decision:
// 1. This file must NEVER import supabaseSync.js or call any of its
//    functions. Journal entries are local-only, full stop — not on write,
//    not on "force resync", not ever. There is no `syncQueue` entry for
//    this table by design (see prompt/spec for Phase 2 #11 and #12).
// 2. This file must NEVER import src/lib/api.js or call Gemini/any AI
//    endpoint. No insights, no summarization, no "auto-fill" here.
// 3. Entry content is only ever handled as ciphertext outside of
//    journalCrypto.encryptEntryText/decryptEntryText. Don't add a "plain
//    text mirror" field for convenience.
import { db } from "./db";
import {
  isJournalSetUp,
  isJournalUnlocked,
  lockJournal,
  setupJournal,
  unlockJournal,
  changeJournalPassphrase,
  encryptEntryText,
  decryptEntryText,
} from "../lib/journalCrypto";

// Re-exported so components only need one import for the whole feature.
export { isJournalSetUp, isJournalUnlocked, lockJournal, setupJournal, unlockJournal, changeJournalPassphrase };

export const journalRepo = {
  // Plaintext list for UI grouping/preview — createdAt/mood are stored
  // unencrypted by design (see spec), text stays encrypted until decrypted
  // on demand for a single entry.
  async listMeta() {
    const rows = await db.journal.orderBy("createdAt").reverse().toArray();
    return rows.map(({ id, createdAt, mood }) => ({ id, createdAt, mood }));
  },
  async getDecrypted(id) {
    const entry = await db.journal.get(id);
    if (!entry) return null;
    const text = await decryptEntryText(entry);
    return { id: entry.id, createdAt: entry.createdAt, mood: entry.mood, text };
  },
  // Full decrypted list, newest first — only called while unlocked, for the
  // journal view itself and for the explicit "export plaintext" action.
  async listDecrypted() {
    const rows = await db.journal.orderBy("createdAt").reverse().toArray();
    const out = [];
    for (const row of rows) {
      out.push({ id: row.id, createdAt: row.createdAt, mood: row.mood, text: await decryptEntryText(row) });
    }
    return out;
  },
  async create({ text, mood }) {
    const { ciphertext, iv } = await encryptEntryText(text);
    return db.journal.add({ ciphertext, iv, createdAt: new Date().toISOString(), mood: mood ?? null });
  },
  async update(id, { text, mood }) {
    const changes = {};
    if (text !== undefined) Object.assign(changes, await encryptEntryText(text));
    if (mood !== undefined) changes.mood = mood;
    return db.journal.update(id, changes);
  },
  async remove(id) {
    return db.journal.delete(id);
  },
  async count() {
    return db.journal.count();
  },
  async clearAll() {
    await Promise.all([db.journal.clear(), db.journalMeta.clear()]);
  },
  // For "Export private journal" only — caller must have already verified
  // the passphrase for this specific export action. Chronological order.
  async exportAllDecrypted() {
    return (await journalRepo.listDecrypted()).reverse();
  },
};
