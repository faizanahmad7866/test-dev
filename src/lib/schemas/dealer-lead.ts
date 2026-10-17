/**
 * Dealer enquiry: the one schema shared by the browser form and the Pages Function, plus
 * the request/response contract between them. Normalisation lives in the schema itself,
 * so both sides clean input identically before validating it.
 *
 * Uses zod/mini: same validation as full Zod at roughly a fifth of the browser bundle.
 */
import * as z from 'zod/mini';
// Relative, not `@/`: this module is bundled into Cloudflare Functions too (rules.md §1).
import { BUSINESS_TYPES, MONTHLY_VOLUMES, YEARS_IN_BUSINESS } from '../../data/dealer-form-options';
import { INDIAN_STATES } from '../../data/indian-states';
import { cleaned, firstErrorPerField, mobileNumber, pinCode, requiredText } from './fields';

export { normalisePhone } from './fields';

export const DEALER_LEAD_ENDPOINT = '/api/dealer-lead';
export const MESSAGE_MAX_LENGTH = 1000;

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PRODUCT_ID_PATTERN = /^[a-z0-9-]{1,60}$/;
const emailSchema = z.email();

const optionValues = (options: readonly { value: string }[]): string[] =>
  options.map(({ value }) => value);

/** A select left on its placeholder sends "", which is a valid answer for optional questions. */
const optionalChoice = (options: readonly { value: string }[]) =>
  z.string().check(
    z.refine((value) => value === '' || optionValues(options).includes(value), {
      error: 'Choose an option from the list',
    }),
  );

export const dealerLeadSchema = z.object({
  fullName: requiredText('Enter your full name', 80),
  phone: mobileNumber(),
  email: z.pipe(
    cleaned((value) => value.trim().toLowerCase()),
    z.string().check(
      z.refine((value) => value === '' || emailSchema.safeParse(value).success, {
        error: 'Enter a valid email address, or leave it blank',
      }),
    ),
  ),
  businessName: requiredText('Enter your shop or firm name', 120),
  businessType: z.enum(optionValues(BUSINESS_TYPES), { error: 'Choose your business type' }),
  gstin: z.pipe(
    cleaned((value) => value.replace(/\s/g, '').toUpperCase()),
    z.string().check(
      z.refine((value) => value === '' || GSTIN_PATTERN.test(value), {
        error: 'Enter a valid 15-character GSTIN, or leave it blank',
      }),
    ),
  ),
  yearsInBusiness: optionalChoice(YEARS_IN_BUSINESS),
  state: z.enum(INDIAN_STATES, { error: 'Choose your state' }),
  city: requiredText('Enter your city or district', 80),
  pincode: pinCode(),
  products: z
    .array(z.string().check(z.regex(PRODUCT_ID_PATTERN)), { error: 'Choose at least one product' })
    .check(z.minLength(1, { error: 'Choose at least one product' }), z.maxLength(10)),
  monthlyVolume: optionalChoice(MONTHLY_VOLUMES),
  message: z.pipe(
    cleaned((value) => value.trim()),
    z.string().check(
      z.maxLength(MESSAGE_MAX_LENGTH, {
        error: `Keep your message under ${MESSAGE_MAX_LENGTH.toLocaleString('en-IN')} characters`,
      }),
    ),
  ),
  consent: z.literal(true, { error: 'Please agree so our team can contact you' }),
});

export type DealerLeadInput = z.input<typeof dealerLeadSchema>;
export type DealerLead = z.output<typeof dealerLeadSchema>;
export type DealerLeadField = keyof DealerLead;
export type FieldErrors = Partial<Record<DealerLeadField, string>>;

export function isDealerLeadField(name: unknown): name is DealerLeadField {
  return typeof name === 'string' && Object.hasOwn(dealerLeadSchema.shape, name);
}

/** First error message per field, in the shape the form renders under each input. */
export function getFieldErrors(error: {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}): FieldErrors {
  return firstErrorPerField(error, isDealerLeadField);
}

/** What the browser posts: the lead plus anti-spam fields that never reach storage. */
export interface DealerLeadRequest {
  lead: DealerLeadInput;
  turnstileToken: string;
  /** Honeypot. Hidden from people; bots that fill every input fill this too. */
  website: string;
}

export type DealerLeadErrorCode =
  | 'method_not_allowed'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'invalid_request'
  | 'verification_failed'
  | 'validation_failed'
  | 'server_error';

export type DealerLeadResponse =
  | { ok: true; referenceId: string }
  | { ok: false; referenceId: string; code: DealerLeadErrorCode; fieldErrors?: FieldErrors };
