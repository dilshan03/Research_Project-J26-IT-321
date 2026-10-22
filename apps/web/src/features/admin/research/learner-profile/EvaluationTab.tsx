import React from 'react';
import { Panel, Stat, Table, date } from '../../components/ui';
import { COLORS, CalibrationChart, ConfusionMatrix, MetricComparison } from '../components/charts';
import { EmptyState, Notice, NschNotice, ProvenanceTag } from '../components/badges';
import { SoftwareTestsPanel } from '../components/snapshotPanels';
import { dec, pct, type LearnerProfileSections } from './sections';

const SUBGROUP_LABELS: Record<string, string> = {
  sex_male: 'Sex: male', sex_female: 'Sex: female',
  age_6: 'Age 6', age_7: 'Age 7', age_8: 'Age 8', age_9: 'Age 9', age_10: 'Age 10',
};

const SectionHeading: React.FC<{ title: string; note: string }> = ({ title, note }) => (
  <div className="pt-2">
    <h2 className="text-base font-bold text-slate-900">{title}</h2>
    <p className="text-xs text-slate-600">{note}</p>
  </div>
);

export const EvaluationTab: React.FC<{ sections: LearnerProfileSections }> = ({ sections }) => {
  const { nsch, elpx, softwareTests } = sections;
  const t = nsch.test;
  const m = t.metrics;
  const thr = t.atFrozenThreshold;
  const v = nsch.validation;
  const selected = nsch.selectedModel;

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Model validation"
        note="Statistical evaluation of model outputs against held-out outcomes. Read from the saved evaluation files; nothing was recomputed."
      />

      <Panel title="NSCH classifier — data and selection" note={nsch.population}>
        <ProvenanceTag provenance="offline_survey" />
        <NschNotice />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Stat label="Train (2023–2024)" value={nsch.n.train.toLocaleString()} />
          <Stat label="Validation (2023–2024)" value={`${v.n.toLocaleString()} · ${pct(v.prevalence)}`} />
          <Stat label={`Test (${nsch.testYear})`} value={`${m.n.toLocaleString()} · ${pct(m.prevalence)}`} />
          <Stat label="2025 evaluations run" value={nsch.evaluationLog.count} />
        </div>
        <p className="text-xs text-slate-600">
          Model frozen {date(nsch.frozenAtUtc)}; evaluated once on {nsch.testYear} at {date(nsch.evaluatedAtUtc)}. The test year was{' '}
          {nsch.testYearUsedForTrainingOrSelection ? 'USED' : 'not used'} for training, selection or threshold choice. Seed {nsch.seed}.
          Leakage screen: highest single-feature AUC {dec(nsch.leakageScreen.maxUnivariateAuc)} (limit {nsch.leakageScreen.limit}).
        </p>
        <h4 className="text-xs font-bold text-slate-700">Candidate models (validation partition only)</h4>
        <Table
          columns={['family', 'parameters', 'ROC-AUC', 'PR-AUC', 'Brier', '']}
          rows={v.candidates.map((c) => {
            const isSel = c.family === selected.family && JSON.stringify(c.params) === JSON.stringify(selected.params);
            return [c.family.replace('_', ' '), JSON.stringify(c.params), dec(c.roc_auc, 4), dec(c.pr_auc, 4), dec(c.brier, 4), isSel ? 'selected' : ''];
          })}
        />
        <p className="text-[11px] text-slate-500">{selected.selection_rule}.</p>
      </Panel>

      <Panel title={`NSCH ${nsch.testYear} test — model vs prevalence-only baseline`} note="The baseline predicts the training prevalence for everyone.">
        <MetricComparison
          modelLabel="Logistic regression"
          baselineLabel="Prevalence-only baseline"
          pairs={[
            { metric: 'ROC-AUC', model: m.roc_auc, baseline: t.prevalenceBaseline.roc_auc, better: 'higher', ci: t.provisionalBootstrapCi.roc_auc },
            { metric: 'PR-AUC', model: m.pr_auc, baseline: m.pr_auc_no_skill_baseline, better: 'higher', ci: t.provisionalBootstrapCi.pr_auc },
            { metric: 'Brier score', model: m.brier, baseline: t.prevalenceBaseline.brier, better: 'lower', ci: t.provisionalBootstrapCi.brier },
          ]}
        />
        <p className="text-xs text-slate-600">
          Validation (2023–2024) for comparison: ROC-AUC {dec(v.rocAuc)}, PR-AUC {dec(v.prAuc)}, Brier {dec(v.brier)}. Brier skill on{' '}
          {nsch.testYear}: {dec(m.brier_skill_vs_observed_prevalence)}.
        </p>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title={`Confusion matrix at the frozen threshold (${dec(thr.threshold)})`} note="Threshold fixed on the validation partition (Youden's J) before 2025 was opened.">
          <ConfusionMatrix
            tp={thr.confusion_matrix.tp} fp={thr.confusion_matrix.fp} fn={thr.confusion_matrix.fn} tn={thr.confusion_matrix.tn}
            positiveLabel="reported" negativeLabel="not reported"
          />
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
            <Stat label="Sensitivity (recall)" value={dec(thr.sensitivity)} />
            <Stat label="Specificity" value={dec(thr.specificity)} />
            <Stat label="Precision" value={dec(thr.precision)} />
            <Stat label="NPV" value={dec(thr.npv)} />
            <Stat label="F1" value={dec(thr.f1)} />
            <Stat label="Flagged" value={pct(thr.predicted_positive_rate)} />
          </div>
          <p className="text-xs text-slate-600">
            Precision {pct(thr.precision, 0)} means most flagged children had no reported history — one reason this model must not be
            used to screen anyone.
          </p>
        </Panel>

        <Panel title="Calibration" note="Predicted probability vs observed rate, by decile of predicted probability.">
          <CalibrationChart
            series={[
              { label: `${nsch.testYear} test`, color: COLORS.model, points: t.calibration.reliability_deciles },
              { label: 'Validation (2023–2024)', color: COLORS.validation, points: v.calibration.reliability_deciles },
            ]}
          />
          <p className="text-xs text-slate-600">
            {nsch.testYear}: mean predicted {pct(t.calibration.mean_predicted)} vs observed {pct(t.calibration.observed_rate)}; slope{' '}
            {dec(t.calibration.calibration_slope)}, intercept {dec(t.calibration.calibration_intercept)}.
          </p>
        </Panel>
      </div>

      <Panel title="Subgroups (one threshold for everyone)" note="Shows how errors fall unevenly between groups at the same threshold.">
        <Table
          columns={['subgroup', 'n', 'prevalence', 'ROC-AUC', 'PR-AUC', 'sensitivity', 'specificity']}
          rows={Object.entries(t.subgroups).map(([k, g]) => [
            SUBGROUP_LABELS[k] ?? k, g.n.toLocaleString(), pct(g.prevalence), dec(g.roc_auc), dec(g.pr_auc), dec(g.sensitivity), dec(g.specificity),
          ])}
        />
      </Panel>

      <Panel title="Limitations of these numbers">
        <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
          {t.notes.map((n) => <li key={n}>{n}</li>)}
          <li>The outcome is a parent’s report of being told, not a clinical diagnosis; it also reflects access to care and reporting habits.</li>
          <li>Cross-sectional survey: associations only, no causal or longitudinal claims.</li>
          <li>US children only; nothing here transfers to Sri Lankan children or MathQuest users.</li>
        </ul>
      </Panel>

      <Panel title={`ELP-X evaluation (${elpx.algorithmVersion})`} note={elpx.simulated.note}>
        <ProvenanceTag provenance="simulated" />
        <EmptyState title="No validation on real children yet">
          ELP-X has not been compared with an independent ground-truth measure of children’s mathematics ability, so there is no
          accuracy result to show. Only simulated algorithm checks exist.
        </EmptyState>
        <h4 className="text-xs font-bold text-slate-700">Simulated: uncertainty shrinks as evidence grows</h4>
        <Table
          columns={['scenario', 'n', 'correct', 'raw accuracy', 'naive', 'with evidence gate', 'ELP-X p', 'interval width', 'ELP-X level']}
          rows={elpx.simulated.experimentB.map((r) => [
            String(r.scenario), String(r.n), String(r.c), String(r.raw_acc), String(r.b1_level), String(r.b2_level),
            String(r.elpx_p), String(r.elpx_ci_width), String(r.elpx_level),
          ])}
        />
        <h4 className="text-xs font-bold text-slate-700">Simulated: stability when one more answer arrives</h4>
        <Table
          columns={['starting state', 'raw Δ (correct)', 'ELP-X Δ (correct)', 'raw Δ (incorrect)', 'ELP-X Δ (incorrect)', 'dampening']}
          rows={elpx.simulated.experimentC.map((r) => [
            String(r.initial_state), String(r.b2_delta_on_correct), String(r.elpx_delta_on_correct),
            String(r.b2_delta_on_incorrect), String(r.elpx_delta_on_incorrect), String(r.dampening_ratio_correct),
          ])}
        />
      </Panel>

      <SectionHeading
        title="Software tests"
        note="Automated checks that code behaves as specified. Passing tests do not mean a model is accurate or valid."
      />
      <Notice>
        Test results were recorded when the snapshot was exported. They cover MQ-REC rule logic and guardrails, and NSCH leakage
        guards, reproducibility and the rule that 2025 is never used in training.
      </Notice>
      <SoftwareTestsPanel runs={softwareTests} title="Recorded test runs" />
    </div>
  );
};
