import {
  BUSINESS_TYPES,
  MONTHLY_VOLUMES,
  YEARS_IN_BUSINESS,
} from '../../src/data/dealer-form-options';
import type { DealerLead } from '../../src/lib/schemas/dealer-lead';
import { escapeHtml } from './escape-html';
import { NETWORK_TIMEOUT_MS } from './network';

const RESEND_URL = 'https://api.resend.com/emails';
const NOT_GIVEN = '—';

export interface LeadEmailConfig {
  apiKey: string;
  from: string;
  to: string;
}

const labelFor = (options: readonly { value: string; label: string }[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? (value || NOT_GIVEN);

function toRows(lead: DealerLead): [string, string][] {
  return [
    ['Name', lead.fullName],
    ['Mobile', `+91 ${lead.phone}`],
    ['Email', lead.email || NOT_GIVEN],
    ['Business', lead.businessName],
    ['Business type', labelFor(BUSINESS_TYPES, lead.businessType)],
    ['GSTIN', lead.gstin || NOT_GIVEN],
    ['In business for', labelFor(YEARS_IN_BUSINESS, lead.yearsInBusiness)],
    ['Location', `${lead.city}, ${lead.state} ${lead.pincode}`],
    ['Products', lead.products.join(', ')],
    ['Monthly volume', labelFor(MONTHLY_VOLUMES, lead.monthlyVolume)],
    ['Message', lead.message || NOT_GIVEN],
  ];
}

/**
 * Emails the sales team about a new lead via Resend. Returns whether Resend accepted it and
 * never throws — the lead is already stored, so a failed email must not fail the request.
 */
export async function sendLeadEmail(
  config: LeadEmailConfig,
  referenceId: string,
  lead: DealerLead,
): Promise<boolean> {
  const rows = toRows(lead);
  const html = `<h2>New dealer enquiry ${escapeHtml(referenceId)}</h2><table cellpadding="6">${rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" valign="top">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('')}</table>`;
  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');

  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.from,
        to: config.to,
        subject: `Dealer enquiry ${referenceId}: ${lead.businessName}, ${lead.city}`,
        html,
        text,
        ...(lead.email ? { reply_to: lead.email } : {}),
      }),
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
