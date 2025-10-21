export function sanitize(input: string): string {
  if (!input) return '';
  // collapse whitespace and trim
  return String(input).replace(/\s+/g, ' ').trim();
}
