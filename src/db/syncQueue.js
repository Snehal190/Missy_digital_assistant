// Durable outbox for Supabase writes. Every sync attempt goes through this
// queue instead of firing directly, so a failed/offline write is retried
// automatically rather than silently lost.
//
// Invariant: nothing in this file is ever called for the private journal
// ("journal" / "journalMeta" tables) — see supabaseSync.js's own warning
// comment for why. journalRepository.js never imports this module at all.
import { db } from "./db";
import { supabase } from "./supabaseClient";

const MAX_ATTEMPTS_BEFORE_STALL = 10;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const PERIODIC_INTERVAL_MS = 60 * 1000;

let processing = false;
let started = false;

// ---------- enqueue (with same-record collapsing) ----------

// operation: "upsert" | "delete". For "upsert", `payload` is the full row
// (already mapped to Supabase column names). A successfully-synced row is
// removed from this table entirely (see attemptRow), so if a pending
// "upsert" row still exists for a record, that record has definitely never
// reached Supabase yet.
export async function enqueue({ table, operation, recordId, keyColumn, payload }) {
  if (!supabase) return; // no cloud configured — nothing to queue

  // repository.js deliberately fires syncUpsert/syncDeleteBy* without
  // awaiting them, so several enqueue() calls for the SAME record (e.g.
  // three quick edits) can be in flight at once. Without a transaction,
  // their "read existing row, then write" steps can interleave and the
  // collapsing logic silently drops an update. A readwrite transaction on
  // this table serializes overlapping calls (a core IndexedDB guarantee),
  // so each one sees the previous one's result.
  await db.transaction("rw", db.syncQueue, async () => {
    const existing = await db.syncQueue.where("[table+recordId]").equals([table, recordId]).first();

    if (operation === "delete") {
      if (existing) {
        await db.syncQueue.delete(existing.id);
        if (existing.operation === "upsert") {
          // The create/update that produced this record never reached
          // Supabase — nothing to delete there either. Cancels out entirely.
          return;
        }
      }
      await db.syncQueue.add({
        table,
        operation: "delete",
        recordId,
        keyColumn,
        payload: null,
        attempts: 0,
        lastError: null,
        nextRetryAt: 0,
        stalled: false,
        createdAt: new Date().toISOString(),
      });
    } else if (existing) {
      // Collapse: keep one row, refresh its payload, give it a fresh set of
      // retries since the desired content just changed.
      await db.syncQueue.update(existing.id, {
        operation: "upsert",
        payload,
        attempts: 0,
        lastError: null,
        nextRetryAt: 0,
        stalled: false,
      });
    } else {
      await db.syncQueue.add({
        table,
        operation: "upsert",
        recordId,
        keyColumn,
        payload,
        attempts: 0,
        lastError: null,
        nextRetryAt: 0,
        stalled: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  triggerProcessing();
}

function triggerProcessing() {
  processQueue().catch((err) => console.warn("[sync-queue] processing failed:", err));
}

// ---------- processing ----------

export async function processQueue() {
  if (processing || !supabase) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  processing = true;
  try {
    const rows = await db.syncQueue.orderBy("createdAt").toArray();
    for (const row of rows) {
      if (row.stalled) continue;
      if (row.nextRetryAt && Date.now() < row.nextRetryAt) continue;
      await attemptRow(row);
    }
  } finally {
    processing = false;
  }
}

async function attemptRow(row) {
  try {
    let error;
    if (row.operation === "delete") {
      ({ error } = await supabase.from(row.table).delete().eq(row.keyColumn, row.recordId));
    } else {
      ({ error } = await supabase.from(row.table).upsert(row.payload));
    }
    if (error) throw error;
    await db.syncQueue.delete(row.id);
  } catch (err) {
    const attempts = row.attempts + 1;
    const stalled = attempts >= MAX_ATTEMPTS_BEFORE_STALL;
    const backoff = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempts);
    await db.syncQueue.update(row.id, {
      attempts,
      lastError: err.message || String(err),
      nextRetryAt: Date.now() + backoff,
      stalled,
    });
  }
}

// ---------- manual controls (for the sync status panel) ----------

export async function retryItem(id) {
  await db.syncQueue.update(id, { stalled: false, attempts: 0, nextRetryAt: 0 });
  triggerProcessing();
}

export async function discardItem(id) {
  await db.syncQueue.delete(id);
}

// ---------- lifecycle ----------

export function startSyncQueueEngine() {
  if (started) return;
  started = true;
  triggerProcessing();
  window.addEventListener("online", triggerProcessing);
  setInterval(triggerProcessing, PERIODIC_INTERVAL_MS);
}
