/**
 * A WhatsApp product order: the pack, how many, and where it goes. Validated in the browser
 * before WhatsApp opens; the Dinar team confirms everything else in the chat.
 */
import * as z from 'zod/mini';
import {
  collapseSpaces,
  cleaned,
  firstErrorPerField,
  mobileNumber,
  pinCode,
  requiredText,
} from './fields';

export const ORDER_MAX_QUANTITY = 99;
export const ORDER_NOTE_MAX_LENGTH = 300;

export const orderSchema = z.object({
  variant: z.string().check(z.minLength(1, { error: 'Choose a pack size' })),
  quantity: z
    .pipe(
      z.string(),
      z.transform((value) => Number(value)),
    )
    .check(
      z.refine((value) => Number.isInteger(value) && value >= 1 && value <= ORDER_MAX_QUANTITY, {
        error: `Choose a quantity from 1 to ${ORDER_MAX_QUANTITY}`,
      }),
    ),
  fullName: requiredText('Enter your full name', 80),
  phone: mobileNumber(),
  address: requiredText('Enter your house, street and area', 200),
  city: requiredText('Enter your city or town', 80),
  pincode: pinCode(),
  note: z.pipe(
    cleaned(collapseSpaces),
    z.string().check(
      z.maxLength(ORDER_NOTE_MAX_LENGTH, {
        error: `Keep your note under ${ORDER_NOTE_MAX_LENGTH} characters`,
      }),
    ),
  ),
});

export type OrderInput = z.input<typeof orderSchema>;
export type Order = z.output<typeof orderSchema>;
export type OrderField = keyof Order;

export function isOrderField(name: unknown): name is OrderField {
  return typeof name === 'string' && Object.hasOwn(orderSchema.shape, name);
}

/** First error message per field, in the shape the form renders under each input. */
export function getOrderErrors(error: {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}): Partial<Record<OrderField, string>> {
  return firstErrorPerField(error, isOrderField);
}
