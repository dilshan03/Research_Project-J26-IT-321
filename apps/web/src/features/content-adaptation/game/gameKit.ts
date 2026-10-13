import gajaHappy from './assets/gaja_happy.jpg';
import gajaThinking from './assets/gaja_thinking.jpg';
import gajaCelebrate from './assets/gaja_celebrate.jpg';
import gajaEncourage from './assets/gaja_encourage.jpg';
import sceneMarket from './assets/scene_market.jpg';
import sceneJungle from './assets/scene_jungle.jpg';
import sceneSpace from './assets/scene_space.jpg';
import type { GameTheme } from '../types';

export type Mood = 'happy' | 'thinking' | 'celebrate' | 'encourage';
export type Lang = 'si' | 'en';
export type Line = { si: string; en: string };

export const GAJA: Record<Mood, string> = {
  happy: gajaHappy, thinking: gajaThinking, celebrate: gajaCelebrate, encourage: gajaEncourage,
};

export const SCENES: Record<GameTheme, string> = {
  VILLAGE_MARKET: sceneMarket, JUNGLE_ADVENTURE: sceneJungle, SPACE_QUEST: sceneSpace,
};

/** Object a learner drags around in counting activities, per theme. */
export const THEME_ITEM: Record<GameTheme, string> = {
  VILLAGE_MARKET: '🥭', JUNGLE_ADVENTURE: '🍌', SPACE_QUEST: '⭐',
};

export const STORY: Record<GameTheme, { title: Line; intro: Line; outro: Line }> = {
  VILLAGE_MARKET: {
    title: { si: 'ගමේ පොළ', en: 'Village Market' },
    intro: { si: 'ආයුබෝවන්! මම ගජා. පොළේ බඩු ගන්න මට උදව් කරන්න!', en: "Hi! I'm Gaja. Help me shop at the village market!" },
    outro: { si: 'ස්තූතියි! ඔබ නිසා මගේ බඩු ගැනීම හරි!', en: 'Thank you! You helped me finish my shopping!' },
  },
  JUNGLE_ADVENTURE: {
    title: { si: 'වනාන්තර චාරිකාව', en: 'Jungle Adventure' },
    intro: { si: 'මම ගජා. වනාන්තරයේ පලතුරු එකතු කරන්න එන්න!', en: "I'm Gaja. Come collect fruit in the jungle with me!" },
    outro: { si: 'නියමයි! අපි ඔක්කොම පලතුරු එකතු කළා!', en: 'Amazing! We collected all the fruit!' },
  },
  SPACE_QUEST: {
    title: { si: 'අභ්‍යවකාශ ගමන', en: 'Space Quest' },
    intro: { si: 'මම ගජා. තරු එකතු කරන්න අපි අභ්‍යවකාශයට යමු!', en: "I'm Gaja. Let's fly to space and collect stars!" },
    outro: { si: 'අපේ රොකට්ටුව තරු වලින් පිරිලා!', en: 'Our rocket is full of stars!' },
  },
};

export const LINES = {
  identify: { si: 'ගැටලුවේ සැඟවුණු සංඛ්‍යා සොයමු! ඒවා තට්ටු කරන්න.', en: "Let's find the hidden numbers! Tap them." },
  operator: { si: 'නිවැරදි මැජික් ලකුණ හිස් තැනට ඇදගෙන යන්න.', en: 'Drag the right magic sign into the gap.' },
  basketAdd: { si: 'ඔක්කොම කූඩයට දමලා ගණන් කරමු!', en: "Put them all in the basket and let's count!" },
  basketSub: { si: 'ගැටලුවේ තරමට කූඩයෙන් එළියට ගන්න.', en: 'Take out the right amount from the basket.' },
  pickCount: { si: 'දැන් කූඩයේ කීයක් තියෙනවද?', en: 'How many are in the basket now?' },
  balance: { si: 'තරාදිය සමබර වෙන බර තෝරන්න!', en: 'Pick the weight that balances the scale!' },
  correct: { si: 'නියමයි! ඔබ හරි!', en: 'Awesome! You got it!' },
  retry: { si: 'කමක් නැහැ, අපි ආයෙත් බලමු.', en: "That's okay, let's look again." },
  heavy: { si: 'ටිකක් බරයි! කුඩා එකක් උත්සාහ කරන්න.', en: 'Too heavy! Try a smaller one.' },
  light: { si: 'ටිකක් සැහැල්ලුයි! විශාල එකක් උත්සාහ කරන්න.', en: 'Too light! Try a bigger one.' },
  notNumber: { si: 'ඒක වචනයක්. සංඛ්‍යාවක් සොයන්න.', en: "That's a word. Look for a number." },
  nudge: { si: 'මම මෙතන ඉන්නවා. අපි එකට කරමු!', en: "I'm right here. Let's do it together!" },
  breakTime: { si: 'අපි ටිකක් හුස්ම ගමු.', en: "Let's take a little breathing break." },
} satisfies Record<string, Line>;

/** Returns the pointer position in viewport coordinates and tests it against an element. */
export function isOver(el: HTMLElement | null, point: { x: number; y: number }): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const x = point.x - window.scrollX;
  const y = point.y - window.scrollY;
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const load = () => { cachedVoices = window.speechSynthesis.getVoices(); };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

/** Speaks a line. Sinhala is only spoken if the device has a Sinhala voice installed. */
export function speak(line: Line, lang: Lang): boolean {
  if (!('speechSynthesis' in window)) return false;
  const prefix = lang === 'si' ? 'si' : 'en';
  const voice = cachedVoices.find(v => v.lang.toLowerCase().startsWith(prefix));
  if (lang === 'si' && !voice) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(line[lang]);
  if (voice) u.voice = voice;
  u.lang = lang === 'si' ? 'si-LK' : 'en-US';
  u.rate = 0.85;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
  return true;
}
