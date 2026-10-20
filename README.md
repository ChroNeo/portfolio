# Portfolio

A personal portfolio site with a paper-themed design, scroll animations, and a
content-driven project showcase. Built with Astro and deployed to GitHub Pages.

**Live:** https://ChroNeo.github.io/portfolio

## Tech Stack

- **Astro** — static site generation and file-based routing
- **Strapi 5** — headless CMS, the source of truth for project content
- **strapi-community-astro-loader** — Strapi content through Astro's Content Layer
- **Tailwind CSS v4** — utility-first styling via the Vite plugin
- **@astrojs/mdx** — Markdown/MDX pages, if any are added as files
- **@astrojs/react** — React islands (e.g. `ThemeToggle.tsx`)
- **GSAP + ScrollTrigger** — entrance and scroll-driven animations
- **TypeScript** — type-safe components and content schema

## Features

- Strapi-backed projects collection (type-safe entries via the Content Layer)
- Dynamic project pages generated from the `projects` collection
- Paper texture theme with hand-drawn rotation effects
- Light / dark mode with system preference detection and persistence
- Auto-generated table of contents for long project pages
- Animated hero and on-scroll reveals, respecting `prefers-reduced-motion`
- Responsive, mobile-first layout

## Project Structure

```text
portfolio/
├── public/                     # Static assets
├── cms/                        # Strapi CMS (content lives here)
├── src/
│   ├── assets/                 # Images processed by Astro
│   ├── components/             # Reusable Astro + React components
│   ├── layouts/BaseLayout.astro
│   ├── lib/
│   │   ├── strapi.ts           # CMS url, media, populate query
│   │   ├── strapiBlocks.ts     # body block types, rich text -> Markdown
│   │   ├── thumbnails.ts       # card thumbnails
│   │   └── techIcons.ts
│   ├── pages/
│   │   ├── index.astro         # Homepage
│   │   └── projects/[project].astro  # Dynamic project pages
│   ├── styles/                 # global.css + project.css
│   └── content.config.ts       # Project collection (Strapi loader)
├── astro.config.mjs
└── package.json
```

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for a deeper walkthrough.

## Getting Started

Requires **Node.js >= 22.12.0**.

The site is built from Strapi, so the CMS has to be running first:

```bash
npm install
npm run cms     # Strapi at http://localhost:1337 (admin at /admin)
npm run dev     # the site, at http://localhost:4321/portfolio
```

`STRAPI_URL` overrides the CMS location (see [`.env.example`](./.env.example)).

## Commands

| Command           | Action                                        |
| :---------------- | :-------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run cms`     | Start the Strapi CMS                          |
| `npm run cms:start` | Build and run the CMS in production mode    |
| `npm run cms:tunnel` | Expose the CMS at cms.chroneo.dev         |
| `npm run dev`     | Start the dev server                          |
| `npm run build`   | Build the production site to `./dist/`        |
| `npm run preview` | Preview the production build locally          |
| `npm run lint`    | Run ESLint (`--max-warnings=0`)               |
| `npm run lint:fix`| Run ESLint with autofix                       |
| `npm run test`    | Run the unit test suite (Vitest)              |
| `npm run test:watch` | Run the tests in watch mode               |

## Testing

Tests run on [Vitest](https://vitest.dev), wired to the Astro pipeline via
`getViteConfig`, and use the [Astro Container
API](https://docs.astro.build/en/reference/container-reference/) to render
components and pages.

Conventions:

- Tests are co-located with the code they test, as `*.test.ts` / `*.test.tsx`.
- Tests assert observable behaviour through public seams — rendered HTML,
  exported functions, the content schema, route params — never implementation
  details such as internal CSS class names.
- Component and page tests read the real `projects` collection, so they double as
  a content contract. **That collection comes from Strapi**, so `npm run test`
  needs the CMS up (`npm run cms`); a build test would otherwise have nothing to
  render.
- Non-page files inside `src/pages/` must be `_`-prefixed, or Astro publishes
  them as routes (the build-output test guards this).
- `ThemeToggle.test.tsx` runs in a DOM environment (`happy-dom`).

## Strapi CMS

Content is authored in the Strapi instance in [`cms/`](./cms). The site reads it
at build time through `strapi-community-astro-loader`; nothing is copied into the
repo, so the CMS is the single source of truth.

```bash
npm run cms            # Strapi at http://localhost:1337 (admin at /admin)
npm run dev            # the site, reading from that CMS
npm run build          # a production build, reading from that CMS
```

### The authoring loop

1. `npm run cms` and edit a project in the admin.
2. Reload `npm run dev` — the Content Layer refetches on change.
3. That's it locally. Deploying means triggering a rebuild (see
   [Deployment](#deployment)): the published site is static HTML, so a CMS edit
   alone does not reach it.

Content model:

- **Project** — `slug`, `title`, `titleEn`, `description`, `date`, `stack`,
  `tags`, `category`, `github`, `demo`, `video`, `thumbnail`, and a `body`
  dynamic zone.
- **Body blocks** — Rich text, Callout, Data table, Image, Gallery, Benchmark,
  Flow diagram, Project glance, Tech badge.
- Always upload pictures through an **Image** or **Gallery** block: images inside
  rich text are dropped with a warning.
- The benchmark chart keeps its data in the component unless the **Benchmark**
  block is filled in.
- The CMS URL is configurable with `STRAPI_URL` (see [`.env.example`](./.env.example)).
  It is also what whitelists the CMS host for Astro's image optimisation.

## Adding a Project

1. Start the CMS (`npm run cms`) and open http://localhost:1337/admin.
2. Create a **Project** entry. The `slug` is the page URL: `/projects/<slug>/`.
3. Fill in the metadata: `title`, `description`, `stack`, `date`, and whichever
   of `titleEn`, `category`, `github`, `demo`, `video`, `tags` apply.
4. Build the body from blocks, and upload a `thumbnail` if the card should have a
   picture.
5. Reload the dev server. The project appears on the homepage automatically and
   gets its own page.

No code change is needed. The schema in `src/content.config.ts` validates every
field on load, so a required field left empty fails the build with a readable
error rather than rendering a broken card.

## Deployment

Astro is static on Vercel; Strapi runs on this PC and is exposed through a
tunnel. That split is deliberate, and it has one consequence worth being clear
about:

- **The live site keeps working while the PC is off.** Every page and image is
  built into `dist/` and served by Vercel, so there is no runtime call to your
  machine.
- **Publishing needs the PC on.** A CMS edit and the rebuild it triggers both
  happen while Strapi is reachable. Edits made offline simply wait.

### 1. Expose Strapi

One tunnel, one stable hostname: `cms.chroneo.dev`. The domain already sits on
Cloudflare, so Cloudflare Tunnel needs no nameserver work — and unlike a quick
tunnel its hostname never changes, which matters because `STRAPI_URL` is baked
into every build.

Install the client once (Windows):

```bash
winget install --id Cloudflare.cloudflared
```

Then, once:

```bash
cloudflared tunnel login                          # opens the browser, pick chroneo.dev
cloudflared tunnel create portfolio-cms           # prints the tunnel UUID
cloudflared tunnel route dns portfolio-cms cms.chroneo.dev
```

Create `%USERPROFILE%\.cloudflared\config.yml` (replace the UUID):

```yaml
tunnel: portfolio-cms
credentials-file: C:\Users\<you>\.cloudflared\<UUID>.json

