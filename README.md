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

## Adding a Project

1. Create a new `.md` / `.mdx` file in `src/content/projects/`.
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

The project appears on the homepage automatically and gets its own
`/projects/<file-name>/` page.

## Deployment

Pushing to `master` triggers the GitHub Actions workflow in
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml), which installs,
builds, type-checks (`astro check`), lints, and deploys to GitHub Pages.
