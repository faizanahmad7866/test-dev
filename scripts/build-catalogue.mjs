// Prints the built /catalogue/ page to the downloadable PDF with headless Chrome, which
// shapes Hindi correctly and honours the A4 @page rules. Run via `pnpm catalogue` (it builds
// first). Needs Chrome or Chromium: set CHROME_PATH if it is not `google-chrome` on PATH.
import { spawn } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { CATALOGUE_PDF, CATALOGUE_STAMP, catalogueSourceHash } from './catalogue-source.mjs';

const PREVIEW_PORT = 4399;
const DEBUG_PORT = 9399;
const CHROME = process.env.CHROME_PATH ?? 'google-chrome';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Not up yet.
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

// The built site, served from dist/ in-process, so nothing outlives the script.
const CONTENT_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = join('dist', path.endsWith('/') ? `${path}index.html` : path);
  if (!file.startsWith('dist') || !existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
  });
  response.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(PREVIEW_PORT, '127.0.0.1', resolve));
const profile = mkdtempSync(join(tmpdir(), 'dinar-catalogue-'));
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

try {
  await waitFor(`http://127.0.0.1:${PREVIEW_PORT}/catalogue/`);
  const targets = await (await waitFor(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
  const socket = new WebSocket(targets.find(({ type }) => type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve));

  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, (message) =>
        message.error ? reject(new Error(message.error.message)) : resolve(message.result),
      );
      socket.send(JSON.stringify({ id: messageId, method, params }));
    });

  await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  await send('Page.navigate', { url: `http://127.0.0.1:${PREVIEW_PORT}/catalogue/` });
  await wait(1500);
  // Every font and image must be in before printing, or the PDF ships with gaps. Images are
  // lazy by default and would never load off screen, so they are switched to eager first.
  const { result } = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const images = [...document.images];
      for (const img of images) img.loading = 'eager';
      const settle = (img) => img.complete ? Promise.resolve() : new Promise((done) => {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
      const timeout = new Promise((done) => setTimeout(done, 30000));
      await Promise.race([Promise.all([document.fonts.ready, ...images.map(settle)]), timeout]);
      return images.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.currentSrc || img.src);
    })()`,
  });
  if (result.value.length > 0) throw new Error(`Images failed to load: ${result.value.join(', ')}`);

  const { data } = await send('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    generateTaggedPDF: true,
  });
  mkdirSync(dirname(CATALOGUE_PDF), { recursive: true });
  writeFileSync(CATALOGUE_PDF, Buffer.from(data, 'base64'));
  writeFileSync(
    CATALOGUE_STAMP,
    `${JSON.stringify({ sourceHash: catalogueSourceHash(), printedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  // The site was built before the PDF existed: copy it into the build so this deploy has it too.
  const distPdf = CATALOGUE_PDF.replace(/^public\//, 'dist/');
  mkdirSync(dirname(distPdf), { recursive: true });
  copyFileSync(CATALOGUE_PDF, distPdf);
  // Ask Chrome to quit cleanly, so its helper processes exit with it.
  await send('Browser.close').catch(() => {});
  socket.close();
  console.log(`Catalogue printed to ${CATALOGUE_PDF}`);
} finally {
  // Wait for Chrome to exit before removing its profile, or it is still writing into it.
  const chromeExited =
    chrome.exitCode === null ? new Promise((resolve) => chrome.once('exit', resolve)) : null;
  chrome.kill();
  server.close();
  await chromeExited;
  // Best effort: a stray helper may still hold a file, and the OS clears tmp anyway.
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    console.warn(`Could not remove the temporary Chrome profile at ${profile}`);
  }
}
