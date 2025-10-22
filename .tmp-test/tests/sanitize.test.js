"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const sanitize_1 = require("../src/utils/sanitize");
function run(assert) {
    const s = (0, sanitize_1.sanitize)('  A   B   ');
    assert(s === 'A B', 'sanitize collapses whitespace and trims');
    assert((0, sanitize_1.sanitize)('') === '', 'sanitize handles empty input');
}
