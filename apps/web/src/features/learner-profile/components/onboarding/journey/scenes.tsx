import React from 'react';

export type SceneId = 'welcome' | 'nature_garden' | 'animal_friends' | 'toy_room';

/**
 * Lightweight inline-SVG backdrops (no external images). Calm palettes, no animation,
 * and only background shapes: every interactive object is rendered above the scene.
 */
const Garden: React.FC = () => (
  <>
    <rect width="800" height="500" fill="#e6f4fb" />
    <circle cx="690" cy="80" r="42" fill="#fde68a" />
    <ellipse cx="160" cy="95" rx="70" ry="22" fill="#ffffff" opacity="0.85" />
    <ellipse cx="470" cy="70" rx="55" ry="18" fill="#ffffff" opacity="0.8" />
    <path d="M0 360 Q200 320 400 350 T800 340 V500 H0 Z" fill="#bfe3b4" />
    <path d="M0 410 Q260 380 520 405 T800 400 V500 H0 Z" fill="#a7d69a" />
    {[60, 130, 600, 700, 760].map((x, i) => (
      <g key={x} transform={`translate(${x} ${440 + (i % 2) * 18})`}>
        <circle r="7" fill={i % 2 ? '#f9a8d4' : '#fcd34d'} />
        <rect x="-1" y="6" width="2" height="16" fill="#65a30d" />
      </g>
    ))}
  </>
);

const AnimalFriends: React.FC = () => (
  <>
    <rect width="800" height="500" fill="#fdf6e3" />
    <path d="M0 300 Q160 220 320 290 T640 270 T800 280 V500 H0 Z" fill="#d9ead3" />
    <path d="M0 360 Q240 320 480 355 T800 350 V500 H0 Z" fill="#c4e0b6" />
    {Array.from({ length: 11 }).map((_, i) => (
      <rect key={i} x={i * 78 + 10} y="380" width="8" height="46" rx="3" fill="#d6b48a" />
    ))}
    <rect x="0" y="392" width="800" height="7" fill="#d6b48a" />
    <rect x="0" y="412" width="800" height="7" fill="#d6b48a" />
    <circle cx="110" cy="90" r="36" fill="#fde68a" />
  </>
);

const ToyRoom: React.FC = () => (
  <>
    <rect width="800" height="500" fill="#eef2ff" />
    <rect x="0" y="380" width="800" height="120" fill="#e9d8c3" />
    {Array.from({ length: 8 }).map((_, i) => (
      <rect key={i} x={i * 100} y="380" width="2" height="120" fill="#d8c3a8" />
    ))}
    <rect x="70" y="70" width="190" height="12" rx="4" fill="#c7a17a" />
    <rect x="540" y="110" width="190" height="12" rx="4" fill="#c7a17a" />
    <rect x="330" y="40" width="140" height="100" rx="10" fill="#dbeafe" stroke="#c7d2fe" strokeWidth="6" />
    <line x1="400" y1="40" x2="400" y2="140" stroke="#c7d2fe" strokeWidth="5" />
  </>
);

const Welcome: React.FC = () => (
  <>
    <rect width="800" height="500" fill="#ecfdf5" />
    <circle cx="140" cy="110" r="90" fill="#d1fae5" />
    <circle cx="690" cy="400" r="120" fill="#e0f2fe" />
    <circle cx="660" cy="90" r="40" fill="#fef3c7" />
  </>
);

const SCENES: Record<SceneId, React.FC> = {
  welcome: Welcome,
  nature_garden: Garden,
  animal_friends: AnimalFriends,
  toy_room: ToyRoom,
};

export const SceneBackdrop: React.FC<{ scene: SceneId }> = ({ scene }) => {
  const Scene = SCENES[scene];
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
    >
      <Scene />
    </svg>
  );
};
