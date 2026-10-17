import { describe, expect, it } from 'vitest';
import { buildDealerWhatsAppMessage } from './dealer-whatsapp';
import { dealerLeadSchema, type DealerLead } from './schemas/dealer-lead';

const lead: DealerLead = dealerLeadSchema.parse({
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
  products: ['super-wash', 'detergent-cake'],
  monthlyVolume: '',
  message: '',
  consent: true,
});
const productNames = { 'super-wash': 'Dinar Super Wash', 'detergent-cake': 'Dinar Detergent Cake' };

describe('buildDealerWhatsAppMessage', () => {
  it('lists the required facts with readable labels and product names', () => {
    const message = buildDealerWhatsAppMessage(lead, { productNames });
    expect(message).toContain('*Name:* Ravi Kumar');
    expect(message).toContain('*Mobile:* +91 98765 43210');
    expect(message).toContain('*Business type:* Retailer');
    expect(message).toContain('*Location:* Patna, Bihar 800001');
    expect(message).toContain('*Products:* Dinar Super Wash, Dinar Detergent Cake');
  });

  it('leaves out optional answers the visitor skipped', () => {
    const message = buildDealerWhatsAppMessage(lead, { productNames });
    for (const label of ['Email', 'GSTIN', 'Years in business', 'monthly order', 'Message']) {
      expect(message).not.toContain(label);
    }
  });

  it('includes optional answers when present', () => {
    const message = buildDealerWhatsAppMessage(
      { ...lead, email: 'ravi@example.com', monthlyVolume: '100-500kg', message: 'Patna city' },
      { productNames },
    );
    expect(message).toContain('*Email:* ravi@example.com');
    expect(message).toContain('*Expected monthly order:* 100–500 kg');
    expect(message).toContain('*Message:* Patna city');
  });
});
