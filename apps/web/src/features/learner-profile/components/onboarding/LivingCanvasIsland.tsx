import React from 'react';
import { motion, useReducedMotion, type TargetAndTransition } from 'motion/react';
import { Sparkles, Sun, Cloud, RefreshCw, Eye, Lightbulb } from 'lucide-react';

export type RepresentationMode = 'nature' | 'stones';

interface LivingCanvasIslandProps {
  // Number of items placed on the island (0 to 5)
  placedCount: number;
  totalTarget: number;
  // Interaction mode
  representationMode: RepresentationMode;
  onToggleRepresentation: () => void;
  // Object manipulation
  availableCount: number;
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
}

export const LivingCanvasIsland: React.FC<LivingCanvasIslandProps> = ({
  placedCount,
  totalTarget,
  representationMode,
  onToggleRepresentation,
  availableCount,
  onPlaceItem,
  onRemoveItem,
  onReset,
  isDemonstrating = false,
  isCompleted = false,
  language,
  showHint = false,
  onToggleHint,
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

  // Bilingual strings
  const text = {
    natureMode: language === 'si' ? 'ස්වභාවික ඇපල්' : 'Nature Apples',
    stoneMode: language === 'si' ? 'ගණන් කළ ගල්' : 'Number Pebbles',
    switchRep: language === 'si' ? 'නිරූපණය මාරු කරන්න' : 'Switch Mode',
    treeTitle: language === 'si' ? 'මැජික් ඇපල් ගස' : 'Magic Apple Tree',
    basketTitle: language === 'si' ? 'උද්‍යානයේ ඇපල් කූඩය' : 'Island Garden Basket',
    pickPrompt: language === 'si' ? 'ගසේ ඇති ඇපල් මත තට්ටු කර කූඩයට එකතු කරන්න' : 'Tap an apple on the tree to place it into the basket',
    bloomMessage: language === 'si' ? 'දිවයින මල්වලින් පිරී ගියා! ඇපල් 5ම කූඩයේ ඇත!' : 'The island has bloomed! All 5 apples gathered!',
    reset: language === 'si' ? 'නැවත මුල සිට' : 'Reset',
    placed: language === 'si' ? 'කූඩයේ ඇති ප්‍රමාණය:' : 'In Basket:',
    hintBtn: language === 'si' ? 'ඉඟිය' : 'Hint',
    stoneDesc: language === 'si' ? 'නිරූපණ ගල' : 'Magic Stone',
  };

  const isFull = placedCount >= totalTarget;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-sky-100/80 via-teal-50/50 to-emerald-50/60 border border-teal-100 shadow-sm p-3 sm:p-5 select-none min-h-[480px] flex flex-col justify-between">
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
      {/* 2. Top Interactive Ribbon (Progress, Representation, Hint)     */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-20 flex items-center justify-between gap-2 flex-wrap pb-2">
        {/* Interactive Object 3: Magic Discovery Pebble (Mode Switcher) */}
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

        {/* Placed Items Progress Counter & Dots */}
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-teal-200 shadow-xs">
          <span className="text-xs font-bold text-teal-800 font-sinhala">
            {text.placed}
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalTarget }).map((_, i) => (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  scale: i < placedCount ? [1, 1.25, 1] : 1,
                  backgroundColor: i < placedCount ? '#10b981' : '#cbd5e1',
                }}
                transition={{ duration: 0.2 }}
                className="w-3 h-3 rounded-full border border-white shadow-xs"
              />
            ))}
          </div>
          <span className="text-xs font-black text-teal-900 ml-1 font-mono">
            {placedCount} / {totalTarget}
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
            >
              <RefreshCw size={12} />
              <span className="font-sinhala">{text.reset}</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Centerpiece: Watercolor Floating Island with Interactive    */}
      {/*    Tree (Object 1) and Garden Basket (Object 2)                */}
      {/* ------------------------------------------------------------- */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-1 sm:my-2">
        <motion.div
          animate={islandFloat}
          className="relative max-w-2xl w-full flex flex-col items-center"
        >
          {/* Illustrated Floating Island Canvas Frame */}
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[360px] rounded-3xl overflow-hidden shadow-lg border-2 border-white/90 bg-emerald-50">
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
            {/* INTERACTIVE OBJECT 1: The Magic Apple Tree Canopy         */}
            {/* (Hanging ripe apples that can be clicked/harvested)       */}
            {/* --------------------------------------------------------- */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-8 bg-white/85 backdrop-blur-xs rounded-2xl p-2 sm:p-2.5 border border-emerald-200/90 shadow-sm flex flex-col items-center">
              <span className="text-[10px] font-extrabold text-emerald-900 font-sinhala mb-1 flex items-center gap-1">
                <span>🌳</span>
                <span>{text.treeTitle}</span>
              </span>

              {/* Hanging Apples Grid */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {availableCount > 0 ? (
                  Array.from({ length: availableCount }).map((_, i) => (
                    <motion.button
                      key={`avail-${i}`}
                      type="button"
                      animate={appleSway}
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.2, y: -4 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onPlaceItem}
                      className={`relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-red-50 to-amber-50 border-2 border-red-300 hover:border-red-500 shadow-xs flex items-center justify-center cursor-pointer transition-shadow ${
                        showHint ? 'ring-2 ring-amber-400 animate-pulse' : ''
                      }`}
                      title="Tap to pick apple and put into basket"
                    >
                      {representationMode === 'nature' ? (
                        <span className="text-xl sm:text-2xl filter drop-shadow-xs">🍎</span>
                      ) : (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-amber-400 to-amber-500 text-amber-950 text-xs font-black flex items-center justify-center shadow-xs">
                          {placedCount + i + 1}
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
            {/* INTERACTIVE OBJECT 2: Island Garden Basket (5 Slots)      */}
            {/* (Placed apples settled into meadow; click returns them)   */}
            {/* --------------------------------------------------------- */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] sm:w-[86%] bg-white/92 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3 border border-emerald-300/90 shadow-md flex flex-col items-center">
              <span className="text-[11px] sm:text-xs font-extrabold text-emerald-950 font-sinhala mb-1.5 flex items-center gap-1">
                <span>🧺</span>
                <span>{text.basketTitle}</span>
              </span>

              {/* 5 Basket Slots */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3 w-full justify-items-center">
                {Array.from({ length: totalTarget }).map((_, index) => {
                  const isFilled = index < placedCount;
                  const isNextTarget = index === placedCount;

                  return (
                    <motion.div
                      key={`slot-${index}`}
                      whileHover={isFilled ? { scale: 1.08 } : isNextTarget ? { scale: 1.04 } : undefined}
                      whileTap={isFilled ? { scale: 0.95 } : isNextTarget ? { scale: 0.95 } : undefined}
                      onClick={() => {
                        if (isFilled) {
                          onRemoveItem(index);
                        } else if (isNextTarget && availableCount > 0) {
                          onPlaceItem();
                        }
                      }}
                      className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer ${
                        isFilled
                          ? 'bg-gradient-to-b from-amber-50 to-emerald-100 border-emerald-400 shadow-sm'
                          : isNextTarget && showHint
                          ? 'bg-amber-50/80 border-dashed border-amber-400 ring-2 ring-amber-300 animate-pulse'
                          : 'bg-emerald-50/70 border-dashed border-emerald-300 hover:border-emerald-400'
                      }`}
                      title={
                        isFilled
                          ? (language === 'si' ? 'ඉවත් කිරීමට තට්ටු කරන්න' : 'Click to remove')
                          : `Slot ${index + 1}`
                      }
                    >
                      {/* Slot Order Number */}
                      <span className="absolute top-0.5 left-1.5 text-[9px] font-extrabold text-emerald-700/60 font-mono">
                        {index + 1}
                      </span>

                      {/* Placed Content */}
                      {isFilled ? (
                        <motion.div
                          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, y: -12 }}
                          animate={{ scale: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                          className="flex flex-col items-center justify-center"
                        >
                          {representationMode === 'nature' ? (
                            <span className="text-xl sm:text-2xl filter drop-shadow-xs">🍎</span>
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                              {index + 1}
                            </div>
                          )}
                          <span className="text-[9px] font-black text-emerald-800 font-mono">
                            {index + 1}
                          </span>
                        </motion.div>
                      ) : (
                        <span className="text-emerald-400 text-xs sm:text-sm font-black opacity-60">
                          +
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------- */}
            {/* Gentle Environmental Response: Blooming Flowers Overlay   */}
            {/* --------------------------------------------------------- */}
            {(isCompleted || isFull) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 bg-gradient-to-tr from-amber-300/25 via-emerald-300/20 to-transparent pointer-events-none flex flex-col items-center justify-start pt-3"
              >
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.8, y: -10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="px-4 py-1.5 rounded-full bg-white/95 border border-emerald-400 shadow-md flex items-center gap-2 text-xs font-extrabold text-emerald-900 font-sinhala"
                >
                  <Sparkles size={16} className="text-amber-500 fill-amber-400" />
                  <span>{text.bloomMessage}</span>
                  <span className="text-sm">🌸✨🌺</span>
                </motion.div>
              </motion.div>
            )}

            {/* Demonstration Highlight (Guided Walkthrough) */}
            {isDemonstrating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div className="bg-white/95 rounded-2xl p-4 shadow-xl border border-teal-200 text-center max-w-xs">
                  <Sparkles size={24} className="text-amber-500 mx-auto mb-2 animate-spin-slow" />
                  <p className="text-xs font-bold text-teal-900 font-sinhala">
                    {language === 'si'
                      ? 'පෙන්නුම් කිරීම: ගසේ ඇති ඇපල් ගෙඩි එකින් එක කූඩයට එකතු කරන්න!'
                      : 'Demonstration: Touch each apple on the tree to gather it into the garden basket!'}
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
        <div className="text-center sm:text-left">
          <span className="text-xs font-bold text-teal-950 block font-sinhala">
            {text.pickPrompt}
          </span>
          <span className="text-[11px] text-teal-700 block">
            {language === 'si'
              ? `ගසේ ඉතිරි ඇපල්: ${availableCount} | කූඩයේ ඇපල්: ${placedCount}`
              : `Available in tree: ${availableCount} | Gathered in basket: ${placedCount}`}
          </span>
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
              <span>{language === 'si' ? 'සියලු ඇපල් කූඩයේ ඇත' : 'Basket is full'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
