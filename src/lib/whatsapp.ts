/**
 * Chat link to `e164` with `text` prefilled. The api.whatsapp.com endpoint, not wa.me: wa.me
 * redirects there anyway, and some app hand-offs drop the text on the way through.
 * Opens the app on phones, WhatsApp Web or the desktop app on computers.
 */
export function buildWhatsAppUrl(e164: string, text: string): string {
  const params = new URLSearchParams({ phone: e164.replace(/\D/g, ''), text });
  return `https://api.whatsapp.com/send?${params.toString().replaceAll('+', '%20')}`;
}