ingress:
  - hostname: cms.chroneo.dev
    service: http://localhost:1337
  - service: http_status:404
```

Run Strapi in production mode (not watch mode), then the tunnel:

```bash
npm run cms:start     # builds the admin, then strapi start on :1337
npm run cms:tunnel    # cloudflared tunnel run portfolio-cms
```

Now set `PUBLIC_URL=https://cms.chroneo.dev` in `cms/.env` and restart Strapi —
`server.ts` already sets `proxy: true`, so https and absolute admin/media URLs
come out right. Check https://cms.chroneo.dev/admin loads before moving on.

To keep both alive whenever the PC is on, register the two commands as a Task
Scheduler task at logon (`cloudflared service install` also works for the
tunnel), and turn off sleep — a suspended machine drops the tunnel.

### 2. Point Vercel at it

In the Vercel project, set **`STRAPI_URL`** to `https://cms.chroneo.dev` for both
Production and Preview. Without it the build falls back to `localhost:1337` and
fails, because Vercel's build machine cannot see your PC.

### 3. Make edits publish themselves

A static build does not notice CMS edits by itself, so saving a project has to
trigger one.

> **Deploy Hooks, not Webhooks.** Vercel has two similarly named features.
> *Webhooks* (Settings → Webhooks) are account/team events and are gated by plan.
> *Deploy Hooks* (Settings → **Git** → Deploy Hooks) are the ones needed here and
> are available on Hobby, up to 5 per project.

Strapi's own admin Webhooks page is also plan-gated, so the notification comes
from code: `cms/src/api/project/content-types/project/lifecycles.ts` listens for
create, update and delete.

1. Vercel → Settings → **Git** → **Deploy Hooks** → name it `cms-rebuild`, branch
   `master`, copy the URL.
   Or from the CLI, once logged in:
   ```bash
   npx vercel login
   npx vercel link                       # pick the portfolio project
   npx vercel deploy-hooks create cms-rebuild --ref master
   ```
2. Put it in `cms/.env` as `VERCEL_DEPLOY_HOOK=…` and restart Strapi.

Saves are coalesced: the rebuild fires once the edits have been quiet for ~15s,
so writing a page does not queue a dozen deployments. A deploy hook that is down
or unset is logged, never raised into the admin.

Now saving in the admin rebuilds the site in ~30–60s. Pushing to `master` also
triggers a build, which means **a push while the PC is off fails** — the previous
deployment stays live, but the new one won't appear until the PC is on and you
redeploy.

### 4. Protect the admin

`cms.chroneo.dev/admin` sits on the public internet:

- Use a long, unique admin password.
- Better: Cloudflare Zero Trust → **Access → Applications**, add a self-hosted
  app for `cms.chroneo.dev/admin` with an email OTP policy. Leave `/api/*` out of
  it — the public role only needs read access to `project`, and the build has to
  reach the API without a login.
- Keep `cms/.env` out of git (it already is) and never expose the SQLite file.

### Alternative: no public CMS at all

If you would rather not expose Strapi, build on the PC and upload the result:

```bash
npm run build
npx vercel --prod
```

The CMS stays on localhost, Vercel never fetches it, and you get the same
static site — at the cost of deploys only happening from this machine. Turn off
Vercel's automatic Git deploys in that case, or a push will fail the build.

For live-per-request updates instead, switch Astro to `output: 'server'` with
`@astrojs/vercel` — but then the site genuinely does go down with the PC.
