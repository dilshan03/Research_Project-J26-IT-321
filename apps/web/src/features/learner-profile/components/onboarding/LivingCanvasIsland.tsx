import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion, type TargetAndTransition } from 'motion/react';
import { Sparkles, Sun, Cloud, RefreshCw, Eye, Lightbulb, Volume2 } from 'lucide-react';

export type RepresentationMode = 'nature' | 'stones';

interface LivingCanvasIslandProps {
  // Number of items placed in the open basket
  placedCount: number;
  targetCount: number;
  // Pool of available items on the tree canopy (more than target)
  availableCount: number;
  totalPoolCount: number;
  // Interaction mode
  representationMode: RepresentationMode;
  onToggleRepresentation: () => void;
  // Object manipulation
  onPlaceItem: () => void;
  onRemoveItem: (index: number) => void;
  onReset: () => void;
  // Demonstration state
  isDemonstrating?: boolean;
  // Bloom/complete state
  isCompleted?: boolean;
  // Language
  language: 'si' | 'en';
  // Optional Hint integration
  showHint?: boolean;
  onToggleHint?: () => void;
  // Parent preferences adaptation
  visualAssistance?: 'always' | 'sometimes' | 'minimal';
  audioAssistance?: 'read_everything' | 'read_on_click' | 'off';
  hintStyle?: 'visual_clue' | 'step_guide' | 'audio_hint';
  celebrationStyle?: 'gentle_star' | 'badge_sound' | 'minimal';
  feedbackMessage?: { si: string; en: string } | null;
}

