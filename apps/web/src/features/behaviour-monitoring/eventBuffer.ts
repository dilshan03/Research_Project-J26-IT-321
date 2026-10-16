/**
 * eventBuffer.ts – Component 4, Function 1
 * Batching, de-duplication and HTTP delivery for gameplay events.
 *
 * Why a buffer?
 * ─────────────
 * The tracking engine can emit events at 5–20 Hz (every click + periodic
 * pauses). Sending one HTTP request per event would create unnecessary load.
 * Instead we collect events in memory, flush automatically every FLUSH_INTERVAL_MS
 * or when the buffer exceeds FLUSH_THRESHOLD, and on explicit flush() calls
 * (e.g. answer_submit, game_exit) for latency-sensitive events.
 *
 * De-duplication
 * ──────────────
 * Each event gets a client-generated UUID (eventId).  The backend's
 * POST /api/v1/behaviour/events endpoint is idempotent on eventId, so
 * retry-on-failure is safe.
 *
 * Utilities exported
 * ──────────────────
 *   generateEventId() – UUID-v4 (crypto.randomUUID or polyfill)
 *   nowISO()          – current UTC timestamp as ISO-8601 string
 *   createEventBuffer – factory returning the buffer handle
 */

import type { RawGameplayEvent, EventBatchResponse, GameSessionCreate, GameSessionResponse } from './types';

// ── Configuration ─────────────────────────────────────────────────────────────

/** Base URL for the behaviour signal service (matches vite.config.ts proxy) */
const BEHAVIOUR_API =
  (import.meta.env.VITE_BEHAVIOUR_API_URL as string | undefined) ??
  'http://localhost:8004';

const EVENTS_URL  = `${BEHAVIOUR_API}/api/v1/behaviour/events`;
const SESSION_URL = `${BEHAVIOUR_API}/api/v1/behaviour/sessions`;

/** Auto-flush every 3 seconds */
const FLUSH_INTERVAL_MS = 3_000;

/** Flush immediately if buffer reaches this size */
const FLUSH_THRESHOLD = 20;


// ── Helpers (also exported for use in trackingEngine.ts) ─────────────────────

/** RFC-4122 UUID-v4 */
export function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Polyfill for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Current UTC timestamp as ISO-8601 */
export function nowISO(): string {
  return new Date().toISOString();
}


// ── Buffer factory ────────────────────────────────────────────────────────────

export interface EventBufferHandle {
  /** Add an event to the buffer (may trigger an immediate flush). */
  push: (event: RawGameplayEvent) => void;

  /** Force-flush all buffered events to the backend immediately. */
  flush: () => Promise<void>;

  /** Open a new gameplay session on the backend. */
  openSession: (payload: GameSessionCreate) => Promise<GameSessionResponse | null>;

  /** Mark a session as finished on the backend. */
  closeSession: (sessionId: string) => Promise<void>;

  /** Destroy the buffer: flush remaining events then stop the timer. */
  destroy: () => Promise<void>;
}

export function createEventBuffer(): EventBufferHandle {
  let buffer: RawGameplayEvent[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let isFlushing = false;

  // ── Start automatic flush timer ──────────────────────────────────────────
  flushTimer = setInterval(() => {
    if (buffer.length > 0) {
      void _doFlush();
    }
  }, FLUSH_INTERVAL_MS);

  // ── Internal flush ───────────────────────────────────────────────────────
  async function _doFlush(): Promise<void> {
    if (isFlushing || buffer.length === 0) return;
    isFlushing = true;

    const batch = buffer.splice(0); // atomic take
    try {
      const res = await fetch(EVENTS_URL, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ events: batch }),
      });
      if (!res.ok) {
        console.warn('[EventBuffer] Flush failed (%d). Re-queuing %d events.', res.status, batch.length);
        buffer = [...batch, ...buffer]; // put them back at the front
      } else {
        const data = (await res.json()) as EventBatchResponse;
        console.debug(
          '[EventBuffer] Flushed %d event(s). stored=%d duplicates=%d snapshots=%d',
          batch.length, data.stored, data.duplicates, data.snapshots,
        );
      }
    } catch (err) {
      console.warn('[EventBuffer] Network error. Re-queuing %d events.', batch.length, err);
      buffer = [...batch, ...buffer];
    } finally {
      isFlushing = false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function push(event: RawGameplayEvent): void {
    buffer.push(event);
    if (buffer.length >= FLUSH_THRESHOLD) {
      void _doFlush();
    }
  }

  async function flush(): Promise<void> {
    await _doFlush();
  }

  async function openSession(payload: GameSessionCreate): Promise<GameSessionResponse | null> {
    try {
      const res = await fetch(SESSION_URL, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(payload),
      });
      if (!res.ok) {
        console.warn('[EventBuffer] Failed to open session (%d).', res.status);
        return null;
      }
      return (await res.json()) as GameSessionResponse;
    } catch (err) {
      console.warn('[EventBuffer] openSession network error:', err);
      return null;
    }
  }

  async function closeSession(sessionId: string): Promise<void> {
    try {
      await fetch(`${SESSION_URL}/${sessionId}`, {
        method:      'DELETE',
        credentials: 'include',
      });
    } catch {
      // Best-effort
    }
  }

  async function destroy(): Promise<void> {
    if (flushTimer !== null) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    await _doFlush();
  }

  return { push, flush, openSession, closeSession, destroy };
}
