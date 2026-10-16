import type { D1Database } from '@cloudflare/workers-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DealerLeadInput, DealerLeadResponse } from '../../src/lib/schemas/dealer-lead';
import { handleDealerLead, type DealerLeadEnv } from './handle-dealer-lead';

const validLead: DealerLeadInput = {
  fullName: 'Ravi Kumar',
  phone: '+91 98765 43210',
  email: 'ravi@example.com',
  businessName: 'Ravi General Store',
  businessType: 'retailer',
  gstin: '',
  yearsInBusiness: '1-3',
  state: 'Bihar',
  city: 'Patna',
  pincode: '800001',
  products: ['super-wash', 'detergent-cake'],
  monthlyVolume: '',
  message: '<b>Call after 5pm</b>',
  consent: true,
};

interface Statement {
  sql: string;
  values: unknown[];
}

/** Minimal D1 stand-in that records every statement it runs. */
function createDb({ shouldFailInsert = false } = {}) {
  const statements: Statement[] = [];
  const db = {
    prepare: (sql: string) => ({
      bind: (...values: unknown[]) => ({
        run: async () => {
          if (shouldFailInsert && sql.includes('INSERT')) throw new Error('D1 unavailable');
          statements.push({ sql, values });
          return { success: true };
        },
      }),
    }),
  };
  return { db: db as unknown as D1Database, statements };
}

/** Routes outbound fetches to fake Turnstile and Resend endpoints. */
function stubNetwork({ isHuman = true, isEmailAccepted = true } = {}) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.includes('turnstile')) return Response.json({ success: isHuman });
    if (url.includes('resend')) return new Response(null, { status: isEmailAccepted ? 200 : 500 });
    throw new Error(`Unexpected fetch to ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function createEnv(db: D1Database): DealerLeadEnv {
  return {
    DB: db,
    TURNSTILE_SECRET_KEY: 'test-secret',
    RESEND_API_KEY: 'test-resend-key',
    LEADS_EMAIL_FROM: 'Dinar Website <leads@example.com>',
    LEADS_EMAIL_TO: 'sales@example.com',
  };
}

function post(body: unknown, init: RequestInit = {}) {
  return new Request('https://dinardetergent.com/api/dealer-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  });
}

const validBody = { lead: validLead, turnstileToken: 'token', website: '' };

async function send(request: Request, db: D1Database) {
  const response = await handleDealerLead(request, createEnv(db));
  return { status: response.status, body: (await response.json()) as DealerLeadResponse };
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('handleDealerLead', () => {
  it('rejects methods other than POST', async () => {
    const { db } = createDb();
    const request = new Request('https://dinardetergent.com/api/dealer-lead');
    const response = await handleDealerLead(request, createEnv(db));
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
  });

  it('rejects bodies that are not JSON', async () => {
    const { db } = createDb();
    const request = post('name=Ravi', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    expect((await send(request, db)).status).toBe(415);
  });

  it('rejects oversized bodies before parsing them', async () => {
    const { db } = createDb();
    const { status } = await send(post({ ...validBody, website: 'x'.repeat(20_000) }), db);
    expect(status).toBe(413);
  });

  it('rejects malformed JSON', async () => {
    const { db } = createDb();
    expect((await send(post('{"lead":'), db)).status).toBe(400);
  });

  it('answers a filled honeypot like a success but stores and sends nothing', async () => {
    const fetchMock = stubNetwork();
    const { db, statements } = createDb();
    const { status, body } = await send(
      post({ ...validBody, website: 'https://spam.example' }),
      db,
    );
    expect(status).toBe(201);
    expect(body.ok).toBe(true);
    expect(statements).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a failed Turnstile check without storing', async () => {
    stubNetwork({ isHuman: false });
    const { db, statements } = createDb();
    const { status, body } = await send(post(validBody), db);
    expect(status).toBe(403);
    expect(body).toMatchObject({ ok: false, code: 'verification_failed' });
    expect(statements).toHaveLength(0);
  });

  it('returns field errors for an invalid lead', async () => {
    stubNetwork();
    const { db, statements } = createDb();
    const { status, body } = await send(
      post({ ...validBody, lead: { ...validLead, phone: '123' } }),
      db,
    );
    expect(status).toBe(422);
    expect(body).toMatchObject({
      code: 'validation_failed',
      fieldErrors: { phone: expect.any(String) },
    });
    expect(statements).toHaveLength(0);
  });

  it('errors with a reference and sends no email when the lead cannot be stored', async () => {
    const fetchMock = stubNetwork();
    const { db } = createDb({ shouldFailInsert: true });
    const { status, body } = await send(post(validBody), db);
    expect(status).toBe(500);
    expect(body).toMatchObject({
      ok: false,
      code: 'server_error',
      referenceId: expect.stringMatching(/^DL-/),
    });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('resend'))).toBe(false);
  });

  it('still succeeds when only the email fails, and records that for follow-up', async () => {
    stubNetwork({ isEmailAccepted: false });
    const { db, statements } = createDb();
    const { status, body } = await send(post(validBody), db);
    expect(status).toBe(201);
    expect(body.ok).toBe(true);
    expect(statements.at(-1)?.values).toEqual(['failed', body.referenceId]);
  });

  it('stores the normalised lead, emails it escaped, and returns its reference', async () => {
    const fetchMock = stubNetwork();
    const { db, statements } = createDb();
    const { status, body } = await send(post(validBody), db);

    expect(status).toBe(201);
    expect(body).toEqual({
      ok: true,
      referenceId: expect.stringMatching(/^DL-\d{8}-[2-9A-Z]{6}$/),
    });

    const [insert, update] = statements;
    expect(insert?.values.slice(0, 3)).toEqual([body.referenceId, 'Ravi Kumar', '9876543210']);
    expect(insert?.values[11]).toBe('super-wash,detergent-cake');
    expect(update?.values).toEqual(['sent', body.referenceId]);

    const emailCall = fetchMock.mock.calls.find(([url]) => String(url).includes('resend'));
    const emailBody = JSON.parse(String(emailCall?.[1]?.body));
    expect(emailBody.html).toContain('&lt;b&gt;Call after 5pm&lt;/b&gt;');
    expect(emailBody.html).not.toContain('<b>Call');
    expect(emailBody.reply_to).toBe('ravi@example.com');
  });
});
