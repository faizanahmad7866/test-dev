import { describe, expect, it } from 'vitest';
import {
  dealerLeadSchema,
  getFieldErrors,
  normalisePhone,
  type DealerLeadInput,
} from './dealer-lead';

const validLead: DealerLeadInput = {
  fullName: 'Ravi Kumar',
  phone: '9876543210',
  email: '',
  businessName: 'Ravi General Store',
  businessType: 'retailer',
  gstin: '',
  yearsInBusiness: '',
  state: 'Bihar',
  city: 'Patna',
  pincode: '800001',
  products: ['super-wash'],
  monthlyVolume: '',
  message: '',
  consent: true,
};

// Overrides are loosely typed on purpose: the tests feed in values the schema must reject.
const parse = (overrides: Record<string, unknown>) =>
  dealerLeadSchema.safeParse({ ...validLead, ...overrides });

const errorsFor = (overrides: Record<string, unknown>) => {
  const result = parse(overrides);
  return result.success ? {} : getFieldErrors(result.error);
};

describe('normalisePhone', () => {
  it.each([
    ['+91 98765 43210', '9876543210'],
    ['+91-98765-43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['09876543210', '9876543210'],
    ['98765 43210', '9876543210'],
  ])('reduces %s to its 10 digits', (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });
});

describe('dealerLeadSchema', () => {
  it('accepts a minimal valid lead', () => {
    expect(parse({}).success).toBe(true);
  });

  it('normalises before validating', () => {
    const result = parse({
      fullName: '  Ravi    Kumar ',
      phone: '+91 98765 43210',
      email: ' Ravi@Example.COM ',
      gstin: '22aaaaa0000a1z5',
      pincode: '800 001',
    });
    expect(result.success && result.data).toMatchObject({
      fullName: 'Ravi Kumar',
      phone: '9876543210',
      email: 'ravi@example.com',
      gstin: '22AAAAA0000A1Z5',
      pincode: '800001',
    });
  });

  it.each([
    ['phone', { phone: '12345' }, 'Enter a 10-digit mobile number'],
    ['phone', { phone: '5876543210' }, 'Enter a 10-digit mobile number'],
    ['pincode', { pincode: '012345' }, 'Enter a 6-digit PIN code'],
    ['gstin', { gstin: 'NOT-A-GSTIN' }, 'Enter a valid 15-character GSTIN, or leave it blank'],
    ['email', { email: 'ravi@' }, 'Enter a valid email address, or leave it blank'],
    ['businessType', { businessType: 'smuggler' }, 'Choose your business type'],
    ['state', { state: 'Atlantis' }, 'Choose your state'],
    ['products', { products: [] }, 'Choose at least one product'],
    ['consent', { consent: false }, 'Please agree so our team can contact you'],
    ['fullName', { fullName: ' R ' }, 'Enter your full name'],
  ] as const)('rejects a bad %s with a readable message', (field, overrides, message) => {
    expect(errorsFor(overrides)[field]).toBe(message);
  });

  it('caps the message length', () => {
    expect(errorsFor({ message: 'x'.repeat(1001) }).message).toMatch(/under 1,000 characters/);
  });
});
