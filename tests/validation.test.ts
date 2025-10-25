import { validateAlias } from '../src/utils/validation';

export function run(assert: (cond: any, msg?: string) => void) {
  const ok = validateAlias('Player_01');
  assert(ok.ok, 'valid alias passes');

  const short = validateAlias('a');
  assert(!short.ok, 'too short alias fails');

  const badChars = validateAlias('no space');
  assert(!badChars.ok, 'spaces are not allowed');
}
