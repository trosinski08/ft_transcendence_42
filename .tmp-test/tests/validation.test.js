"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const validation_1 = require("../src/utils/validation");
function run(assert) {
    const ok = (0, validation_1.validateAlias)('Player_01');
    assert(ok.ok, 'valid alias passes');
    const short = (0, validation_1.validateAlias)('a');
    assert(!short.ok, 'too short alias fails');
    const badChars = (0, validation_1.validateAlias)('no space');
    assert(!badChars.ok, 'spaces are not allowed');
}
