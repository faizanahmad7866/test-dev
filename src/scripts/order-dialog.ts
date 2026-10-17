/**
 * WhatsApp order panel: opens from any data-js="order-open" control (or #order in the URL),
 * keeps the total in step with pack size and quantity, validates with the shared order
 * schema, then opens WhatsApp in a new tab with the order written out and shows what to do
 * next. Nothing is sent from the page itself: the visitor sends the message in WhatsApp.
 */
import { formatMrp } from '@/lib/format-mrp';
import { buildOrderMessage } from '@/lib/order-whatsapp';
import { getOrderErrors, isOrderField, orderSchema, type OrderField } from '@/lib/schemas/order';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

type FormControl = HTMLInputElement | HTMLTextAreaElement;

const isFormControl = (target: EventTarget | null): target is FormControl =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

export function initOrderDialog(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-js="order-dialog"]');
  const form = dialog?.querySelector<HTMLFormElement>('[data-js="order-form"]');
  const success = dialog?.querySelector<HTMLElement>('[data-order-success]');
  const quantity = form?.elements.namedItem('quantity');
  const whatsappAgain = dialog?.querySelector<HTMLAnchorElement>('[data-order-whatsapp]');
  if (!dialog || !form || !success || !(quantity instanceof HTMLInputElement) || !whatsappAgain) {
    return;
  }
  const whatsappNumber = dialog.dataset['whatsappNumber'] ?? '';
  const maxQuantity = Number(dialog.dataset['maxQuantity']);
  const touched = new Set<OrderField>();

  const selectedPack = () => {
    const radio = form.querySelector<HTMLInputElement>('input[name="variant"]:checked');
    return {
      name: radio?.dataset['name'] ?? '',
      pack: radio?.dataset['pack'] ?? '',
      mrp: Number(radio?.dataset['mrp'] ?? 0),
    };
  };

  const currentQuantity = () => {
    const value = Number.parseInt(quantity.value, 10);
    return Number.isInteger(value) ? value : 0;
  };

  /** Keeps every price on the panel, and the stepper limits, in step with the choices. */
  const updateSummary = () => {
    const { mrp } = selectedPack();
    const count = currentQuantity();
    const valid = count >= 1 && count <= maxQuantity;
    for (const slot of dialog.querySelectorAll<HTMLElement>('[data-order-each]'))
      slot.textContent = formatMrp(mrp);
    for (const slot of dialog.querySelectorAll<HTMLElement>('[data-order-quantity]')) {
      slot.textContent = valid ? String(count) : '–';
    }
    for (const slot of dialog.querySelectorAll<HTMLElement>('[data-order-total]')) {
      slot.textContent = valid ? formatMrp(mrp * count) : '–';
    }
    for (const button of form.querySelectorAll<HTMLButtonElement>('[data-order-step]')) {
      const step = Number(button.dataset['orderStep']);
      button.disabled = step < 0 ? count <= 1 : count >= maxQuantity;
    }
  };

  const readForm = () => {
    const data = new FormData(form);
    const text = (name: OrderField) => {
      const value = data.get(name);
      return typeof value === 'string' ? value : '';
    };
    return {
      variant: text('variant'),
      quantity: text('quantity'),
      fullName: text('fullName'),
      phone: text('phone'),
      address: text('address'),
      city: text('city'),
      pincode: text('pincode'),
      note: text('note'),
    };
  };

  const setFieldError = (field: OrderField, message: string | undefined) => {
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

  const showErrors = (fields: Iterable<OrderField>) => {
    const result = orderSchema.safeParse(readForm());
    const errors = result.success ? {} : getOrderErrors(result.error);
    for (const field of fields) setFieldError(field, errors[field]);
    return errors;
  };

  const showForm = () => {
    success.hidden = true;
    form.hidden = false;
  };

  const open = () => {
    showForm();
    updateSummary();
    if (!dialog.open) dialog.showModal();
    form.querySelector<HTMLInputElement>('input[name="variant"]:checked')?.focus();
  };

  for (const opener of document.querySelectorAll<HTMLElement>('[data-js="order-open"]')) {
    opener.addEventListener('click', open);
  }
  if (location.hash === '#order') open();

  dialog.querySelector('[data-order-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-order-done]')?.addEventListener('click', () => dialog.close());
  // A click on the backdrop lands on the <dialog> itself, outside its box: close.
  dialog.addEventListener('click', (event) => {
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (event.target === dialog && outside) dialog.close();
  });

  for (const button of form.querySelectorAll<HTMLButtonElement>('[data-order-step]')) {
    button.addEventListener('click', () => {
      const next = Math.min(
        maxQuantity,
        Math.max(1, currentQuantity() + Number(button.dataset['orderStep'])),
      );
      quantity.value = String(next);
      updateSummary();
      if (touched.has('quantity')) showErrors(['quantity']);
    });
  }

  // Judge a typed field when the visitor leaves it, then re-check it on every keystroke.
  form.addEventListener('focusout', ({ target }) => {
    if (!isFormControl(target) || target.type === 'radio' || !isOrderField(target.name)) return;
    if (target.value === '' && !touched.has(target.name)) return;
    touched.add(target.name);
    showErrors([target.name]);
  });
  const onEdit = ({ target }: Event) => {
    if (!isFormControl(target)) return;
    if (target === quantity || target.name === 'variant') updateSummary();
    if (isOrderField(target.name) && touched.has(target.name)) showErrors([target.name]);
  };
  form.addEventListener('input', onEdit);
  form.addEventListener('change', onEdit);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = orderSchema.safeParse(readForm());
    if (!result.success) {
      for (const field of Object.keys(orderSchema.shape).filter(isOrderField)) touched.add(field);
      showErrors(touched);
      form.querySelector<FormControl>('[aria-invalid="true"]')?.focus();
      return;
    }
    const url = buildWhatsAppUrl(whatsappNumber, buildOrderMessage(result.data, selectedPack()));
    // Synchronous, inside the submit's user activation: browsers allow the new tab.
    window.open(url, '_blank', 'noopener');
    whatsappAgain.href = url;
    form.hidden = true;
    success.hidden = false;
    success.querySelector<HTMLElement>('[data-order-success-heading]')?.focus();
  });

  // Once the panel is closed after an order, it opens on the form again next time.
  dialog.addEventListener('close', showForm);
  form.noValidate = true;
}
