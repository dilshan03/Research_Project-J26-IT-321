/**
 * Grade 1 raw interaction observations (ONBOARDING-INTERACTION-OBS-v1.0).
 * Run: node --experimental-strip-types --test tests/onboarding/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  InteractionObserver,
  OBSERVATION_PARAMETERS,
  INTERACTION_OBSERVATION_VERSION,
  attachInteractionObserver,
} from '../../src/features/learner-profile/components/onboarding/journey/interactionObservations.ts';

const START = 1000; // arbitrary clock origin; all outputs are relative to item display

test('no interaction: nothing is invented', () => {
  const s = new InteractionObserver(START).snapshot(START + 4000);
  assert.equal(s.version, INTERACTION_OBSERVATION_VERSION);
  assert.equal(s.idleTimeBeforeFirstActionMs, null);
  assert.equal(s.pointerDownCount, 0);
  assert.equal(s.invalidTapCount, null); // not measurable without any pointer event
  assert.deepEqual(s.tapBursts, []);
  assert.deepEqual(s.idleIntervals, []);
  assert.equal(s.observedDurationMs, 4000);
  assert.deepEqual(s.parameters, { ...OBSERVATION_PARAMETERS });
});

test('time from item display to first interaction', () => {
  const o = new InteractionObserver(START);
  o.interaction(START + 2300, 'pointer', true);
  o.interaction(START + 5000, 'key');
  const s = o.snapshot(START + 6000);
  assert.equal(s.idleTimeBeforeFirstActionMs, 2300);
  assert.equal(s.pointerDownCount, 1);
  assert.equal(s.keyDownCount, 1);
});

test('rapid repeated taps are recorded as a burst with timestamps and count', () => {
  const o = new InteractionObserver(START);
  for (const t of [100, 300, 450, 600]) o.interaction(START + t, 'pointer', true);
  o.interaction(START + 3000, 'pointer', true); // separate single tap, not a burst
  const s = o.snapshot(START + 4000);
  assert.deepEqual(s.tapBursts, [{ startMs: 100, endMs: 600, tapCount: 4 }]);
  assert.equal(s.pointerDownCount, 5);
});

test('two taps alone are not a burst (minimum is a recording parameter)', () => {
  const o = new InteractionObserver(START);
  o.interaction(START + 100, 'pointer', true);
  o.interaction(START + 200, 'pointer', true);
  assert.deepEqual(o.snapshot(START + 500).tapBursts, []);
});

test('an open burst is included in the snapshot without changing state', () => {
  const o = new InteractionObserver(START);
  for (const t of [100, 200, 300]) o.interaction(START + t, 'pointer', true);
  const first = o.snapshot(START + 400);
  const second = o.snapshot(START + 400);
  assert.deepEqual(first.tapBursts, [{ startMs: 100, endMs: 300, tapCount: 3 }]);
  assert.deepEqual(second, first);
});

test('idle intervals between interactions and at the end', () => {
  const o = new InteractionObserver(START);
  o.interaction(START + 1000, 'pointer', true);
  o.interaction(START + 13000, 'pointer', true); // 12 s gap
  const s = o.snapshot(START + 25000); // 12 s trailing gap
  assert.deepEqual(s.idleIntervals, [
    { startMs: 1000, durationMs: 12000 },
    { startMs: 13000, durationMs: 12000 },
  ]);
});

test('page visibility and focus changes with hidden duration', () => {
  const o = new InteractionObserver(START);
  o.page('blur', START + 500);
  o.page('hidden', START + 1000);
  o.page('visible', START + 4000);
  o.page('focus', START + 4100);
  o.page('hidden', START + 9000); // still hidden at snapshot
  const s = o.snapshot(START + 10000);
  assert.deepEqual(s.pageEvents.map((e) => e.type), ['blur', 'hidden', 'visible', 'focus', 'hidden']);
  assert.equal(s.hiddenDurationMs, 3000 + 1000);
});

test('invalid taps outside interactive targets', () => {
  const o = new InteractionObserver(START);
  o.interaction(START + 100, 'pointer', true);
  o.interaction(START + 2000, 'pointer', false);
  o.interaction(START + 4000, 'pointer', false);
  const s = o.snapshot(START + 5000);
  assert.equal(s.invalidTapCount, 2);
  assert.deepEqual(s.invalidTaps, [{ atMs: 2000 }, { atMs: 4000 }]);
});

test('event lists are capped and marked truncated', () => {
  const o = new InteractionObserver(START);
  for (let i = 0; i < OBSERVATION_PARAMETERS.maxEventsPerList + 5; i++) {
    o.interaction(START + i * 1000, 'pointer', false);
  }
  const s = o.snapshot(START + 100000);
  assert.equal(s.invalidTaps.length, OBSERVATION_PARAMETERS.maxEventsPerList);
  assert.equal(s.invalidTapCount, OBSERVATION_PARAMETERS.maxEventsPerList + 5); // count stays exact
  assert.equal(s.truncated, true);
});

test('records contain no positions, key values or interpretations', () => {
  const o = new InteractionObserver(START);
  o.interaction(START + 100, 'pointer', false);
  o.interaction(START + 200, 'key');
  const text = JSON.stringify(o.snapshot(START + 300)).toLowerCase();
  for (const word of ['clientx', 'pagex', 'key":"', 'adhd', 'attention', 'impulsiv', 'inattent']) {
    assert.equal(text.includes(word), false, word);
  }
});

test('DOM wiring: listeners record events and detach cleanly', () => {
  const listeners: Record<string, Array<(e: Event) => void>> = {};
  const source = (prefix: string) => ({
    addEventListener: (type: string, fn: (e: Event) => void) => { (listeners[prefix + type] ??= []).push(fn); },
    removeEventListener: (type: string, fn: (e: Event) => void) => {
      listeners[prefix + type] = (listeners[prefix + type] ?? []).filter((f) => f !== fn);
    },
  });
  const doc = { ...source('doc:'), visibilityState: 'visible' };
  const win = source('win:');
  let now = START;
  const o = new InteractionObserver(START);
  const detach = attachInteractionObserver(o, doc, win, () => now);

  const element = (interactive: boolean) => ({ closest: () => (interactive ? {} : null) });
  now = START + 1200;
  listeners['doc:pointerdown'][0]({ target: element(true) } as unknown as Event);
  now = START + 1500;
  listeners['doc:pointerdown'][0]({ target: element(false) } as unknown as Event);
  doc.visibilityState = 'hidden';
  now = START + 2000;
  listeners['doc:visibilitychange'][0]({} as Event);
  now = START + 2100;
  listeners['win:blur'][0]({} as Event);

  const s = o.snapshot(START + 3000);
  assert.equal(s.idleTimeBeforeFirstActionMs, 1200);
  assert.equal(s.invalidTapCount, 1);
  assert.deepEqual(s.pageEvents, [{ type: 'hidden', atMs: 2000 }, { type: 'blur', atMs: 2100 }]);

  detach();
  for (const key of Object.keys(listeners)) assert.equal(listeners[key].length, 0, key);
});
