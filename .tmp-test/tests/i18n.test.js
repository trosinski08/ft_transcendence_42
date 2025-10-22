"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const translations_1 = require("../src/i18n/translations");
function run(assert) {
    const s = (0, translations_1.t)(translations_1.DEFAULT_LANG, 'tour.match', { n: 3, p1: 'A', p2: 'B' });
    assert(s.includes('A') && s.includes('B'), 'i18n substitution places player names');
    const en = (0, translations_1.t)('en', 'errors.alias.invalid');
    assert(typeof en === 'string' && en.length > 0, 'i18n returns a string for known key');
    const fallback = (0, translations_1.t)('en', 'non.existent.key');
    assert(typeof fallback === 'string' && fallback.length > 0, 'i18n falls back to key or default');
}
