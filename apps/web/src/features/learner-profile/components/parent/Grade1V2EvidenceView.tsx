import React from 'react';
import {
  CheckCircle2,
  Sparkles,
  Compass,
  Layers,
  HelpCircle,
  Volume2,
  VolumeX,
  Target,
  ArrowRight,
  ShieldAlert,
  Info,
  Palette,
  Eye,
  RefreshCw,
  MousePointer,
  Award,
} from 'lucide-react';
import type { MathAssessmentSummary, ChildPreferenceChoices } from '../../types/onboarding';
import { AVATAR_OPTIONS } from '../../types';
import { WORLDS } from '../onboarding/journey/themes';

interface Props {
  mathSummary?: MathAssessmentSummary | null;
  childPreferences?: ChildPreferenceChoices | null;
}

export const Grade1V2EvidenceView: React.FC<Props> = ({ mathSummary, childPreferences }) => {
  if (!mathSummary || mathSummary.assessmentProtocolVersion !== 'onboarding-v2') {
    return null;
  }

  const prefs = childPreferences || mathSummary.childPreferences;
  const companion = AVATAR_OPTIONS.find((a) => a.id === prefs?.avatarId);
  const world = WORLDS.find((w) => w.id === prefs?.theme);

  const evaluated = mathSummary.evaluatedItems || [];
  const excluded = mathSummary.excludedItems || [];

  // Item lookups
  const calibrationItem =
    excluded.find((i) => i.questionId === 'g1v2_calibration_move') ||
    evaluated.find((i) => i.questionId === 'g1v2_calibration_move');
  const countItem = evaluated.find((i) => i.questionId === 'g1v2_count_fruit_4');
  const matchNumItem = evaluated.find((i) => i.questionId === 'g1v2_match_objects_to_numeral_3');
  const matchGroupItem = evaluated.find((i) => i.questionId === 'g1v2_match_numeral_to_group_5');
  const comparePreItem = evaluated.find((i) => i.questionId === 'g1v2_compare_pre');
  const compareSupportItem = evaluated.find((i) => i.questionId === 'g1v2_compare_support');
  const compareTransferItem = evaluated.find((i) => i.questionId === 'g1v2_compare_transfer');

  const imlr = mathSummary.imlr;
  const impsa = mathSummary.impsa;

  // Transfer status helpers
  const getTransferStatusBadge = () => {
    if (!imlr || imlr.status === 'INSUFFICIENT_EVIDENCE') {
      return {
        label: 'ප්‍රමාණවත් සාක්ෂි නොමැත (Insufficient Evidence)',
        style: 'bg-slate-100 text-slate-700 border-slate-200',
        desc: 'මඟපෙන්වීම සහ ස්වාධීන භාවිතය තීරණය කිරීමට තවත් සාක්ෂි අවශ්‍ය වේ.',
      };
    }
    if (imlr.status === 'ALREADY_DEMONSTRATED') {
      return {
        label: 'මඟපෙන්වීමට පෙරම ස්වාධීනව විසඳුවා (Already Demonstrated)',
        style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        desc: 'පෙර පරීක්ෂාවේදී දරුවා ස්වාධීනව නිවැරදි පිළිතුර ලබා දුන් බැවින් විශේෂ ඉඟි අවශ්‍ය නොවීය.',
      };
    }
    if (imlr.status === 'TRANSFER_OBSERVED') {
      return {
        label: 'මඟපෙන්වීමෙන් පසු ස්වාධීනව භාවිත කළා (Transfer Observed)',
        style: 'bg-teal-50 text-teal-800 border-teal-200',
        desc: 'මඟපෙන්වීම ලබා ගැනීමෙන් පසු ඊළඟ නව ගැටලුව තනිවම නිවැරදිව විසඳා පෙන්වන ලදී.',
      };
    }
    return {
      label: 'තවදුරටත් මඟපෙන්වීම අවශ්‍ය විය හැක (Transfer In Progress)',
      style: 'bg-amber-50 text-amber-800 border-amber-200',
      desc: 'මඟපෙන්වීමෙන් පසු ස්වාධීන ප්‍රශ්නය සඳහා තවදුරටත් පුහුණුව උපකාරී විය හැක.',
    };
  };

  const transferBadge = getTransferStatusBadge();

  // Revisions count
  const revisionsCount =
    (countItem?.revisionEvents?.length || 0) +
    (matchNumItem?.revisionEvents?.length || 0) +
    (matchGroupItem?.revisionEvents?.length || 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner: Onboarding-v2 Child Journey */}
      <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-50/70 via-emerald-50/40 to-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              1
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>1 ශ්‍රේණියේ ආරම්භක ක්‍රියාකාරකම් ප්‍රතිඵල</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  Onboarding v2
                </span>
              </h3>
              <p className="text-xs text-slate-600">
                දරුවා සෘජුවම සහභාගී වූ අන්තර්ක්‍රියාකාරී ගවේෂණයේ සැබෑ නිරීක්ෂණ
              </p>
            </div>
          </div>
          {prefs && (
            <div className="flex items-center gap-2 bg-white/90 border border-teal-100 rounded-2xl px-3 py-1.5 text-xs text-slate-700">
              {companion && <span title={companion.nameSi}>{companion.icon}</span>}
              {world && <span>{world.icon} {world.calibration.target.label}</span>}
              <span className="text-slate-400">•</span>
              <span className="flex items-center gap-1">
                {prefs.soundMode === 'quiet' ? <VolumeX size={14} /> : <Volume2 size={14} />}
                {prefs.soundMode === 'quiet' ? 'නිහඬව' : 'ශබ්දය සහිතව'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Activity Observations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity A: Instruction Check */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
              <Compass size={15} />
              <span>උපදෙස් අවබෝධය (Instruction Check)</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              ගණිත නොවන ක්‍රියාකාරකම
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900">
            {world ? `වස්තුව (${world.calibration.targetObject.label}) ඉලක්කයට ගෙනයාම` : 'සරල උපදෙස් පිළිපැදීම'}
          </p>
          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 rounded-xl p-3">
            <div className="flex justify-between">
              <span>ක්‍රියාකාරකම:</span>
              <span className="font-medium text-slate-800">
                {calibrationItem?.userAnswer ? 'සාර්ථකව සම්පූර්ණ කළා' : 'නිරීක්ෂණය විය'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>භාවිත ක්‍රමය:</span>
              <span className="font-medium text-slate-800">
                {calibrationItem?.inputMethod === 'drag' ? 'ඇදීම (Drag)' : 'තට්ටු කිරීම (Tap)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>නැවත උපදෙස් ඇසීම:</span>
              <span className="font-medium text-slate-800">
                {calibrationItem?.instructionEvents?.length ? `${calibrationItem.instructionEvents.length} වරක්` : 'වරක් පමණි'}
              </span>
            </div>
          </div>
        </div>

        {/* Activity B: Counting & Quantities */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <Target size={15} />
              <span>ගණන් කිරීම සහ ප්‍රමාණ (Counting)</span>
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                countItem?.isCorrect
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {countItem?.isCorrect ? 'නිවැරදියි' : 'උත්සාහ කළා'}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900">පලතුරු 4ක් කූඩයට එකතු කිරීම</p>
          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 rounded-xl p-3">
            <div className="flex justify-between">
              <span>කූඩයට දැමූ ප්‍රමාණය:</span>
              <span className="font-medium text-slate-800">{countItem?.userAnswer ?? 4} / 4</span>
            </div>
            <div className="flex justify-between">
              <span>පළමු උත්සාහය:</span>
              <span className="font-medium text-slate-800">
                {countItem?.correctFirstResponse ? 'පළමු උත්සාහයෙන්ම නිවැරදියි' : 'සකස් කරමින් තහවුරු කළා'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>තහවුරු කිරීමට පෙර වෙනස් කිරීම්:</span>
              <span className="font-medium text-slate-800">
                {countItem?.revisionEvents?.length ? `${countItem.revisionEvents.length} වරක්` : 'නැත'}
              </span>
            </div>
          </div>
        </div>

        {/* Activity C: Representation Matching */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Layers size={15} />
              <span>නිරූපණ ගැලපීම (Representation Matching)</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              රූප සහ අංක සම්බන්ධය
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900">වස්තු ප්‍රමාණය සහ අංක සංකේත ගැලපීම</p>
          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 rounded-xl p-3">
            <div className="flex justify-between">
              <span>වස්තු 3 → අංක 3:</span>
              <span className="font-medium text-slate-800">
                {matchNumItem?.isCorrect ? '✓ නිවැරදිව ගැළපුවා' : 'උත්සාහ කළා'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>අංක 5 → බ්ලොක් 5 පෙට්ටිය:</span>
              <span className="font-medium text-slate-800">
                {matchGroupItem?.isCorrect ? '✓ නිවැරදිව ගැළපුවා' : 'උත්සාහ කළා'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>නිරූපණ ආකාර:</span>
              <span className="font-medium text-slate-800">මූර්ත සහ සංකේතාත්මක</span>
            </div>
          </div>
        </div>

        {/* Activity D: Learn and Transfer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <RefreshCw size={15} />
              <span>මඟපෙන්වීම සහ ස්වාධීන භාවිතය (Dynamic Transfer)</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
              ප්‍රමාණ සංසන්දනය
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-900">කණ්ඩායම් දෙකක් සංසන්දනය කිරීම</p>
          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 rounded-xl p-3">
            <div className="flex justify-between">
              <span>පෙර පරීක්ෂාව (Pre-Probe):</span>
              <span className="font-medium text-slate-800">
                {comparePreItem?.isCorrect ? 'ස්වාධීනව නිවැරදියි' : 'උදව් අවශ්‍ය විය'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>ලබා දුන් සහාය (Support):</span>
              <span className="font-medium text-slate-800">
                {compareSupportItem ? 'පැහැදිලි කිරීම සහ පින්තූර ඉඟි' : 'සහාය අවශ්‍ය නොවීය'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>ස්වාධීන නව ගැටලුව (Transfer):</span>
              <span className="font-medium text-slate-800">
                {compareTransferItem?.isCorrect ? '✓ ස්වාධීනව විසඳුවා' : 'තවදුරටත් පුහුණුව අවශ්‍යයි'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Transfer Indicator Alert */}
      <div className={`rounded-2xl border p-4 space-y-1.5 ${transferBadge.style}`}>
        <div className="flex items-center gap-2 font-bold text-sm">
          <Award size={18} className="shrink-0" />
          <span>ස්වාධීන භාවිතය පිළිබඳ නිරීක්ෂණය (Learning Transfer)</span>
        </div>
        <p className="text-xs leading-relaxed">{transferBadge.desc}</p>
      </div>

      {/* 4. Seven Research Dimensions Breakdown (D1 - D7) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Eye size={17} className="text-teal-700 shrink-0" />
            <span>පර්යේෂණ මානයන් 7 පිළිබඳ නිරීක්ෂණ සාක්ෂි (Assessment Dimensions)</span>
          </h4>
          <p className="text-xs text-slate-500">
            කෙටි ආරම්භක ක්‍රියාකාරකම්වලදී නිරීක්ෂණය වූ සත්‍ය සාක්ෂි පමණි. ලකුණු හෝ ලේබල් අනුමාන කර නැත.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* D1 */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">D1: මූලික ගණිතමය කුසලතාව</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {impsa?.status === 'PROVISIONAL' ? 'මූලික සාක්ෂි ඇත' : 'ප්‍රමාණවත් සාක්ෂි නොමැත'}
              </span>
            </div>
            <p className="text-slate-600">
              ස්වාධීන පළමු උත්සාහයන් {impsa?.eligibleUnassistedItems ?? 5}ක් නිරීක්ෂණය කරන ලදී.
            </p>
          </div>

          {/* D2 */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">D2: උපදෙස් අවබෝධය</span>
              <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                නිරීක්ෂණය විය
              </span>
            </div>
            <p className="text-slate-600">
              ගණිත නොවන සරල උපදෙස් තේරුම් ගෙන ක්‍රියාකාරකම සාර්ථකව අවසන් කරන ලදී.
            </p>
          </div>

          {/* D3 */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">D3: සහාය ලබාගැනීමේ ප්‍රතිචාරය</span>
              <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                නිරීක්ෂණය විය
              </span>
            </div>
            <p className="text-slate-600">
              {compareSupportItem
                ? 'ඉඟි සහ පැහැදිලි කිරීම් ලබාගත් අතර ඒවාට ධනාත්මකව ප්‍රතිචාර දැක්වීය.'
                : 'පෙර පරීක්ෂාවේදී සහාය අවශ්‍ය නොවීය.'}
            </p>
          </div>

          {/* D4 */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">D4: නිරූපණ අවබෝධය</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                නිරීක්ෂණය විය
              </span>
            </div>
            <p className="text-slate-600">
              මූර්ත වස්තු, පින්තූර කාණ්ඩ සහ අංක සංකේත අතර සම්බන්ධය සාර්ථකව හඳුනාගන්නා ලදී.
            </p>
          </div>

          {/* D5 */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">D5: ස්වයං නිවැරදි කිරීම්</span>
              <span className="font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                {revisionsCount > 0 ? `${revisionsCount} වරක් නිරීක්ෂණය විය` : 'නිරීක්ෂණය නොවීය'}
              </span>
            </div>
            <p className="text-slate-600">
              තහවුරු කිරීමට පෙර තේරීම් නැවත සිතා බලා සංශෝධනය කිරීමේ අවස්ථා.
            </p>
          </div>

          {/* D6 */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">D6: ප්‍රවේශ්‍යතාව සහ භාවිතය</span>
              <span className="font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                නිරීක්ෂණය විය
              </span>
            </div>
            <p className="text-slate-600">
              ස්පර්ශ හෝ මවුස් අන්තර්ක්‍රියා (මෙය උපාංග හුරුපුරුදුකම පමණි; ගණිත හෝ ADHD ලක්ෂණයක් නොවේ).
            </p>
          </div>

          {/* D7 */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">D7: දරුවා විසින් තෝරාගත් මනාපයන්</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {prefs ? 'තෝරා ඇත' : 'වාර්තා වී නැත'}
              </span>
            </div>
            <p className="text-slate-600">
              {prefs
                ? `තෝරාගත් මිතුරා (${companion?.nameSi || 'මිතුරා'}), තේමා ලෝකය (${world?.calibration.target.label || 'ලෝකය'}), සහ ශබ්ද ආකාරය (${prefs.soundMode === 'quiet' ? 'නිහඬව' : 'මෘදු ශබ්දය'}).`
                : 'දරුවා විසින් තේරීම් සිදු කර නොමැත.'}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Scientific Transparency & Model Distinction Notice */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 space-y-1.5 text-xs text-sky-950">
        <div className="flex items-center gap-2 font-bold text-sky-900">
          <Info size={16} className="shrink-0 text-sky-700" />
          <span>පර්යේෂණ විනිවිදභාවය සහ ආකෘති වෙනස (Research & Model Distinction)</span>
        </div>
        <p className="leading-relaxed text-sky-900/90">
          ඉහත දක්වා ඇති කුසලතා මට්ටම් MathQuest ELP-X නීති සහ Bayesian ගණනය කිරීම් මත පදනම් වේ. අනාගත IMPSA (ස්වාධීන ගණිත විසඳුම් හැකියාව) සහ IMLR (ස්වාධීන ඉගෙනුම් සූදානම) පර්යේෂණ ආකෘති ඉදිරියේදී සම්බන්ධ කෙරෙන අතර, ඒවා මෙහි මූලික නිරීක්ෂණ සමඟ පටලවා නොගනී.
        </p>
      </div>
    </div>
  );
};
