export type AliasValidation = { ok: boolean; reason?: string };

const ALIAS_RE = /^[A-Za-z0-9_\-]{2,20}$/;

export function validateAlias(alias: string): AliasValidation {
  if (!alias) return { ok: false, reason: 'required' };
  if (!ALIAS_RE.test(alias)) return { ok: false, reason: 'invalid' };
  return { ok: true };
}
