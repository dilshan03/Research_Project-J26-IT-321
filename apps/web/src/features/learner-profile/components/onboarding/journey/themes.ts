import type { SceneId } from './scenes';

export type WorldId = 'nature_garden' | 'animal_friends' | 'toy_room';

/**
 * Child-selectable worlds. A world only changes visuals (scene, objects); the task
 * structure and difficulty stay identical so evidence remains comparable.
 */
export interface WorldTheme {
  id: WorldId;
  scene: SceneId;
  icon: string;
  /** Instruction-calibration task: move the named object (not a distractor) onto the target. */
  calibration: {
    targetObject: { id: string; icon: string; label: string };
    distractor: { id: string; icon: string; label: string };
    target: { icon: string; label: string };
  };
}

export const WORLDS: WorldTheme[] = [
  {
    id: 'nature_garden',
    scene: 'nature_garden',
    icon: '🌳',
    calibration: {
      targetObject: { id: 'red_leaf', icon: '🍁', label: 'රතු කොළය' },
      distractor: { id: 'green_leaf', icon: '🍃', label: 'කොළ පාට කොළය' },
      target: { icon: '🌳', label: 'ගහ' },
    },
  },
  {
    id: 'animal_friends',
    scene: 'animal_friends',
    icon: '🐘',
    calibration: {
      targetObject: { id: 'red_apple', icon: '🍎', label: 'රතු ඇපල්' },
      distractor: { id: 'pear', icon: '🍐', label: 'පෙයාර්' },
      target: { icon: '🐘', label: 'අලියා' },
    },
  },
  {
    id: 'toy_room',
    scene: 'toy_room',
    icon: '🧸',
    calibration: {
      targetObject: { id: 'red_ball', icon: '🔴', label: 'රතු බෝලය' },
      distractor: { id: 'blue_ball', icon: '🔵', label: 'නිල් බෝලය' },
      target: { icon: '📦', label: 'පෙට්ටිය' },
    },
  },
];

export const worldById = (id: WorldId | undefined): WorldTheme => WORLDS.find((w) => w.id === id) ?? WORLDS[0];

export const COMPANION_IDS = ['avatar_lion', 'avatar_elephant', 'avatar_rabbit', 'avatar_owl'];

export type SoundMode = 'gentle' | 'quiet';
