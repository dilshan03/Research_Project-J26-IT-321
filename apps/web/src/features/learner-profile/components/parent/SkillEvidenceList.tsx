import React from 'react';
import { GraduationCap } from 'lucide-react';
import type { ElpxProfile, ElpxSkillEstimate, SkillScore } from '../../types/onboarding';
import { parentText } from '../../../../shared/i18n/parentText';
import { ResearchDetails } from './ResearchDetails';

type Level = keyof typeof parentText.skills.level;

const LEVEL_STYLES: Record<Level, string> = {
  PROFICIENT: 'bg-mq-success-bg text-mq-success border-mq-success/30',
  DEVELOPING: 'bg-mq-surface-blue text-mq-primary border-mq-primary/25',
  EMERGING: 'bg-mq-warning-bg text-mq-warning border-mq-warning/30',
  INSUFFICIENT_EVIDENCE: 'bg-mq-surface-soft text-mq-text-muted border-mq-border',
};

const LEGACY_CATEGORY: Record<string, Level> = {
  Proficient: 'PROFICIENT',
  Developing: 'DEVELOPING',
  Emerging: 'EMERGING',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
};

interface SkillRow {
  id: string;
  name: string;
  level: Level;
  correct: number;
  total: number;
}

const fromElpx = (s: ElpxSkillEstimate): SkillRow => ({
  id: s.skillId,
  name: s.skillNameSi || s.skillName,
  level: (s.provisionalSkillLevel as Level) in LEVEL_STYLES ? (s.provisionalSkillLevel as Level) : 'INSUFFICIENT_EVIDENCE',
  correct: s.correctFirstResponses,
  total: s.distinctQuestionsAssessed,
});

const fromLegacy = (s: SkillScore): SkillRow => ({
  id: s.skillId,
  name: s.skillNameSi || s.skillName,
  level: LEGACY_CATEGORY[s.proficiencyCategory] ?? 'INSUFFICIENT_EVIDENCE',
  correct: s.correctQuestions,
  total: s.totalQuestions,
});

interface SkillEvidenceListProps {
  /** ELP-X profile (preferred). */
  profile?: ElpxProfile | null;
  /** Legacy per-skill scores, used only when no ELP-X profile is available. */
  legacySkills?: SkillScore[];
  showOverall?: boolean;
  /** Extra technical content appended to the research details section. */
  children?: React.ReactNode;
}

/**
 * Parent-friendly view of mathematics skill evidence.
 * Shows plain-language levels and observed counts first; percentages, credible intervals and
 * Beta-Binomial parameters are kept unchanged inside the research details section.
 */