export const LivingCanvasIsland: React.FC<LivingCanvasIslandProps> = ({
  placedCount,
  targetCount: _targetCount,
  availableCount,
  totalPoolCount: _totalPoolCount,
  representationMode,
  onToggleRepresentation,
  onPlaceItem,
  onRemoveItem,
  onReset,
  isDemonstrating = false,
  isCompleted = false,
  language,
  showHint = false,
  onToggleHint,
  visualAssistance = 'sometimes',
  audioAssistance = 'read_on_click',
  hintStyle = 'visual_clue',
  celebrationStyle = 'gentle_star',
  feedbackMessage,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Floating animation for the island
  const islandFloat: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        y: [0, -6, 0],
        transition: {
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      };

  // Sun gentle warmth pulse
  const sunAnimation: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        scale: [1, 1.06, 1],
        rotate: [0, 4, 0],
        transition: {
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      };

  // Drifting sky clouds
  const cloud1Float: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        x: [0, 16, 0],
        transition: { duration: 14, repeat: Infinity, ease: 'easeInOut' },
      };

  const cloud2Float: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        x: [0, -14, 0],
        transition: { duration: 11, repeat: Infinity, ease: 'easeInOut' },
      };

  // Branch sway for hanging tree apples
  const appleSway: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        y: [0, -3, 0],
        rotate: [-2, 2, -2],
        transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      };

  // Web Speech API: only enabled when truly supported by browser
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  const hasAutoSpokenRef = useRef(false);

  const speakInstruction = () => {
    if (!isSpeechSupported) return;
    try {
      window.speechSynthesis.cancel();
      const promptToSpeak =
        language === 'si'
          ? 'මැජික් ගසෙන් ඇපල් 5ක් කූඩයට එකතු කරන්න. ඔබ සූදානම් වූ පසු සියල්ල සූදානම් ඔබන්න.'
          : 'Gather 5 apples from the magic tree into the basket. When you are ready, tap All Done.';
      const utterance = new SpeechSynthesisUtterance(promptToSpeak);
      utterance.lang = language === 'si' ? 'si-LK' : 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Graceful fallback without breaking UI
    }
  };

  useEffect(() => {
    if (audioAssistance === 'read_everything' && isSpeechSupported && !hasAutoSpokenRef.current) {
      hasAutoSpokenRef.current = true;
      speakInstruction();
    }
  }, [audioAssistance, isSpeechSupported, language]);

  // Bilingual strings
  const text = {
    natureMode: language === 'si' ? 'ස්වභාවික ඇපල්' : 'Nature Apples',
    stoneMode: language === 'si' ? 'ගණන් කළ ගල්' : 'Number Pebbles',
    switchRep: language === 'si' ? 'නිරූපණය මාරු කරන්න' : 'Switch Mode',
    treeTitle: language === 'si' ? 'මැජික් ඇපල් ගස (ඇපල් 8ක්)' : 'Magic Apple Tree (8 Apples)',
    basketTitle: language === 'si' ? 'විවෘත ඇපල් කූඩය' : 'Island Open Basket',
    pickPrompt:
      language === 'si'
        ? 'ගසේ ඇති ඇපල් මත තට්ටු කර කූඩයට එකතු කරන්න'
        : 'Tap apples on the tree to place them into the basket',
    basketEmpty:
      language === 'si'
        ? 'කූඩය හිස්ව ඇත. ගසෙන් ඇපල් තට්ටු කර මෙහි තබන්න.'
        : 'The basket is empty. Tap apples on the tree to gather here.',
    bloomMessage:
      language === 'si'
        ? 'දිවයින මල්වලින් පිරී ගියා! ඔබේ එකතුව සාර්ථකයි!'
        : 'The island has bloomed! Your apple collection is complete!',
    minimalSuccess:
      language === 'si'
        ? 'ඇපල් සාර්ථකව එකතු කරන ලදී.'
        : 'Apples successfully gathered.',
    reset: language === 'si' ? 'නැවත මුල සිට' : 'Reset',
    placed: language === 'si' ? 'කූඩයේ ඇති ඇපල්:' : 'Apples in Basket:',
    hintBtn: language === 'si' ? 'ඉඟිය' : 'Hint',
    listenBtn: language === 'si' ? 'අසන්න' : 'Listen',
    removeTip: language === 'si' ? 'ඉවත් කිරීමට තට්ටු කරන්න' : 'Tap to return to tree',
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-sky-100/80 via-teal-50/50 to-emerald-50/60 border border-teal-100 shadow-sm p-3 sm:p-5 select-none min-h-[500px] flex flex-col justify-between">
      {/* ------------------------------------------------------------- */}
      {/* 1. Atmospheric Sky Elements                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Watercolor Golden Sun */}
        <motion.div
          animate={sunAnimation}
          className="absolute top-3 right-6 sm:top-5 sm:right-10 flex items-center justify-center"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-300/80 to-yellow-200/90 blur-xs flex items-center justify-center shadow-inner">
            <Sun size={28} className="text-amber-500/80" />
          </div>
        </motion.div>

        {/* Soft Drifting Clouds */}
        <motion.div animate={cloud1Float} className="absolute top-6 left-6 text-white/80">
          <Cloud size={40} className="fill-white/80 drop-shadow-xs" />
        </motion.div>
        <motion.div animate={cloud2Float} className="absolute top-14 right-28 text-white/70 hidden sm:block">
          <Cloud size={30} className="fill-white/70 drop-shadow-xs" />
        </motion.div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Top Interactive Ribbon (Neutral Progress, Mode, Hint)      */}
      {/*    CRITICAL: Does NOT leak target answer 5!                   */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-20 flex items-center justify-between gap-2 flex-wrap pb-2">
        {/* Magic Discovery Pebble (Mode Switcher) */}
        <motion.button
          type="button"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleRepresentation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 hover:bg-white text-emerald-800 border border-emerald-300 shadow-xs backdrop-blur-xs transition-all cursor-pointer"
          title={text.switchRep}
        >
          <span className="text-sm">🪨</span>
          <Eye size={13} className="text-emerald-600" />
          <span className="font-sinhala">
            {representationMode === 'nature' ? text.stoneMode : text.natureMode}
          </span>
        </motion.button>

        {/* Neutral Placed Items Counter: NO denominator, NO target answer leak */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-teal-200 shadow-xs">
          <span className="text-xs font-bold text-teal-900 font-sinhala">
            {text.placed}
          </span>
          <span className="text-xs font-black text-teal-950 font-mono px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200">
            {placedCount}
          </span>
        </div>

        {/* Reset & Hint Controls */}
        <div className="flex items-center gap-2">
          {onToggleHint && (
            <button
              type="button"
              onClick={onToggleHint}
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                showHint
                  ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-200'
                  : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Lightbulb size={13} className={showHint ? 'text-amber-600 fill-amber-500' : 'text-amber-500'} />
              <span className="font-sinhala">{text.hintBtn}</span>
            </button>
          )}

          {placedCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title={text.reset}
            >
              <RefreshCw size={12} />
              <span className="font-sinhala">{text.reset}</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Centerpiece: Watercolor Floating Island with Pool of 8     */}
      {/*    Tree Apples (Canopy) and Open Collection Basket (Meadow)   */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-1 sm:my-2">
        <motion.div
          animate={islandFloat}
          className="relative max-w-2xl w-full flex flex-col items-center"
        >
          {/* Illustrated Floating Island Canvas Frame */}
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[380px] rounded-3xl overflow-hidden shadow-lg border-2 border-white/90 bg-emerald-50">
            {/* Background Storybook Illustration */}
            <img
              src="/floating-island.png"
              alt="Watercolor Floating Island"
              className="w-full h-full object-cover select-none pointer-events-none"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('watercolor-island.jpg')) {
                  target.src = '/assets/watercolor-island.jpg';
                }
              }}
            />

            {/* Watercolor Soft Texture Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-teal-950/20 via-transparent to-amber-100/10 pointer-events-none" />

            {/* --------------------------------------------------------- */}
            {/* POOL OF OBJECTS: Magic Apple Tree Canopy (8 Pool Items)   */}
            {/* More than the target quantity of 5!                      */}
            {/* --------------------------------------------------------- */}
            <div
              className={`absolute top-3 left-3 sm:top-5 sm:left-6 bg-white/90 backdrop-blur-xs rounded-2xl p-2 sm:p-2.5 border shadow-sm flex flex-col items-center max-w-[90%] sm:max-w-none transition-all ${
                visualAssistance === 'always'
                  ? 'border-emerald-400 ring-2 ring-emerald-200 shadow-md'
                  : 'border-emerald-200/90'
              }`}
            >
              <span className="text-[10px] font-extrabold text-emerald-950 font-sinhala mb-1 flex items-center gap-1">
                <span>🌳</span>
                <span>{text.treeTitle}</span>
              </span>

              {/* Hanging Apples Pool (Grid of available items) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center max-w-[280px] sm:max-w-[340px]">
                {availableCount > 0 ? (
                  Array.from({ length: availableCount }).map((_, i) => (
                    <motion.button
                      key={`avail-${i}`}
                      type="button"
                      animate={appleSway}
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.2, y: -4 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onPlaceItem}
                      className={`relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-red-50 to-amber-50 border-2 shadow-xs flex items-center justify-center cursor-pointer transition-all ${
                        visualAssistance === 'always'
                          ? 'border-red-400 hover:border-red-600 ring-1 ring-amber-300'
                          : 'border-red-300 hover:border-red-500'
                      } ${
                        showHint && hintStyle === 'visual_clue'
                          ? 'ring-2 ring-amber-400 animate-pulse'
                          : ''
                      }`}
                      title={language === 'si' ? 'කූඩයට දැමීමට තට්ටු කරන්න' : 'Tap to place in basket'}
                    >
                      {representationMode === 'nature' ? (
                        <span className="text-lg sm:text-xl filter drop-shadow-xs">🍎</span>
                      ) : (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 text-amber-950 text-[10px] font-black flex items-center justify-center shadow-xs">
                          ●
                        </div>
                      )}
                    </motion.button>
                  ))
                ) : (
                  <div className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 font-sinhala flex items-center gap-1">
                    <Sparkles size={12} className="text-emerald-500" />
                    <span>{language === 'si' ? 'ගසේ සියලු ඇපල් කූඩයේ ඇත!' : 'All apples picked!'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* OPEN COLLECTION AREA: Island Garden Open Basket           */}
            {/* NO predefined numbered slots! Completely open area.       */}
            {/* --------------------------------------------------------- */}
            <div
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] sm:w-[88%] bg-white/92 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3 border shadow-md flex flex-col items-center transition-all ${
                visualAssistance === 'always'
                  ? 'border-amber-400 ring-2 ring-amber-200'
                  : 'border-emerald-300/90'
              }`}
            >
              <div className="w-full flex items-center justify-between mb-1.5 px-1">
                <span className="text-[11px] sm:text-xs font-extrabold text-emerald-950 font-sinhala flex items-center gap-1">
                  <span>🧺</span>
                  <span>{text.basketTitle}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-sinhala">
                  {language === 'si' ? 'ඉවත් කිරීමට ඇපල් මත තට්ටු කරන්න' : 'Tap an apple to return it'}
                </span>
              </div>

              {/* Open Basket Collection Surface */}
              <div
                className={`w-full min-h-[58px] sm:min-h-[68px] rounded-xl p-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 transition-colors ${
                  placedCount === 0
                    ? 'border border-dashed border-emerald-300/80 bg-emerald-50/50'
                    : 'border border-emerald-200 bg-amber-50/40'
                }`}
              >
                {placedCount === 0 ? (
                  <p className="text-xs text-emerald-800/80 font-sinhala italic text-center py-1">
                    {text.basketEmpty}
                  </p>
                ) : (
                  Array.from({ length: placedCount }).map((_, index) => (
                    <motion.button
                      key={`placed-${index}`}
                      layout
                      type="button"
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.15, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onRemoveItem(index)}
                      className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-amber-50 to-emerald-50 border-2 border-emerald-400 shadow-sm flex items-center justify-center cursor-pointer transition-transform ${
                        visualAssistance === 'always' ? 'ring-1 ring-emerald-400' : ''
                      }`}
                      title={text.removeTip}
                    >
                      {representationMode === 'nature' ? (
                        <span className="text-xl sm:text-2xl filter drop-shadow-xs">🍎</span>
                      ) : (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                          ●
                        </div>
                      )}
                      {/* Subtle remove indicator badge */}
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-100 text-red-600 text-[10px] font-black flex items-center justify-center border border-red-300 shadow-2xs">
                        ×
                      </span>
                    </motion.button>
                  ))
                )}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* Attempt Feedback Banner: Supportive feedback on attempt   */}
            {/* --------------------------------------------------------- */}
            {feedbackMessage && !isCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-2 right-2 max-w-[240px] sm:max-w-xs bg-amber-50/95 backdrop-blur-xs rounded-xl p-2 border border-amber-300 shadow-md text-[11px] font-bold text-amber-950 font-sinhala text-center z-30"
              >
                <span>{language === 'si' ? feedbackMessage.si : feedbackMessage.en}</span>
              </motion.div>
            )}

            {/* --------------------------------------------------------- */}
            {/* Environmental Response & Celebration (Personalized)       */}
            {/* --------------------------------------------------------- */}
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 bg-gradient-to-tr from-amber-300/25 via-emerald-300/20 to-transparent pointer-events-none flex flex-col items-center justify-start pt-3 z-30"
              >
                {celebrationStyle === 'minimal' ? (
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.9, y: -6 }}
                    animate={{ scale: 1, y: 0 }}
                    className="px-4 py-1.5 rounded-full bg-white/95 border border-emerald-400 shadow-md flex items-center gap-2 text-xs font-bold text-emerald-900 font-sinhala"
                  >
                    <span>✓</span>
                    <span>{text.minimalSuccess}</span>
                  </motion.div>
                ) : celebrationStyle === 'badge_sound' ? (
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.85, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-100 to-emerald-100 border-2 border-emerald-500 shadow-lg flex items-center gap-2.5 text-xs font-black text-emerald-950 font-sinhala"
                  >
                    <span className="text-base">🏆</span>
                    <span>{text.bloomMessage}</span>
                    <span className="text-base">✨🌸</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, y: -10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="px-4 py-1.5 rounded-full bg-white/95 border border-emerald-400 shadow-md flex items-center gap-2 text-xs font-extrabold text-emerald-900 font-sinhala"
                  >
                    <Sparkles size={16} className="text-amber-500 fill-amber-400" />
                    <span>{text.bloomMessage}</span>
                    <span className="text-sm">🌸✨🌺</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Demonstration Highlight (Guided Walkthrough) */}
            {isDemonstrating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center p-4 z-40"
              >
                <div className="bg-white/95 rounded-2xl p-4 shadow-xl border border-teal-200 text-center max-w-xs">
                  <Sparkles size={24} className="text-amber-500 mx-auto mb-2 animate-spin-slow" />
                  <p className="text-xs font-bold text-teal-900 font-sinhala">
                    {language === 'si'
                      ? 'පෙන්නුම් කිරීම: ගසෙන් ඇපල් ගෙඩි එකින් එක කූඩයට එකතු කරන්න, අවශ්‍ය ප්‍රමාණය ගණන් කර සූදානම් වූ පසු තහවුරු කරන්න!'
                      : 'Demonstration: Touch apples on the tree to gather them into the basket, count carefully, and tap All Done when ready!'}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Bottom Discovery Prompt & Placement Action Bar             */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-20 bg-white/95 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-teal-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="text-center sm:text-left flex items-center gap-2">
          {/* Audio assistance button: only shown when speech synthesis is truly supported */}
          {isSpeechSupported && audioAssistance === 'read_on_click' && (
            <button
              type="button"
              onClick={speakInstruction}
              className="p-1.5 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-colors cursor-pointer shrink-0"
              title={text.listenBtn}
            >
              <Volume2 size={15} />
            </button>
          )}

          <div>
            <span className="text-xs font-bold text-teal-950 block font-sinhala">
              {text.pickPrompt}
            </span>
            <span className="text-[11px] text-teal-700 block">
              {language === 'si'
                ? `ගසේ ඉතිරි ඇපල්: ${availableCount} | කූඩයේ ඇපල්: ${placedCount}`
                : `Available in tree: ${availableCount} | In basket: ${placedCount}`}
            </span>
          </div>
        </div>

        {/* Quick Pluck Action Button */}
        <div className="flex items-center gap-2">
          {availableCount > 0 ? (
            <motion.button
              type="button"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPlaceItem}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold font-sinhala flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            >
              <span>🍎</span>
              <span>{language === 'si' ? 'ඇපල් ගෙඩියක් කූඩයට දමන්න' : 'Pick Apple to Basket'}</span>
            </motion.button>
          ) : (
            <div className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-sinhala flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600" />
              <span>{language === 'si' ? 'සියලු ඇපල් කූඩයේ ඇත' : 'All apples gathered'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
