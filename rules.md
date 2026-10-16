# Engineering Rules — Dinar Website

Mandatory for every contributor, human or AI agent. If a rule blocks you, say so in the PR; don't silently break it.
Product requirements live in `docs/PRD.md`. This file defines **how** we build.

---

## 0. Principles

1. **Read before you write.** Open the files you'll touch and the components they use. Reuse before you create.
2. **Smallest correct change.** No drive-by refactors. Delete what your change makes unused.
3. **Static first.** If it can be decided at build time, it is. Client JS only for real interaction.
4. **Data drives UI.** Copy, contact details, products, nav live in `src/config/` or `src/content/`, never in markup.
5. **Mobile first.** Build at 360 px, then scale up.
6. **Build for the PRD, not hypotheticals.** Don't abstract until the third real use. No helpers used once.

---

## 1. Toolchain

| Tool | Version | Notes |
|---|---|---|
| Node | 24 LTS | pinned in `.nvmrc` |
| pnpm | 12.x | `packageManager` field; approve `sharp` + `esbuild` builds via `pnpm approve-builds` |
| Astro | 7.x | static output |
| TypeScript | 6.0.x | `astro/tsconfigs/strictest`. Not 7 — `typescript-eslint` and `@astrojs/check` don't support it yet |
| Tailwind CSS | 4.x | `@tailwindcss/vite`, tokens in `@theme`, no `tailwind.config.js` |
| Zod | 4.x | shared schemas, same major as Astro's `astro/zod` |
| Vitest | 5.x | unit tests |
| ESLint | 10.x, flat config | `eslint-plugin-astro`, `typescript-eslint`, `eslint-plugin-jsx-a11y-x` (original plugin doesn't support ESLint 10) |
| Prettier | 3.x | `prettier-plugin-astro`, `prettier-plugin-tailwindcss` |

```bash
pnpm dev        # local server
pnpm lint       # eslint
pnpm format     # prettier --write
pnpm check      # astro check
pnpm test       # vitest run
pnpm build      # production build
pnpm preview    # serve dist/ locally
```

Path alias `@/*` → `src/*` inside `src/`. Exception: `functions/` imports shared code by relative path (`../../src/lib/schemas/…`) — the Pages Functions bundle doesn't reliably resolve the alias.

---

## 2. Where things go

| I need to… | Put it in |
|---|---|
| Add a page | `src/pages/` — composes sections only |
| Change `<head>`, header, footer wrapper | `src/layouts/BaseLayout.astro` — every page uses it |
| Change meta tags, OG, canonical, JSON-LD output | `src/components/seo/Seo.astro` |
| Add a section used on one page | `src/sections/<page>/` |
| Add a component used on 2+ pages | `src/components/<group>/`; primitives in `src/components/ui/` |
| Change phone, email, socials, legal links | `src/config/site.ts` |
| Change nav | `src/config/navigation.ts` |
| Add / edit a product | `src/content/products/<slug>.json` + `src/assets/products/<slug>/` |
| Change the product schema | `src/content.config.ts` |
| Add a static list (states, business types) | `src/data/` |
| Add a form rule | `src/lib/schemas/` — shared by browser and `functions/` |
| Add a browser interaction | `src/scripts/<feature>.ts` |
| Add a server endpoint | `functions/api/<name>.ts`, helpers in `functions/_lib/` |
| Change the leads table | new file in `migrations/` (`wrangler d1 migrations create`) — never edit an applied one |
| Add a design token | `src/styles/global.css` inside `@theme` |
| Add favicon, OG fallback, headers, redirects | `public/` (`_headers`, `_redirects`) |
| Add a test | next to the module: `<name>.test.ts` |

New top-level folder? Discuss first.

---

## 3. Naming

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase file | `SizeSwitcher.astro` |
| Sections | PascalCase + `Section` | `HeroSection.astro` |
| TS modules | kebab-case | `form-controller.ts` |
| Functions | camelCase, verb first | `formatPhone()` |
| Booleans | `is/has/should/can` | `isMenuOpen` |
| Module constants | SCREAMING_SNAKE | `MAX_MESSAGE_LENGTH` |
| Types | PascalCase, no `I` prefix | `ProductVariant` |
| Slugs / URLs | kebab-case | `dinar-super-wash` |
| JS hooks in markup | `data-js="<name>"` | `data-js="size-switcher"` |

---

## 4. Code

**Astro components**
- One per file, typed `Props` interface at the top, one-line JSDoc on its responsibility.
- Over ~150 lines usually means two jobs — split by responsibility.
- Semantic HTML first (`<button>`, `<a>`, `<details>`, `<dialog>`, `<fieldset>`). A `<div>` with a click handler is a bug.
- No `client:*` directives — no UI framework. Interaction goes in `src/scripts/`.

**TypeScript**
- No `any`, no non-null `!`. Use `unknown` + narrowing at boundaries; prefer `instanceof` checks over `as` casts.
- `import type` for types. Derive types from schemas: `type DealerLead = z.infer<typeof dealerLeadSchema>`.
- No enums — `as const` objects or string unions. Early returns over nested `if`.

**Client scripts**
- Progressive enhancement: content and links work with JS off.
- One module per feature, exporting an `init` that finds its root by `data-js` and returns early if absent.
- Select by `data-js`, never by styling classes. Delegate events on the component root.
- Use the platform (`<dialog>`, IntersectionObserver, `URLSearchParams`, `fetch` + `AbortController`) before a library.

**Comments** explain **why**, never what. No commented-out code. `TODO(owner): …` only.

---

## 5. Styling

- **Tokens only.** Arbitrary values (`text-[13px]`, `bg-[#123456]`) are rejected — add a token instead.
- Mobile-first: unprefixed = mobile, then `sm:` `md:` `lg:` `xl:`. Class order is enforced by Prettier.
- Repeated class groups → a component, not `@apply`.
- No `!important`; inline `style` only for data-driven values.
- Every animation has a `motion-reduce:` counterpart. Full-height sections use `svh`/`dvh`, never `100vh`.
- Every state is designed: hover, focus, active, disabled, loading, error, empty, success.

---

## 6. Content, images, SEO

- Contact details come from `site.ts` everywhere. Changing the phone number = one line.
- Product claims must match the client-approved list in `docs/PRD.md`. No new claims without written approval.
- Adding a product: images → JSON entry (schema rejects missing fields) → `pnpm check && pnpm build`. Page, sitemap and JSON-LD are generated.
- Raster images via `astro:assets` `<Image>`/`<Picture>` from `src/assets/`, never `public/` (except favicon, OG fallback). Always `alt`, dimensions and `sizes`.
- LCP image: `loading="eager"` + `fetchpriority="high"`. Everything else lazy.
- Video: `muted playsinline loop preload="none"` with `poster`; skipped on `prefers-reduced-motion`.
- Maps and social embeds load behind a click facade.
- Every page: unique title (≤ 60) and description (≤ 155) via `Seo`, canonical URL, 1200×630 OG image, exactly one `<h1>`, JSON-LD per PRD.
- Required pages beyond the PRD's list: `404.astro`, and a privacy policy (we collect names, phones and emails — DPDP Act 2023). The privacy page must exist before any form goes live; its text comes from the client, not us.

---

## 7. Accessibility

- Keyboard reachable with a visible `:focus-visible` ring. ARIA only where HTML can't express it.
- Tap targets ≥ 44 px. Contrast AA, checked on tokens.
- Inputs have a `<label>`; errors linked via `aria-describedby`; dynamic messages in an `aria-live` region.
- Works at 200 % zoom and 320 px width without horizontal scroll.

---

## 8. Forms & API

- **One Zod schema per form** in `src/lib/schemas/`, used by both the browser and the Function.
- Normalise before validating: trim, collapse spaces, strip `+91`, uppercase GSTIN.
- Function order is fixed: method → content-type → size cap → honeypot → Turnstile → schema → **store** → deliver → respond.
- Turnstile script loads on first form interaction, not on page load.
- **Store:** every valid lead is written to Cloudflare D1 (binding `DB`) with its `referenceId` before any email is sent. Email can fail; the lead must not.
- **Delivery:** email via the Resend HTTP API (`RESEND_API_KEY`). Escape every user value before it enters the template.
- Respond success only once the lead is stored. Store fails → error with `referenceId`. Stored but email fails → success to the user, log `referenceId` so the team follows up from D1.
- Every outbound call has `AbortSignal.timeout(8000)`.
- Never log request bodies. Log `referenceId`, status, duration.

---

## 9. Security

- Secrets only in Cloudflare env vars. `.env` is gitignored; `.env.example` lists keys with empty values.
- CSP lives in `public/_headers`. A new third-party origin updates CSP in the same PR.
- Analytics: Cloudflare Web Analytics only (cookieless, no consent banner). CSP allows `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (connect). No other trackers without client approval.
- No inline event handlers, no `innerHTML` with non-constant strings.
- `target="_blank"` links get `rel="noopener noreferrer"`.
- `pnpm audit --prod` clean of high/critical before release.

---

## 10. Testing

- Vitest covers everything with logic: Zod schemas, normalisers, and each step of the Function order in §8 (rejects bad method, honeypot hit, failed Turnstile, invalid body; errors when the D1 write fails; still succeeds when only email fails).
- Mock `fetch` for Turnstile and Resend, and stub the `DB` binding — tests never hit the network.
- A bug fix comes with a test that fails without it.
- Visual and layout checks are manual: 360, 390, 768, 1366, 1920 px.

---

## 11. CI & performance

`.github/workflows/ci.yml` runs on every PR and on push to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm check && pnpm test && pnpm build`
3. Lighthouse CI on the built site (`lighthouserc.json`)

Lighthouse uses `numberOfRuns: 3` with `aggregationMethod: "median"` so one noisy run doesn't fail a PR. Mobile budget: performance ≥ 95, accessibility / best practices / SEO = 100. Below budget → no merge.

- No render-blocking third-party scripts.
- Fonts self-hosted, subset, max 4 files, preload only the hero weight.
- Any new JS chunk > 5 KB gz needs a reason in the PR, as does any new dependency.

---

## 12. Git & deploys

- `main` = production. Protected; merge via PR only, squash-merge.
- Branches: `feat/<scope>-<desc>`, `fix/…`, `chore/…`, `docs/…`, `perf/…`.
- Every PR gets a Cloudflare preview URL — review on it, on a real phone, before merging. Merging to `main` deploys.
- Commits follow Conventional Commits: `<type>(<scope>): <imperative summary ≤ 72 chars>`.
  Types: `feat` `fix` `perf` `refactor` `style` `docs` `chore` `test` `ci` `build`.
- One logical change per commit. Keep PRs reviewable (~400 changed lines, excluding assets and lockfile).
- Stage intentionally — check `git status`, never `git add .` blindly.

---

## 13. Definition of done

- [ ] Matches the PRD section it implements (linked in the PR)
- [ ] CI green: lint, check, test, build, Lighthouse
- [ ] Checked on the preview URL at the §10 widths
- [ ] SEO (§6) and accessibility (§7) checks pass for touched pages
- [ ] No console errors or warnings

---

## 14. For AI coding agents

Same rules as humans, plus:

1. Read the relevant `docs/PRD.md` section and every file you'll modify before writing code.
2. Follow existing repo patterns over your own defaults. New library, folder or pattern → state why.
3. Never invent content: no lorem ipsum, fake stats, testimonials or claims. Missing data → `TODO(client): …`, listed in your response.
4. Output only what changed, and end with the branch, `git add <files>` and commit commands for it.
