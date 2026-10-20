import type { RawGameplayEvent, TrackingContext } from './types';

const BASE = import.meta.env.VITE_BEHAVIOUR_API_URL ?? 'http://localhost:8004';

export const generateEventId = () => crypto.randomUUID();
export const nowISO = () => new Date().toISOString();

export function createEventBuffer() {
  let queue: RawGameplayEvent[] = [];
  let inFlight: Promise<void> | null = null;
  let closed = false;
  let finishPromise: Promise<unknown> | null = null;

  async function send(path: string, method: string, body?: unknown) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Behaviour service ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  async function flush(): Promise<void> {
    if (inFlight) {
      await inFlight;
      if (queue.length) await flush();
      return;
    }
    if (!queue.length) return;

    const batch = queue.splice(0, 100);
    inFlight = (async () => {
      try {
        await send('/api/v1/behaviour/events', 'POST', { events: batch });
      } catch (error) {
        queue = [...batch, ...queue];
        throw error;
      }
    })();

    try {
      await inFlight;
    } finally {
      inFlight = null;
    }
    if (queue.length) await flush();
  }

  const timer = setInterval(() => {
    if (queue.length) void flush().catch(console.warn);
  }, 3000);

  return {
    push(event: RawGameplayEvent) {
      if (closed) return;
      queue.push(event);
      if (queue.length >= 20) void flush().catch(console.warn);
    },
    flush,
    async openSession(context: TrackingContext) {
      return send('/api/v1/behaviour/sessions', 'POST', {
        sessionId: context.sessionId,
        learnerId: context.learnerId,
        activityId: context.activityId,
        gameTheme: context.gameTheme,
        grade: context.grade,
      });
    },
    finish(sessionId: string) {
      if (finishPromise) return finishPromise;
      closed = true;
      clearInterval(timer);
      finishPromise = (async () => {
        await flush();
        return send(`/api/v1/behaviour/sessions/${encodeURIComponent(sessionId)}`, 'DELETE');
      })();
      return finishPromise;
    },
    async destroy() {
      closed = true;
      clearInterval(timer);
      await flush();
    },
  };
}
