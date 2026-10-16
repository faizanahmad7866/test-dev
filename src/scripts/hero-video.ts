/**
 * Plays the muted hero loop only when it should (rules.md §11): never for reduced-motion
 * users or on Data Saver / 2G, and only while it is on screen, to spare battery and data.
 * Without JS — or when playback is skipped or refused — nothing downloads and the poster stays.
 */
const ROOT = '[data-js="hero-video"]';
const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);
const VISIBLE_THRESHOLD = 0.25;

/** Network Information API is Chromium-only, so every field is checked before use. */
function isConstrainedConnection(): boolean {
  if (!('connection' in navigator)) return false;
  const { connection } = navigator;
  if (typeof connection !== 'object' || connection === null) return false;
  if ('saveData' in connection && connection.saveData === true) return true;
  return (
    'effectiveType' in connection &&
    typeof connection.effectiveType === 'string' &&
    SLOW_CONNECTIONS.has(connection.effectiveType)
  );
}

export function initHeroVideo(): void {
  const video = document.querySelector<HTMLVideoElement>(ROOT);
  if (!video) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || isConstrainedConnection()) return;

  // Reveal the video only once real frames are painting, so the poster never flashes to black.
  video.addEventListener('playing', () => video.setAttribute('data-playing', ''), { once: true });

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting) {
        // Refused autoplay (e.g. iOS Low Power Mode) is fine: the poster simply stays.
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    },
    { threshold: VISIBLE_THRESHOLD },
  );
  observer.observe(video);
}
