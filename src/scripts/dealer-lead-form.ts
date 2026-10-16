/**
 * Dealer enquiry form: validates with the same Zod schema the server uses, shows errors
 * beside each field, submits as JSON with a Turnstile token and swaps in a success panel.
 * Entered values are never cleared on failure, so a network error costs the visitor nothing.
 */
import {
  DEALER_LEAD_ENDPOINT,
  dealerLeadSchema,
  getFieldErrors,
  isDealerLeadField,
  MESSAGE_MAX_LENGTH,
  type DealerLeadField,
  type DealerLeadRequest,
  type DealerLeadResponse,
  type FieldErrors,
} from '@/lib/schemas/dealer-lead';
import { formatPhone } from '@/lib/format-phone';
import { mountTurnstile, type TurnstileWidget } from '@/scripts/turnstile';

const ROOT = '[data-js="dealer-lead-form"]';
// The server can spend up to two 8 s budgets (Turnstile + email), so allow a little more.
const SUBMIT_TIMEOUT_MS = 20_000;
const TOKEN_TIMEOUT_MS = 10_000;

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isFormControl = (target: EventTarget | null): target is FormControl =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLSelectElement ||
  target instanceof HTMLTextAreaElement;

const isChoice = (control: FormControl): boolean =>
  control instanceof HTMLInputElement && (control.type === 'radio' || control.type === 'checkbox');

function readForm(form: HTMLFormElement): Record<DealerLeadField, unknown> {
  const data = new FormData(form);
  const text = (name: DealerLeadField) => {
    const value = data.get(name);
    return typeof value === 'string' ? value : '';
  };
  return {
    fullName: text('fullName'),
    phone: text('phone'),
    email: text('email'),
    businessName: text('businessName'),
    businessType: text('businessType'),
    gstin: text('gstin'),
    yearsInBusiness: text('yearsInBusiness'),
    state: text('state'),
    city: text('city'),
    pincode: text('pincode'),
    products: data.getAll('products').filter((value) => typeof value === 'string'),
    monthlyVolume: text('monthlyVolume'),
    message: text('message'),
    consent: data.get('consent') === 'on',
  };
}

function isDealerLeadResponse(value: unknown): value is DealerLeadResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof value.ok === 'boolean' &&
    'referenceId' in value &&
    typeof value.referenceId === 'string'
  );
}

