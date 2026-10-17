/**
 * Turns a validated dealer application into the WhatsApp message the visitor sends to the
 * Dinar team (see whatsapp.ts for the link). They press Send in WhatsApp to deliver it.
 */
// Relative, not `@/`: Vitest runs this module without Astro's path aliases.
import { BUSINESS_TYPES, MONTHLY_VOLUMES, YEARS_IN_BUSINESS } from '../data/dealer-form-options';
import { formatPhone } from './format-phone';
import type { DealerLead } from './schemas/dealer-lead';

interface MessageContext {
  /** Product id → display name, for the products the visitor ticked. */
  productNames: Readonly<Record<string, string>>;
}

const labelOf = (options: readonly { value: string; label: string }[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

/** The application as a WhatsApp message: bold labels (*…*), one fact per line, blank lines between parts. */
export function buildDealerWhatsAppMessage(lead: DealerLead, context: MessageContext): string {
  const products = lead.products.map((id) => context.productNames[id] ?? id).join(', ');
  const lines: (string | null)[] = [
    '*Dealership application - Dinar Detergent*',
    '',
    `*Name:* ${lead.fullName}`,
    `*Mobile:* ${formatPhone(`+91${lead.phone}`)}`,
    lead.email ? `*Email:* ${lead.email}` : null,
    '',
    `*Shop / firm:* ${lead.businessName}`,
    `*Business type:* ${labelOf(BUSINESS_TYPES, lead.businessType)}`,
    lead.gstin ? `*GSTIN:* ${lead.gstin}` : null,
    lead.yearsInBusiness
      ? `*Years in business:* ${labelOf(YEARS_IN_BUSINESS, lead.yearsInBusiness)}`
      : null,
    `*Location:* ${lead.city}, ${lead.state} ${lead.pincode}`,
    '',
    `*Products:* ${products}`,
    lead.monthlyVolume
      ? `*Expected monthly order:* ${labelOf(MONTHLY_VOLUMES, lead.monthlyVolume)}`
      : null,
    lead.message ? `*Message:* ${lead.message}` : null,
  ];
  return lines.filter((line) => line !== null).join('\n');
}
