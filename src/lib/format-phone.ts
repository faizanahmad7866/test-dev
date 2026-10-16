/**
 * Formats an Indian E.164 number for display: "+917448211313" → "+91 74482 11313".
 * Anything that isn't a +91 ten-digit number is returned unchanged rather than mangled.
 */
export function formatPhone(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  if (!match) return e164;
  return `+91 ${match[1]} ${match[2]}`;
}
