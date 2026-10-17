import React from 'react';
import { motion, useReducedMotion, type TargetAndTransition } from 'motion/react';
import { Sparkles, Sun, Cloud, RefreshCw, Eye } from 'lucide-react';

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
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Island float animation
  const islandFloat: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        y: [0, -8, 0],
        transition: {
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      };

  // Sun gentle pulse
  const sunAnimation: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        scale: [1, 1.05, 1],
        rotate: [0, 5, 0],
        transition: {
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      };

  // Cloud drift
  const cloud1Float: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        x: [0, 15, 0],
        transition: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
      };

  const cloud2Float: TargetAndTransition = shouldReduceMotion
    ? {}
    : {
        x: [0, -12, 0],
        transition: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
      };

  // Representation labels
  const text = {
    natureMode: language === 'si' ? 'ස්වභාවික ඇපල්' : 'Nature Apples',
    stoneMode: language === 'si' ? 'ගණන් කළ ගල්' : 'Number Pebbles',
    switchRep: language === 'si' ? 'වෙනත් ආකාරයකින් බලන්න' : 'Change View',
    meadowTitle: language === 'si' ? 'දිවයිනේ උද්‍යානය' : 'Island Garden Meadow',
    treeTitle: language === 'si' ? 'මැජික් ගස' : 'Discovery Tree',
    tapToPick: language === 'si' ? 'ඇපල් ගෙඩියක් මත තට්ටු කර උද්‍යානයේ තබන්න' : 'Tap an apple to place it in the garden',
    bloomMessage: language === 'si' ? 'දිවයින මල්වලින් පිරී ගියා!' : 'The island has bloomed!',
    reset: language === 'si' ? 'නැවත මුල සිට' : 'Reset',
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-sky-100/70 via-teal-50/40 to-emerald-50/50 border border-teal-100 shadow-sm p-4 sm:p-8 select-none min-h-[520px] flex flex-col justify-between">
      {/* Decorative Sky Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft watercolor sun */}
        <motion.div
          animate={sunAnimation}
          className="absolute top-4 right-6 sm:top-8 sm:right-12 flex items-center justify-center"
        >
          <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-300/80 to-yellow-200/90 blur-xs flex items-center justify-center shadow-inner">
            <Sun size={36} className="text-amber-500/80 animate-spin-slow" />
          </div>
        </motion.div>

        {/* Drifting Clouds */}
        <motion.div
          animate={cloud1Float}
          className="absolute top-8 left-6 text-white/80"
        >
          <Cloud size={48} className="fill-white/80 drop-shadow-xs" />
        </motion.div>

        <motion.div
          animate={cloud2Float}
          className="absolute top-20 right-32 text-white/70 hidden sm:block"
        >
          <Cloud size={36} className="fill-white/70 drop-shadow-xs" />
        </motion.div>
      </div>

      {/* Top Island Controls Bar */}
      <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap pb-2">
        {/* Representation Switcher (Stage C) */}
        <button
          type="button"
          onClick={onToggleRepresentation}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/90 hover:bg-white text-emerald-800 border border-emerald-200 shadow-xs backdrop-blur-xs transition-all cursor-pointer"
          title={text.switchRep}
        >
          <Eye size={14} className="text-emerald-600" />
          <span className="font-sinhala">
            {representationMode === 'nature' ? text.stoneMode : text.natureMode}
          </span>
        </button>

        {/* Placed Progress Pills */}
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full border border-teal-100 shadow-xs">
          <span className="text-[11px] font-bold text-teal-800 font-sinhala mr-1">
            {language === 'si' ? 'තැබූ ප්‍රමාණය:' : 'Placed:'}
          </span>
          {Array.from({ length: totalTarget }).map((_, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{
                scale: i < placedCount ? [1, 1.25, 1] : 1,
                backgroundColor: i < placedCount ? '#10b981' : '#e2e8f0',
              }}
              transition={{ duration: 0.25 }}
              className="w-3 h-3 rounded-full border border-white shadow-xs"
            />
          ))}
          <span className="text-xs font-extrabold text-teal-900 ml-1.5 font-mono">
            {placedCount} / {totalTarget}
          </span>
        </div>

        {/* Reset / Clear Button */}
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

      {/* Main Island Scenery & Interactive Canvas */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-2 sm:my-4">
        {/* Floating Island Base Container */}
        <motion.div
          animate={islandFloat}
          className="relative max-w-xl w-full flex flex-col items-center"
        >
          {/* Watercolor Island Illustrated Artwork Container */}
          <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[380px] rounded-3xl overflow-hidden shadow-lg border-2 border-white/80 bg-emerald-50">
            {/* Background Storybook Illustration */}
            <img
              src="/assets/watercolor-island.jpg"
              alt="Watercolor Floating Island"
              className="w-full h-full object-cover select-none pointer-events-none"
              onError={(e) => {
                // Graceful fallback to root floating-island.png
                const target = e.currentTarget;
                if (!target.src.includes('floating-island.png')) {
                  target.src = '/floating-island.png';
                }
              }}
            />

            {/* Watercolor Soft Texture Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-teal-900/10 via-transparent to-amber-100/10 pointer-events-none" />

            {/* Bloom Environmental Feedback (Stage B / D) */}
            {(isCompleted || placedCount >= totalTarget) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 bg-gradient-to-tr from-amber-300/20 via-emerald-300/15 to-transparent pointer-events-none flex items-center justify-center"
              >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/95 border border-emerald-300 shadow-md flex items-center gap-2 text-xs font-bold text-emerald-800 font-sinhala animate-bounce">
                  <Sparkles size={16} className="text-amber-500" />
                  <span>{text.bloomMessage}</span>
                </div>
              </motion.div>
            )}

            {/* Demonstration Highlight (Stage C) */}
            {isDemonstrating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div className="bg-white/95 rounded-2xl p-4 shadow-xl border border-teal-200 text-center max-w-xs">
                  <Sparkles size={24} className="text-amber-500 mx-auto mb-2 animate-spin-slow" />
                  <p className="text-xs font-bold text-teal-900 font-sinhala">
                    {language === 'si'
                      ? 'පෙන්නුම් කිරීම: ඇපල් ගෙඩි එකින් එක උද්‍යානයට ගෙන යන්න!'
                      : 'Demonstration: Touch each apple to place it gently into the garden!'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Interactive Garden Meadow / Slots (Placed objects) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[92%] sm:w-[84%] bg-white/90 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3 border border-emerald-200/90 shadow-md flex flex-col items-center">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-900/80 font-sinhala mb-1.5 flex items-center gap-1">
                <span>🌱</span>
                <span>{text.meadowTitle}</span>
              </span>

              {/* 5 Planting Slots on the Island */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-3 w-full justify-items-center">
                {Array.from({ length: totalTarget }).map((_, index) => {
                  const isFilled = index < placedCount;

                  return (
                    <motion.div
                      key={index}
                      whileHover={isFilled ? { scale: 1.08 } : undefined}
                      whileTap={isFilled ? { scale: 0.95 } : undefined}
                      onClick={() => isFilled && onRemoveItem(index)}
                      className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer ${
                        isFilled
                          ? 'bg-gradient-to-b from-amber-50 to-emerald-100 border-emerald-400 shadow-sm cursor-pointer'
                          : 'bg-emerald-50/60 border-dashed border-emerald-300/80 hover:border-emerald-400'
                      }`}
                      title={isFilled ? 'Click to remove' : `Slot ${index + 1}`}
                    >
                      {/* Slot Order Number */}
                      <span className="absolute top-0.5 left-1.5 text-[9px] font-extrabold text-emerald-700/60 font-mono">
                        {index + 1}
                      </span>

                      {/* Placed Object Content */}
                      {isFilled ? (
                        <motion.div
                          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0, y: -10 }}
                          animate={{ scale: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                          className="flex flex-col items-center justify-center"
                        >
                          {representationMode === 'nature' ? (
                            <span className="text-xl sm:text-2xl filter drop-shadow-xs">
                              🍎
                            </span>
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                              {index + 1}
                            </div>
                          )}
                          <span className="text-[9px] font-bold text-emerald-800 font-mono">
                            {index + 1}
                          </span>
                        </motion.div>
                      ) : (
                        <span className="text-emerald-400 text-xs sm:text-sm font-bold opacity-60">
                          +
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Discovery Pick-up Zone (Stage B: Interactive Harvest & Placement) */}
      <div className="relative z-10 bg-white/95 backdrop-blur-xs rounded-2xl p-3 sm:p-4 border border-teal-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <span className="text-xs font-bold text-teal-900 block font-sinhala">
            {text.tapToPick}
          </span>
          <span className="text-[11px] text-teal-700/80 block">
            {language === 'si'
              ? `ඉතිරි ඇපල් ගණන: ${availableCount}`
              : `Available in tree: ${availableCount}`}
          </span>
        </div>

        {/* Tree Object Dispensary */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {availableCount > 0 ? (
            Array.from({ length: availableCount }).map((_, i) => (
              <motion.button
                key={i}
                type="button"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.92 }}
                onClick={onPlaceItem}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-red-50 to-amber-50 border-2 border-red-300 hover:border-red-400 shadow-sm flex items-center justify-center text-2xl cursor-pointer transition-all"
                title="Tap to place in the meadow"
              >
                {representationMode === 'nature' ? (
                  <span>🍎</span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 text-xs font-bold flex items-center justify-center">
                    {placedCount + i + 1}
                  </span>
                )}
              </motion.button>
            ))
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-sinhala">
              <Sparkles size={14} className="text-emerald-600" />
              <span>
                {language === 'si'
                  ? 'සියලුම ඇපල් උද්‍යානයේ තබා ඇත!'
                  : 'All apples are placed in the garden!'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
