/**
 * Dealer application form: validates with the same Zod schema the server uses and shows
 * errors beside each field. A valid application opens WhatsApp in a new tab, prefilled for
 * the Dinar team, while this page stays put and shows what to do next. A copy is then saved
 * on our server (JSON + Turnstile token) in the background, best effort: WhatsApp has
 * already carried the application, so a failed save costs the visitor nothing.
 */
import {
  DEALER_LEAD_ENDPOINT,
  dealerLeadSchema,
  getFieldErrors,
  isDealerLeadField,
  MESSAGE_MAX_LENGTH,
  type DealerLead,
  type DealerLeadField,
  type DealerLeadRequest,
  type DealerLeadResponse,
  type FieldErrors,
} from '@/lib/schemas/dealer-lead';
import { buildDealerWhatsAppMessage } from '@/lib/dealer-whatsapp';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
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

function readProductNames(json: string | undefined): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(json ?? '{}');
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
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
  const counter = form.querySelector<HTMLElement>('[data-js="message-counter"]');
  const turnstileSlot = form.querySelector<HTMLElement>('[data-js="turnstile"]');
  const whatsappLink = success?.querySelector<HTMLAnchorElement>('[data-success-whatsapp]');
  const referenceBlock = success?.querySelector<HTMLElement>('[data-success-reference-block]');
  const referenceText = success?.querySelector<HTMLElement>('[data-success-reference]');
  const phoneText = success?.querySelector<HTMLElement>('[data-success-phone]');
  const { turnstileSiteKey = '', whatsappNumber = '' } = form.dataset;
  const productNames = readProductNames(form.dataset['productNames']);
  if (!success || !alert || !alertText || !submit || !turnstileSlot || !whatsappNumber) return;
  if (!whatsappLink || !referenceBlock || !referenceText || !phoneText) return;

  // JS is running, so our inline errors replace the browser's own validation bubbles.
  form.noValidate = true;

  // "Stock this product" on a product page arrives with ?product=<id>: tick it for the visitor.
  const requestedProduct = new URLSearchParams(location.search).get('product');
  for (const box of form.querySelectorAll<HTMLInputElement>('input[name="products"]')) {
    if (box.value === requestedProduct) box.checked = true;
  }
  const touched = new Set<DealerLeadField>();
  let turnstile: Promise<TurnstileWidget> | null = null;

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

  /** Opens WhatsApp in a new tab with the application, and swaps the form for the next-step panel. */
  const handOffToWhatsApp = (lead: DealerLead) => {
    const url = buildWhatsAppUrl(
      whatsappNumber,
      buildDealerWhatsAppMessage(lead, { productNames }),
    );
    // Called synchronously inside the submit's user activation: after an await, browsers
    // block new tabs. noopener keeps the WhatsApp tab from reaching back into this page.
    window.open(url, '_blank', 'noopener');
    whatsappLink.href = url;
    phoneText.textContent = formatPhone(`+91${lead.phone}`);
    form.hidden = true;
    success.hidden = false;
    // Move focus to the heading so screen readers announce the outcome, not silence.
    success.querySelector<HTMLElement>('[data-success-heading]')?.focus();
    card?.scrollIntoView({ block: 'start' });
  };

  /** Keeps a server copy of the application and shows its reference once saved. */
  const saveLead = async (lead: DealerLead) => {
    let widget: TurnstileWidget | null = null;
    try {
      widget = await ensureTurnstile();
      const request: DealerLeadRequest = {
        lead,
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
        referenceText.textContent = body.referenceId;
        referenceBlock.hidden = false;
      }
    } catch {
      // Nothing to tell the visitor: their application already went out on WhatsApp.
    } finally {
      widget?.reset();
    }
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();
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

    handOffToWhatsApp(result.data);
    void saveLead(result.data);
  });

  // Every handler is wired: only now may the visitor submit (the markup ships it disabled).
  submit.disabled = false;
}
