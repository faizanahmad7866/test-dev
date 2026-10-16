const MRP_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

/** An MRP as Indian packs print it: 46 → "₹46.00", 1499 → "₹1,499.00". */
export function formatMrp(rupees: number): string {
  return MRP_FORMAT.format(rupees);
}
