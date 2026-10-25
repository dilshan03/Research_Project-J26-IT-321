/**
 * Global Sinhala / English switch: language-aware dictionaries.
 * Run: node --experimental-strip-types --import ./tests/ts-resolve.mjs --test tests/navigation/i18n.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLanguage, localized, pick, setLanguage, subscribeLanguage } from '../../src/shared/i18n/language.ts';
import { parentText } from '../../src/shared/i18n/parentText.ts';
import { teacherText } from '../../src/shared/i18n/teacherText.ts';
import { publicText } from '../../src/shared/i18n/publicText.ts';

const dict = localized({
  si: { a: { b: 'සිංහල', f: (n: number) => `${n} වසර`, list: [{ x: 'එක' }, { x: 'දෙක' }] } },
  en: { a: { b: 'English', f: (n: number) => `${n} years`, list: [{ x: 'one' }, { x: 'two' }] } },
});

test('default language is Sinhala', () => {
  assert.equal(getLanguage(), 'si');
  assert.equal(dict.a.b, 'සිංහල');
});

test('values captured at module level follow the switch (no reload)', () => {
  const section = dict.a;                        // like `const t = parentText.support` in components
  setLanguage('en');
  assert.equal(section.b, 'English');
  assert.equal(section.f(7), '7 years');
  assert.deepEqual(section.list.map((i) => i.x), ['one', 'two']);
  assert.deepEqual(Object.keys(section), ['b', 'f', 'list']);
  setLanguage('si');
  assert.equal(section.b, 'සිංහල');
  assert.deepEqual(section.list.map((i) => i.x), ['එක', 'දෙක']);
});

test('pick() chooses the current language and falls back to the other', () => {
  setLanguage('en');
  assert.equal(pick('ඔව්', 'Yes'), 'Yes');
  assert.equal(pick('ඔව්', undefined), 'ඔව්');
  setLanguage('si');
  assert.equal(pick('ඔව්', 'Yes'), 'ඔව්');
  assert.equal(pick(undefined, 'Yes'), 'Yes');
});

test('subscribers are told about a change, and only once per real change', () => {
  let calls = 0;
  const off = subscribeLanguage(() => calls++);
  setLanguage('en');
  setLanguage('en');
  setLanguage('si');
  off();
  setLanguage('en');
  assert.equal(calls, 2);
  setLanguage('si');
});

const shape = (v: unknown): unknown =>
  typeof v === 'function'
    ? 'fn'
    : Array.isArray(v)
      ? v.map(shape)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, shape((v as Record<string, unknown>)[k])]))
        : typeof v;

for (const [name, text] of [['parentText', parentText], ['teacherText', teacherText], ['publicText', publicText]] as const) {
  test(`${name}: Sinhala and English have the same keys and every value is filled in`, () => {
    setLanguage('si');
    const si = shape(text);
    const siJson = JSON.stringify(text);
    setLanguage('en');
    const en = shape(text);
    const enJson = JSON.stringify(text);
    setLanguage('si');
    assert.deepEqual(en, si);
    assert.notEqual(enJson, siJson);
    assert.ok(!/""/.test(enJson.replace(/"doneTextStart":""/g, '')), 'no empty English strings');
  });
}

test('key wording switches language', () => {
  setLanguage('en');
  assert.equal(parentText.nav.myChildren, 'My children');
  assert.equal(teacherText.portal.label, 'Teacher Portal');
  assert.equal(publicText.nav.signIn, 'Sign In');
  assert.equal(parentText.support.progress.changeShort.LOWER, 'Reported less than last time');
  setLanguage('si');
  assert.equal(parentText.nav.myChildren, 'මගේ දරුවන්');
  assert.equal(publicText.nav.signIn, 'පිවිසෙන්න');
});
