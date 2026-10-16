# Portfolio

A personal portfolio site with a paper-themed design, scroll animations, and a
content-driven project showcase. Built with Astro and deployed to GitHub Pages.

**Live:** https://ChroNeo.github.io/portfolio

## Tech Stack

- **Astro** — static site generation and file-based routing
- **Tailwind CSS v4** — utility-first styling via the Vite plugin
- **@astrojs/mdx** — rich project content with embedded components
- **@astrojs/react** — React islands (e.g. `ThemeToggle.tsx`)
- **GSAP + ScrollTrigger** — entrance and scroll-driven animations
- **TypeScript** — type-safe components and content schema

## Features

- Content collections for projects (type-safe MDX frontmatter)
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
├── src/
│   ├── assets/                 # Images processed by Astro
│   ├── components/             # Reusable Astro + React components
│   ├── content/projects/       # Project MDX files
│   ├── layouts/BaseLayout.astro
│   ├── lib/techIcons.ts
│   ├── pages/
│   │   ├── index.astro         # Homepage
│   │   └── projects/[project].astro  # Dynamic project pages
│   ├── styles/                 # global.css + project.css
│   └── content.config.ts       # Project collection schema
├── astro.config.mjs
└── package.json
```

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for a deeper walkthrough.

## Getting Started

Requires **Node.js >= 22.12.0**.

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:4321/portfolio.

## Commands

| Command           | Action                                        |
| :---------------- | :-------------------------------------------- |
| `npm install`     | Install dependencies                          |
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
- Component and page tests run against the real content collections, so they
  double as a content contract.
- Non-page files inside `src/pages/` must be `_`-prefixed, or Astro publishes
  them as routes (the build-output test guards this).
- `ThemeToggle.test.tsx` runs in a DOM environment (`happy-dom`).

## Strapi CMS

Project metadata (title, description, stack, links, dates, …) can be managed in
the Strapi instance that lives in [`cms/`](./cms). The MDX files stay the source
of the project body, images and embedded components; Strapi only overrides the
frontmatter fields. Entries are matched to MDX files by `slug`, which must equal
the MDX file name.

```bash
npm run cms    # starts Strapi at http://localhost:1337 (admin at /admin)
npm run dev    # in a second terminal, starts the site
```

- **First run:** create an admin user at http://localhost:1337/admin. The CMS
  seeds itself with the existing projects and enables public read access.
- **Fallback:** if Strapi is unreachable the site falls back to the MDX
  frontmatter, so builds, tests and CI work without a CMS running.
- **Freshness:** the content layer runs at start-up, so restart `npm run dev`
  after editing content in Strapi to see the change.
- **Empty fields don't override:** leave a field blank in Strapi to keep the
  value from the MDX frontmatter.

The CMS URL is configurable with `STRAPI_URL` (see [`.env.example`](./.env.example)).

## Adding a Project

1. Create a new `.md` / `.mdx` file in `src/content/projects/`. The file name is
   the project **slug**, and is what links the file to its Strapi entry.
2. Add frontmatter validated by the schema in `src/content.config.ts`:

   | Field         | Required | Notes                          |
   | :------------ | :------- | :----------------------------- |
   | `title`       | yes      | Project title                  |
   | `description` | yes      | Short summary                  |
   | `stack`       | yes      | Array of technology names      |
   | `date`        | yes      | Used for sorting (newest first)|
   | `titleEn`     | no       | English title, if different    |
   | `category`    | no       | Badge label (e.g. "Web App")   |
   | `github`      | no       | Repository URL                 |
   | `demo`        | no       | Live demo URL                  |
   | `video`       | no       | Demo video URL                 |
   | `thumbnail`   | no       | Image import for the card      |
   | `tags`        | no       | Defaults to `[]`               |

3. Write the body in Markdown. You can import components such as `Callout` and
   `TechBadge`.
4. Add the thumbnail image under `src/assets/images/projects/`, if used.
5. Optionally create an entry in Strapi (`npm run cms`) with the **same slug** to
   manage the metadata from the CMS. The frontmatter above stays as the fallback
   for any field left blank in Strapi.

The project appears on the homepage automatically and gets its own
`/projects/<file-name>/` page.

## Deployment

Pushing to `master` triggers the GitHub Actions workflow in
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml), which installs,
builds, type-checks (`astro check`), lints, and deploys to GitHub Pages.
