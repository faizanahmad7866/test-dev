/**
 * Choice lists for the dealer enquiry form. Values are stored in D1, so rename a label
 * freely but treat a value as permanent once leads exist.
 */
export const BUSINESS_TYPES = [
  { value: 'retailer', label: 'Retailer', description: 'Kirana or general store' },
  { value: 'wholesaler', label: 'Wholesaler', description: 'Supplies local retailers' },
  { value: 'distributor', label: 'Distributor', description: 'Covers a town or district' },
  { value: 'super-stockist', label: 'Super stockist', description: 'Supplies distributors' },
  { value: 'modern-trade', label: 'Supermarket', description: 'Modern trade or chain' },
  { value: 'other', label: 'Other', description: 'Tell us in the message' },
] as const;

export const YEARS_IN_BUSINESS = [
  { value: 'starting', label: 'Just starting' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-10', label: '3–10 years' },
  { value: '10-plus', label: 'More than 10 years' },
] as const;

export const MONTHLY_VOLUMES = [
  { value: 'up-to-100kg', label: 'Up to 100 kg' },
  { value: '100-500kg', label: '100–500 kg' },
  { value: '500kg-1t', label: '500 kg – 1 tonne' },
  { value: 'over-1t', label: 'More than 1 tonne' },
  { value: 'not-sure', label: 'Not sure yet' },
] as const;
