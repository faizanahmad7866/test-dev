// No 0/O or 1/I, so a reference can be read out over the phone without confusion.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const SUFFIX_LENGTH = 6;

/** Short, phone-friendly lead reference such as "DL-20261016-7K3F9Q". */
export function createReferenceId(now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  // 256 is a multiple of the 32-character alphabet, so `% length` stays uniform.
  const bytes = crypto.getRandomValues(new Uint8Array(SUFFIX_LENGTH));
  const suffix = Array.from(bytes, (byte) => ALPHABET.charAt(byte % ALPHABET.length)).join('');
  return `DL-${date}-${suffix}`;
}
