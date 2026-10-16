import type { D1Database } from '@cloudflare/workers-types';
import {
  dealerLeadSchema,
  getFieldErrors,
  type DealerLeadErrorCode,
  type DealerLeadResponse,
  type FieldErrors,
} from '../../src/lib/schemas/dealer-lead';
import { sendLeadEmail } from './lead-email';
import { markEmailStatus, storeLead, type EmailStatus } from './lead-store';
import { createReferenceId } from './reference-id';
import { verifyTurnstile } from './verify-turnstile';

export interface DealerLeadEnv {
  DB: D1Database;
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  LEADS_EMAIL_FROM: string;
  LEADS_EMAIL_TO: string;
}

const MAX_BODY_BYTES = 16 * 1024;

interface Envelope {
  lead: unknown;
  turnstileToken: string;
  website: string;
}

function parseEnvelope(rawBody: string): Envelope | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;
  if (!('lead' in body) || !('turnstileToken' in body) || !('website' in body)) return null;
  const { lead, turnstileToken, website } = body;
  if (typeof turnstileToken !== 'string' || typeof website !== 'string') return null;
  return { lead, turnstileToken, website };
}

/**
 * POST /api/dealer-lead. Steps run in a fixed order (rules.md §8) and the first failure wins:
 * method → content-type → size cap → honeypot → Turnstile → schema → store → deliver → respond.
 * Logs only the reference, status and timing — never the submitted values.
 */
export async function handleDealerLead(request: Request, env: DealerLeadEnv): Promise<Response> {
  const startedAt = Date.now();
  const referenceId = createReferenceId();

  const respond = (status: number, body: DealerLeadResponse, emailStatus?: EmailStatus) => {
    console.log(
      JSON.stringify({
        event: 'dealer_lead',
        referenceId,
        status,
        emailStatus,
        ms: Date.now() - startedAt,
      }),
    );
    return Response.json(body, { status, headers: status === 405 ? { Allow: 'POST' } : {} });
  };
  const fail = (status: number, code: DealerLeadErrorCode, fieldErrors?: FieldErrors) =>
    respond(status, { ok: false, referenceId, code, ...(fieldErrors ? { fieldErrors } : {}) });

  if (request.method !== 'POST') return fail(405, 'method_not_allowed');

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return fail(415, 'unsupported_media_type');
  }

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return fail(413, 'payload_too_large');
  }
  // Content-Length can be absent or wrong, so measure what actually arrived as well.
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return fail(413, 'payload_too_large');
  }

  const envelope = parseEnvelope(rawBody);
  if (!envelope) return fail(400, 'invalid_request');

  // A filled honeypot is a bot. Answer like a success so it learns nothing; store and send nothing.
  if (envelope.website !== '') return respond(201, { ok: true, referenceId });

  const isHuman = await verifyTurnstile(
    envelope.turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    request.headers.get('cf-connecting-ip'),
  );
  if (!isHuman) return fail(403, 'verification_failed');

  const parsed = dealerLeadSchema.safeParse(envelope.lead);
  if (!parsed.success) return fail(422, 'validation_failed', getFieldErrors(parsed.error));
  const lead = parsed.data;

  try {
    await storeLead(env.DB, referenceId, lead);
  } catch {
    return fail(500, 'server_error');
  }

  // The lead is safe in D1 from here on. A failed email is recorded for follow-up, not shown to the user.
  const isEmailSent = await sendLeadEmail(
    { apiKey: env.RESEND_API_KEY, from: env.LEADS_EMAIL_FROM, to: env.LEADS_EMAIL_TO },
    referenceId,
    lead,
  );
  const emailStatus: EmailStatus = isEmailSent ? 'sent' : 'failed';
  try {
    await markEmailStatus(env.DB, referenceId, emailStatus);
  } catch {
    // Stays 'pending' in D1, which the team treats the same as 'failed'.
  }

  return respond(201, { ok: true, referenceId }, emailStatus);
}
