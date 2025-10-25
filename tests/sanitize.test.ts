import { sanitize } from '../src/utils/sanitize';

export function run(assert: (cond: any, msg?: string) => void) {
  const s = sanitize('  A   B   ');
  assert(s === 'A B', 'sanitize collapses whitespace and trims');
  assert(sanitize('') === '', 'sanitize handles empty input');
}