export const SkillEvidenceList: React.FC<SkillEvidenceListProps> = ({
  profile,
  legacySkills,
  showOverall = true,
  children,
}) => {
  const t = parentText.skills;
  const rows: SkillRow[] = profile?.skillEstimates?.length
    ? profile.skillEstimates.map(fromElpx)
    : (legacySkills ?? []).map(fromLegacy);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-mq-text-strong flex items-center gap-2">
          <GraduationCap size={18} className="text-mq-primary shrink-0" />
          <span>{t.title}</span>
        </h3>
        <p className="text-sm text-mq-text-muted leading-relaxed">{t.subtitle}</p>
      </div>

      {showOverall && profile && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${
            profile.isOverallEvidenceSufficient
              ? 'bg-mq-success-bg/50 border-mq-success/25'
              : 'bg-mq-warning-bg/50 border-mq-warning/30'
          }`}
        >
          <span className="text-sm font-bold text-mq-text-strong">{t.overallTitle}:</span>
          <span className="text-sm text-mq-text">
            {profile.isOverallEvidenceSufficient ? t.overallReady : t.overallNeedsMore}
            {' • '}
            {t.firstTryCount(profile.totalCorrectFirstResponses, profile.totalDistinctQuestionsEvaluated)}
          </span>
          {!profile.isOverallEvidenceSufficient && (
            <span className="text-xs text-mq-text-muted sm:basis-full">{t.overallNeedsMoreText}</span>
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-mq-text-muted">{t.noSkills}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((row) => (
            <div key={row.id} className="p-4 rounded-2xl bg-white border border-mq-border space-y-2 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-bold text-mq-text-strong break-words min-w-0 flex-1">{row.name}</p>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${LEVEL_STYLES[row.level]}`}
                >
                  {t.level[row.level]}
                </span>
              </div>
              <p className="text-sm text-mq-text">{t.firstTryCount(row.correct, row.total)}</p>
              <p className="text-xs text-mq-text-muted leading-relaxed">{t.levelHelp[row.level]}</p>
            </div>
          ))}
        </div>
      )}

      {(profile || (legacySkills && legacySkills.length > 0)) && (
        <ResearchDetails>
          {profile && (
            <p className="font-mono break-words">
              algorithm: {profile.algorithmVersion} • profile schema: {profile.profileVersion} • evidenceStatus:{' '}
              {profile.evidenceStatus} • distinct items: {profile.totalDistinctQuestionsEvaluated} • correct first:{' '}
              {profile.totalCorrectFirstResponses} • raw overall accuracy:{' '}
              {(profile.rawOverallAccuracy * 100).toFixed(1)}%
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-mq-border bg-white">
            {profile?.skillEstimates?.length ? (
              <table className="w-full text-left font-mono text-[11px] whitespace-nowrap">
                <thead className="bg-mq-surface-soft text-mq-text">
                  <tr>
                    <th className="px-3 py-2">skillId</th>
                    <th className="px-3 py-2">level</th>
                    <th className="px-3 py-2">n</th>
                    <th className="px-3 py-2">c</th>
                    <th className="px-3 py-2">raw %</th>
                    <th className="px-3 py-2">estimated p %</th>
                    <th className="px-3 py-2">95% CI</th>
                    <th className="px-3 py-2">α, β</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.skillEstimates.map((s) => (
                    <tr key={s.skillId} className="border-t border-mq-border/70">
                      <td className="px-3 py-1.5">{s.skillId}</td>
                      <td className="px-3 py-1.5">{s.provisionalSkillLevel}</td>
                      <td className="px-3 py-1.5">{s.distinctQuestionsAssessed}</td>
                      <td className="px-3 py-1.5">{s.correctFirstResponses}</td>
                      <td className="px-3 py-1.5">{s.rawAccuracyPercentage.toFixed(1)}</td>
                      <td className="px-3 py-1.5">{s.estimatedProficiencyPercentage.toFixed(1)}</td>
                      <td className="px-3 py-1.5">
                        [{(s.credibleInterval.lower * 100).toFixed(1)} – {(s.credibleInterval.upper * 100).toFixed(1)}]
                      </td>
                      <td className="px-3 py-1.5">
                        {s.posteriorAlpha}, {s.posteriorBeta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left font-mono text-[11px] whitespace-nowrap">
                <thead className="bg-mq-surface-soft text-mq-text">
                  <tr>
                    <th className="px-3 py-2">skillId</th>
                    <th className="px-3 py-2">category</th>
                    <th className="px-3 py-2">correct / total</th>
                    <th className="px-3 py-2">accuracy %</th>
                  </tr>
                </thead>
                <tbody>
                  {(legacySkills ?? []).map((s) => (
                    <tr key={s.skillId} className="border-t border-mq-border/70">
                      <td className="px-3 py-1.5">{s.skillId}</td>
                      <td className="px-3 py-1.5">{s.proficiencyCategory}</td>
                      <td className="px-3 py-1.5">
                        {s.correctQuestions} / {s.totalQuestions}
                      </td>
                      <td className="px-3 py-1.5">{s.accuracyPercentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="font-mono break-words">
            ELP-X v1.0: Beta(α₀=1, β₀=1) prior; p = (1 + c) / (2 + n); n &lt; 3 → INSUFFICIENT_EVIDENCE;
            levels on p: &lt; 0.50 EMERGING, 0.50–0.80 DEVELOPING, ≥ 0.80 PROFICIENT; 95% equal-tailed credible interval.
          </p>
          {profile?.disclaimer && <p>{profile.disclaimer}</p>}
          {children}
        </ResearchDetails>
      )}
    </section>
  );
};

export default SkillEvidenceList;
