import { describe, expect, it } from 'vitest';
import { buildProductEnquiryMessage } from './product-enquiry';
import { buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('uses the bare international number and encodes the text', () => {
    expect(buildWhatsAppUrl('+917448211313', 'Hi & bye\n1+1 *bold*')).toBe(
      'https://api.whatsapp.com/send?phone=917448211313&text=Hi%20%26%20bye%0A1%2B1%20*bold*',
    );
  });
});

describe('buildProductEnquiryMessage', () => {
  it('names the pack and its MRP, then opens the conversation', () => {
    expect(
      buildProductEnquiryMessage({ name: 'Dinar Super Wash 5 kg', pack: 'Bag', mrp: 399 }),
    ).toBe(
      '*Product enquiry - Dinar Super Wash 5 kg*\nBag, MRP ₹399.00\n\nHi, I would like to know more about this product.',
    );
  });
});
