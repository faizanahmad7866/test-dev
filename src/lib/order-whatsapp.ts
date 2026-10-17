// Relative, not `@/`: Vitest runs this module without Astro's path aliases.
import { formatMrp } from './format-mrp';
import { formatPhone } from './format-phone';
import type { Order } from './schemas/order';

export interface OrderPack {
  /** Product and size as the site names it, e.g. "Dinar Detergent Powder 1 kg". */
  name: string;
  pack: string;
  mrp: number;
}

/**
 * The order as a WhatsApp message to the Dinar team: what, how many, the total at MRP, and
 * where to deliver. Bold labels (*…*), one fact per line, blank lines between parts.
 */
export function buildOrderMessage(order: Order, pack: OrderPack): string {
  const lines: (string | null)[] = [
    '*New order - Dinar Detergent*',
    '',
    `*Product:* ${pack.name} (${pack.pack})`,
    `*Quantity:* ${order.quantity}`,
    `*MRP:* ${formatMrp(pack.mrp)} each`,
    `*Total at MRP:* ${formatMrp(pack.mrp * order.quantity)}`,
    '',
    `*Name:* ${order.fullName}`,
    `*Mobile:* ${formatPhone(`+91${order.phone}`)}`,
    `*Address:* ${order.address}`,
    `*City:* ${order.city} - ${order.pincode}`,
    order.note ? `*Note:* ${order.note}` : null,
  ];
  return lines.filter((line) => line !== null).join('\n');
}