export function initDealerLeadForm(): void {
  const form = document.querySelector<HTMLFormElement>(ROOT);
  if (!form) return;
  const card = form.closest<HTMLElement>('[data-js="dealer-lead-card"]');
  const success = card?.querySelector<HTMLElement>('[data-js="dealer-lead-success"]');
  const alert = form.querySelector<HTMLElement>('[data-js="form-alert"]');
  const alertText = alert?.querySelector<HTMLElement>('[data-alert-text]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = submit?.querySelector<HTMLElement>('[data-submit-label]');
  const counter = form.querySelector<HTMLElement>('[data-js="message-counter"]');
  const turnstileSlot = form.querySelector<HTMLElement>('[data-js="turnstile"]');
  const { turnstileSiteKey = '', supportPhone = '' } = form.dataset;
  if (!success || !alert || !alertText || !submit || !submitLabel || !turnstileSlot) return;

  // JS is running, so our inline errors replace the browser's own validation bubbles.
  form.noValidate = true;
  const touched = new Set<DealerLeadField>();
  let turnstile: Promise<TurnstileWidget> | null = null;
  let isSubmitting = false;

  const ensureTurnstile = () => {
    turnstile ??= mountTurnstile(turnstileSlot, turnstileSiteKey).catch((error: unknown) => {
      turnstile = null;
      throw error;
    });
    return turnstile;
  };

  const setFieldError = (field: DealerLeadField, message: string | undefined) => {
    const error = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
    const text = error?.querySelector<HTMLElement>('[data-error-text]');
    if (error && text) {
      text.textContent = message ?? '';
      error.hidden = !message;
    }
    for (const control of form.querySelectorAll<FormControl>(`[name="${field}"]`)) {
      if (message) control.setAttribute('aria-invalid', 'true');
      else control.removeAttribute('aria-invalid');
    }
  };

  const currentErrors = (): FieldErrors => {
    const result = dealerLeadSchema.safeParse(readForm(form));
    return result.success ? {} : getFieldErrors(result.error);
  };

  const showErrors = (errors: FieldErrors, fields: Iterable<DealerLeadField>) => {
    for (const field of fields) setFieldError(field, errors[field]);
  };

  const showAlert = (message: string) => {
    alertText.textContent = message;
    alert.hidden = false;
  };

  const focusFirstInvalid = () => {
    form.querySelector<FormControl>('[aria-invalid="true"]')?.focus();
  };

  const setBusy = (isBusy: boolean) => {
    isSubmitting = isBusy;
    submit.disabled = isBusy;
    submit.setAttribute('aria-busy', String(isBusy));
    submitLabel.textContent = isBusy ? 'Sending…' : 'Submit enquiry';
  };

  const showSuccess = (referenceId: string, phone: string) => {
    for (const slot of success.querySelectorAll<HTMLElement>('[data-success-reference]')) {
      slot.textContent = referenceId;
    }
    for (const slot of success.querySelectorAll<HTMLElement>('[data-success-phone]')) {
      slot.textContent = formatPhone(`+91${phone}`);
    }
    form.hidden = true;
    success.hidden = false;
    // Move focus to the heading so screen readers announce the outcome, not silence.
    success.querySelector<HTMLElement>('[data-success-heading]')?.focus();
    card?.scrollIntoView({ block: 'start' });
  };

  form.addEventListener('focusin', () => void ensureTurnstile().catch(() => undefined), {
    once: true,
  });

  // Judge a typed field when the visitor leaves it — but not one they merely tabbed past empty.
  // Once a field shows an error it re-checks on every keystroke, so the error clears as they fix it.
  form.addEventListener('focusout', ({ target }) => {
    if (!isFormControl(target) || isChoice(target) || !isDealerLeadField(target.name)) return;
    if (target.value === '' && !touched.has(target.name)) return;
    touched.add(target.name);
    showErrors(currentErrors(), [target.name]);
  });

  const revalidateTouched = (event: Event) => {
    const { target } = event;
    if (!isFormControl(target)) return;
    if (target === form.elements.namedItem('message') && counter) {
      counter.textContent = `${target.value.length.toLocaleString('en-IN')} / ${MESSAGE_MAX_LENGTH.toLocaleString('en-IN')}`;
    }
    if (!isDealerLeadField(target.name)) return;
    // Picking a choice or option is deliberate, so it counts as touched straight away.
    if (event.type === 'change') touched.add(target.name);
    if (touched.has(target.name)) showErrors(currentErrors(), [target.name]);
  };
  form.addEventListener('input', revalidateTouched);
  form.addEventListener('change', revalidateTouched);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    alert.hidden = true;

    const result = dealerLeadSchema.safeParse(readForm(form));
    if (!result.success) {
      const errors = getFieldErrors(result.error);
      for (const field of Object.keys(dealerLeadSchema.shape).filter(isDealerLeadField)) {
        touched.add(field);
      }
      showErrors(errors, touched);
      const count = Object.keys(errors).length;
      showAlert(
        `Please check the ${count === 1 ? 'highlighted field' : `${count} highlighted fields`} below.`,
      );
      focusFirstInvalid();
      return;
    }

    setBusy(true);
    let widget: TurnstileWidget | null = null;
    try {
      widget = await ensureTurnstile();
      const request: DealerLeadRequest = {
        lead: result.data,
        turnstileToken: await widget.getToken(TOKEN_TIMEOUT_MS),
        website: new FormData(form).get('website')?.toString() ?? '',
      };
      const response = await fetch(DEALER_LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      });
      const body: unknown = await response.json().catch(() => null);

      if (isDealerLeadResponse(body) && body.ok) {
        showSuccess(body.referenceId, result.data.phone);
        return;
      }
      if (
        isDealerLeadResponse(body) &&
        !body.ok &&
        body.code === 'validation_failed' &&
        body.fieldErrors
      ) {
        showErrors(body.fieldErrors, Object.keys(body.fieldErrors).filter(isDealerLeadField));
        showAlert('Please check the highlighted fields below.');
        focusFirstInvalid();
        return;
      }
      const reference = isDealerLeadResponse(body) ? ` (reference ${body.referenceId})` : '';
      showAlert(
        `We couldn't send your enquiry${reference}. Your details are still here — please try again, or call us on ${supportPhone}.`,
      );
    } catch {
      showAlert(
        `We couldn't reach our server. Check your connection and try again, or call us on ${supportPhone}.`,
      );
    } finally {
      widget?.reset();
      setBusy(false);
    }
  });
}
