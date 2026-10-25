import { useSyncExternalStore } from 'react';

/**
 * Global interface language (Sinhala / English) for the parent and teacher portals and the public site.
 *
 * - Stored per browser (localStorage) and applied immediately; no reload, so forms in progress keep their state.
 * - Only changes how the interface is displayed. It never changes stored data: every child's learning language
 *   stays Sinhala, and the child onboarding activities remain the Sinhala baseline.
 */
export type Language = 'si' | 'en';

export const DEFAULT_LANGUAGE: Language = 'si';
const STORAGE_KEY = 'mq_ui_language';

const readStored = (): Language => {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return v === 'en' || v === 'si' ? v : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

let current: Language = readStored();
const listeners = new Set<() => void>();

const applyDocumentLanguage = (lang: Language) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
};
applyDocumentLanguage(current);

export const getLanguage = (): Language => current;

export const setLanguage = (lang: Language): void => {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable (private mode): the choice lasts for this page only */
  }
  applyDocumentLanguage(lang);
  listeners.forEach((fn) => fn());
};

export const subscribeLanguage = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Current language; the calling component re-renders when it changes. */
export const useLanguage = (): Language => useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);

/** Pick the Sinhala or English text of an option that carries both (e.g. `{ labelSi, labelEn }`). */
export const pick = (si: string | undefined, en: string | undefined): string =>
  (current === 'en' ? en || si : si || en) ?? '';

/* ------------------------------------------------------------------ */
/* Language-aware dictionaries                                         */
/* ------------------------------------------------------------------ */

type Path = PropertyKey[];

const resolve = (root: unknown, path: Path): unknown =>
  path.reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<PropertyKey, unknown>)[key] : undefined), root);

/**
 * A dictionary object that reads from the *current* language's dictionary every time a value is accessed.
 * Components keep their existing `text.section.key` code (including `const t = text.section` at module
 * level); only leaf values are resolved at read time, so a language switch shows up on the next render.
 * Both dictionaries must have the same shape (enforced by their types).
 */
export function localized<T extends object>(dictionaries: Record<Language, T>): T {
  const cache = new Map<string, unknown>();

  const make = (path: Path): unknown => {
    const cacheKey = path.map(String).join('\u0000');
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    // The Sinhala dictionary is the proxy target, so object/array shape checks behave normally.
    const target = resolve(dictionaries.si, path) as object;
    const proxy = new Proxy(target, {
      get(_t, prop) {
        const value = resolve(dictionaries[current], [...path, prop]);
        if (value !== null && typeof value === 'object') return make([...path, prop]);
        return value;
      },
      has(_t, prop) {
        const node = resolve(dictionaries[current], path);
        return !!node && typeof node === 'object' && prop in node;
      },
      ownKeys() {
        return Reflect.ownKeys((resolve(dictionaries[current], path) as object) ?? {});
      },
      getOwnPropertyDescriptor(_t, prop) {
        const node = resolve(dictionaries[current], path) as object;
        const d = node ? Reflect.getOwnPropertyDescriptor(node, prop) : undefined;
        return d ? { ...d, configurable: d.configurable ?? true } : undefined;
      },
    });
    cache.set(cacheKey, proxy);
    return proxy;
  };

  return make([]) as T;
}
