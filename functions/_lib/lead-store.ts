import type { D1Database } from '@cloudflare/workers-types';
import type { DealerLead } from '../../src/lib/schemas/dealer-lead';

export type EmailStatus = 'sent' | 'failed';

/** Writes a validated lead to D1. Optional answers left blank are stored as NULL. Throws on failure. */
export async function storeLead(
  db: D1Database,
  referenceId: string,
  lead: DealerLead,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO dealer_leads (
        reference_id, full_name, phone, email, business_name, business_type, gstin,
        years_in_business, state, city, pincode, products, monthly_volume, message
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
    )
    .bind(
      referenceId,
      lead.fullName,
      lead.phone,
      lead.email || null,
      lead.businessName,
      lead.businessType,
      lead.gstin || null,
      lead.yearsInBusiness || null,
      lead.state,
      lead.city,
      lead.pincode,
      lead.products.join(','),
      lead.monthlyVolume || null,
      lead.message || null,
    )
    .run();
}

/** Records whether the notification email went out, so the team can follow up on `failed` rows. */
export async function markEmailStatus(
  db: D1Database,
  referenceId: string,
  status: EmailStatus,
): Promise<void> {
  await db
    .prepare('UPDATE dealer_leads SET email_status = ?1 WHERE reference_id = ?2')
    .bind(status, referenceId)
    .run();
}
