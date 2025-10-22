"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitize = sanitize;
function sanitize(input) {
    if (!input)
        return '';
    // collapse whitespace and trim
    return String(input).replace(/\s+/g, ' ').trim();
}
//# sourceMappingURL=sanitize.js.map