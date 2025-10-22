"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAlias = validateAlias;
const ALIAS_RE = /^[A-Za-z0-9_\-]{2,20}$/;
function validateAlias(alias) {
    if (!alias)
        return { ok: false, reason: 'required' };
    if (!ALIAS_RE.test(alias))
        return { ok: false, reason: 'invalid' };
    return { ok: true };
}
//# sourceMappingURL=validation.js.map