/**
 * Loads Cloudflare Turnstile only when asked (first form interaction, rules.md §8) and
 * renders a widget that stays invisible unless Cloudflare needs the visitor to act.
 */
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileOptions {
  sitekey: string;
  appearance: 'always' | 'execute' | 'interaction-only';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileWidget {
  /** Resolves with a fresh token, waiting for the challenge if it hasn't finished yet. */
  getToken(timeoutMs: number): Promise<string>;
  /** Tokens are single-use: call after every submission attempt. */
  reset(): void;
}

let apiPromise: Promise<TurnstileApi> | null = null;

function loadApi(): Promise<TurnstileApi> {
  apiPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.addEventListener('load', () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Turnstile loaded without its API'));
    });
    script.addEventListener('error', () => {
      apiPromise = null; // let the next attempt retry instead of reusing the failure
      script.remove();
      reject(new Error('Turnstile failed to load'));
    });
    document.head.append(script);
  });
  return apiPromise;
}

export async function mountTurnstile(
  container: HTMLElement,
  siteKey: string,
): Promise<TurnstileWidget> {
  const api = await loadApi();
  let token = '';
  let waiting: ((value: string) => void)[] = [];

  const widgetId = api.render(container, {
    sitekey: siteKey,
    appearance: 'interaction-only',
    callback: (value) => {
      token = value;
      for (const resolve of waiting) resolve(value);
      waiting = [];
    },
    'expired-callback': () => {
      token = '';
    },
    'error-callback': () => {
      token = '';
    },
  });

  return {
    getToken: (timeoutMs) =>
      token
        ? Promise.resolve(token)
        : new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Turnstile timed out')), timeoutMs);
            waiting.push((value) => {
              clearTimeout(timer);
              resolve(value);
            });
          }),
    reset: () => {
      token = '';
      api.reset(widgetId);
    },
  };
}
