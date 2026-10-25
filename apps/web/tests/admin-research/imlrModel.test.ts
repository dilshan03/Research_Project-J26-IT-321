/**
 * IMLR prototype demonstration view-model, tested against the REAL exported research snapshot
 * (services/learner-profile-service/app/research_snapshots/learner-profile.json; synthetic scenarios only).
 * Run: node --experimental-strip-types --test tests/admin-research/imlrModel.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildScenarioView, explainItem, preResult } from '../../src/features/admin/research/learner-profile/imlr/model.ts';
import { LEARNER_PROFILE_TABS, TAB_LABELS, parseTab } from '../../src/features/admin/research/access.ts';

const SNAPSHOT = new URL('../../../../services/learner-profile-service/app/research_snapshots/learner-profile.json', import.meta.url);
const demo = JSON.parse(readFileSync(SNAPSHOT, 'utf-8')).sections.imlrDemo;
const view = (id: string) => {
  const v = buildScenarioView(demo, id);
  assert.ok(v, id);
  return v;
};
const results = (items: Array<{ result: string }>) => items.map((i) => i.result);

test('the five existing tabs are preserved and the IMLR demo is a sixth tab', () => {
  assert.deepEqual(LEARNER_PROFILE_TABS.slice(0, 5), ['overview', 'models', 'explainability', 'recommendations', 'evaluation']);
  assert.equal(parseTab('imlr-demo'), 'imlr-demo');
  assert.equal(TAB_LABELS['imlr-demo'], 'IMLR Prototype Demo');
});

test('every exported scenario is labelled synthetic and maps to a complete view', () => {
  assert.equal(demo.provenance, 'synthetic');
  assert.equal(demo.protocol.status, 'RESEARCH_PROTOTYPE_NOT_FOR_USE_WITH_CHILDREN');
  assert.equal(demo.scenarios.length, 8);
  for (const s of demo.scenarios) {
    assert.equal(s.synthetic, true);
    assert.ok(s.title.length > 5);
    const v = view(s.id);
    assert.equal(v.pre.length, 2);
    assert.equal(v.teaching.length, 2);
    assert.equal(v.transfer.length, 3);
  }
  assert.equal(buildScenarioView(demo, 'not-a-scenario'), null);
});

test('questions render the real form: one correct option holding the largest count, chosen answer marked', () => {
  for (const s of demo.scenarios) {
    for (const item of [...view(s.id).pre, ...view(s.id).teaching, ...view(s.id).transfer]) {
      const form = demo.form.items.find((f: { itemId: string }) => f.itemId === item.itemId);
      assert.deepEqual(item.options.map((o) => o.position), [0, 1, 2]);
      const correct = item.options.filter((o) => o.isCorrect);
      assert.equal(correct.length, 1);
      assert.equal(correct[0].position, form.correctPosition);
      assert.equal(correct[0].count, Math.max(...item.options.map((o) => o.count)));
      const chosen = item.options.filter((o) => o.isFirstChoice);
      assert.equal(chosen.length, item.evidence.firstResponsePosition === null ? 0 : 1);
    }
  }
});

test('transfer results come from the exported outcomes, not recomputed', () => {
  const map: Record<string, string> = { INDEPENDENT_CORRECT: 'correct', INDEPENDENT_INCORRECT: 'incorrect', HELPED: 'helped', ASSISTANCE_UNKNOWN: 'unknown', UNANSWERED: 'unanswered' };
  for (const s of demo.scenarios) {
    assert.deepEqual(results(view(s.id).transfer), s.outcomes.items.map((o: { outcome: string }) => map[o.outcome]));
    assert.equal(view(s.id).summary.transferIndependentCorrect, s.outcomes.independentCorrect);
    assert.equal(view(s.id).summary.transferIndependentClassified, s.outcomes.independentClassified);
  }
  assert.deepEqual(results(view('all_independent').transfer), ['correct', 'incorrect', 'correct']);
  assert.equal(view('help_before_transfer_response').transfer[1].result, 'helped');
  assert.deepEqual(results(view('unanswered_transfer').transfer), ['correct', 'unanswered', 'unanswered']);
  assert.ok(results(view('teaching_window_not_closed').transfer).every((r) => r === 'unknown'));
});

test('pre-probe and teaching are classified separately; teaching is always guided', () => {
  for (const s of demo.scenarios) {
    const v = view(s.id);
    assert.ok(v.teaching.every((t) => t.result === 'guided'));
    assert.equal(v.pre.filter((p) => p.result === 'correct').length, v.summary.preIndependentCorrect);
  }
  assert.deepEqual(results(view('pre_correct_still_taught').pre), ['correct', 'correct']);
  assert.equal(view('pre_correct_still_taught').teaching.length, 2);   // universal teaching
});

test('missing or incomplete assistance records are shown as unknown with the reason', () => {
  const v = view('missing_assistance_record');
  assert.deepEqual(results(v.transfer), ['correct', 'unknown', 'unknown']);
  assert.ok(v.transfer[1].explanations.some((x) => x.includes('incomplete')));
  assert.ok(v.transfer[2].explanations.some((x) => x.includes('missing record is not proof')));
  const synthetic = { ...v.transfer[0].evidence, assistanceStatus: 'UNKNOWN' as const, flags: [] };
  assert.equal(preResult(synthetic), 'unknown');
});

test('breaks and help after answering are explained without changing independence', () => {
  const brk = view('break_during_transfer').transfer[0];
  assert.equal(brk.result, 'correct');
  assert.ok(brk.explanations.some((x) => x.includes('break is rest, not teaching support')));
  const after = view('help_after_transfer_response').transfer[0];
  assert.equal(after.result, 'incorrect');
  assert.ok(after.explanations.some((x) => x.includes('only after the first answer')));
  assert.ok(explainItem(view('all_independent').teaching[0].evidence, 'teaching')[0].includes('never count as independent'));
});

test('snapshot inputs and transfer outcomes are separated', () => {
  for (const s of demo.scenarios) {
    const v = view(s.id);
    const cutoff = s.inputs.snapshot.meta.predictionTime.seq;
    const inputs = JSON.stringify(s.inputs);
    for (const t of v.transfer) assert.ok(!inputs.includes(t.itemId), `${s.id}: ${t.itemId} in inputs`);
    assert.ok(v.eventsUsed.every((e) => e.seq < cutoff));
    assert.ok(v.eventsExcluded.every((e) => e.seq > cutoff));
    assert.equal(v.boundaryEvent?.seq, cutoff);
    assert.equal(v.eventsUsed.length, s.inputs.snapshot.meta.eventsUsed);
    assert.equal(s.outcomes.separation.inputSnapshotSha256, s.inputs.snapshot.snapshotSha256);
    assert.ok(!Object.keys(s.inputs.snapshot.features).some((k) => /transfer_|label|outcome|target/.test(k)));
  }
});
