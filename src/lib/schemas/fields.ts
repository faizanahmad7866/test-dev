/**
 * Field rules shared by the site's forms (dealer application, product order): Indian mobile
 * numbers and PIN codes, names and free text, each normalised before it is checked so the
 * browser and the server always judge the same cleaned value.
 */
import * as z from 'zod/mini';

const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const PINCODE_PATTERN = /^[1-9]\d{5}$/;
const PHONE_ERROR = 'Enter a 10-digit mobile number';
const PINCODE_ERROR = 'Enter a 6-digit PIN code';

/** "  Ram   Traders " → "Ram Traders". */
export const collapseSpaces = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * Reduces any common way of typing an Indian mobile number to its 10 digits:
 * "+91 98765-43210", "098765 43210" and "9876543210" all become "9876543210".
 */
export function normalisePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/** A string cleaned by `clean` first, then checked — so rules always see normalised input. */
export const cleaned = (clean: (value: string) => string, error?: string) =>
  z.pipe(z.string(error ? { error } : undefined), z.transform(clean));

/** Free text that must be filled in: spaces collapsed, at least two characters. */
export const requiredText = (error: string, max: number) =>
  z.pipe(
    cleaned(collapseSpaces, error),
    z
      .string()
      .check(
        z.minLength(2, { error }),
        z.maxLength(max, { error: `Keep this under ${max} characters` }),
      ),
  );

/** A 10-digit Indian mobile number, however it was typed. */
export const mobileNumber = () =>
  z.pipe(
    cleaned(normalisePhone, PHONE_ERROR),
    z.string().check(z.regex(MOBILE_PATTERN, { error: PHONE_ERROR })),
  );

/** A 6-digit Indian PIN code, spaces and stray characters removed. */
export const pinCode = () =>
  z.pipe(
    cleaned((value) => value.replace(/\D/g, ''), PINCODE_ERROR),
    z.string().check(z.regex(PINCODE_PATTERN, { error: PINCODE_ERROR })),
  );

/** First error message per field, for forms that show one message under each input. */
export function firstErrorPerField<Field extends string>(
  error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] },
  isField: (name: unknown) => name is Field,
): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const [field] = issue.path;
    if (isField(field) && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
