import QRCode from 'qrcode';

/**
 * A QR code as inline SVG markup, drawn in `currentColor` so the surrounding text colour sets
 * it. Rendered at build time; nothing ships to the browser.
 */
export async function qrCodeSvg(text: string): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#000000', light: '#00000000' },
  });
  return svg.replaceAll('#000000', 'currentColor');
}
