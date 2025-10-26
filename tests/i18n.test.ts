import { t, DEFAULT_LANG } from '../src/i18n/translations';

export function run(assert: (cond: any, msg?: string) => void) {
  const s = t(DEFAULT_LANG, 'tour.match', { n: 3, p1: 'A', p2: 'B' });
  assert(s.includes('A') && s.includes('B'), 'i18n substitution places player names');

  const en = t('en', 'errors.alias.invalid');
  assert(typeof en === 'string' && en.length > 0, 'i18n returns a string for known key');

  const fallback = t('en', 'non.existent.key');
  assert(typeof fallback === 'string' && fallback.length > 0, 'i18n falls back to key or default');
}
