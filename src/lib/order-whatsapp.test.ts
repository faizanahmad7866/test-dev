import { describe, expect, it } from 'vitest';
import { buildOrderMessage } from './order-whatsapp';
import { getOrderErrors, orderSchema, type OrderInput } from './schemas/order';

const input: OrderInput = {
  variant: '1kg',
  quantity: '2',
  fullName: '  Sunita   Patil ',
  phone: '+91 98765-43210',
  address: 'Plot 12, Shivaji Nagar',
  city: 'Amravati',
  pincode: '444 707',
  note: '',
};
const pack = { name: 'Dinar Detergent Powder 1 kg', pack: 'Pouch', mrp: 89 };

describe('orderSchema', () => {
  it('cleans a valid order', () => {
    const order = orderSchema.parse(input);
    expect(order).toMatchObject({
      quantity: 2,
      fullName: 'Sunita Patil',
      phone: '9876543210',
      pincode: '444707',
    });
  });

  it('names the field to fix', () => {
    const result = orderSchema.safeParse({ ...input, quantity: '0', phone: '12345', city: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(getOrderErrors(result.error)).sort()).toEqual([
        'city',
        'phone',
        'quantity',
      ]);
    }
  });
});

describe('buildOrderMessage', () => {
  it('sets out the pack, quantity, total and delivery details', () => {
    const message = buildOrderMessage(orderSchema.parse(input), pack);
    expect(message).toContain('*Product:* Dinar Detergent Powder 1 kg (Pouch)');
    expect(message).toContain('*Quantity:* 2');
    expect(message).toContain('*Total at MRP:* ₹178.00');
    expect(message).toContain('*Mobile:* +91 98765 43210');
    expect(message).toContain('*City:* Amravati - 444707');
    expect(message).not.toContain('Note');
  });

  it('adds the note when there is one', () => {
    const message = buildOrderMessage(
      orderSchema.parse({ ...input, note: 'Call before 6 pm' }),
      pack,
    );
    expect(message).toContain('*Note:* Call before 6 pm');
  });
});
