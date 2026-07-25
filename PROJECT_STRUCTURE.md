# Portfolio Project Structure & Documentation

## Overview
This is a personal portfolio website built with **Astro**, featuring a paper-themed design with animations and a content-driven project showcase.

## Tech Stack
- **Astro 6.4.6** - Static site generator
- **Tailwind CSS 4.3.1** - Utility-first CSS framework
- **@astrojs/mdx** - MDX support for content
- **GSAP 3.15.0** - Animation library
- **TypeScript** - Type safety

## Project Structure

```
portfolio/
├── public/                 # Static assets (favicon, etc.)
├── src/
│   ├── assets/            # Images and media files
│   ├── components/        # Reusable Astro components
│   │   ├── About.astro
│   │   ├── Callout.astro
│   │   ├── Contact.astro
│   │   ├── Footer.astro
│   │   ├── Hero.astro
│   │   ├── Nav.astro
│   │   ├── Project.astro
│   │   └── TechBadge.astro
│   ├── content/          # Content collections (MDX files)
│   │   └── projects/     # Project markdown files
│   ├── layouts/          # Page layouts
│   │   └── BaseLayout.astro
│   ├── pages/            # File-based routing
│   │   ├── index.astro   # Homepage
│   │   └── projects/
│   │       └── [slug].astro  # Dynamic project pages
│   └── styles/
│       └── global.css    # Global styles
├── astro.config.mjs      # Astro configuration
├── content.config.ts     # Content collection schema
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

## How It Works

### 1. Configuration
**astro.config.mjs** sets up:
- MDX integration for markdown content
- Tailwind CSS via Vite plugin

**content.config.ts** defines:
- Project collection schema with validation
- Fields: title, description, stack, github, demo, video, thumbnail, date, tags
- Loads all `.md` and `.mdx` files from `src/content/projects`

### 2. Routing System
Astro uses file-based routing:
- **`src/pages/index.astro`** → `/` (homepage)
- **`src/pages/projects/[slug].astro`** → `/projects/:slug` (dynamic project pages)

### 3. Homepage Flow
**`src/pages/index.astro`**:
1. Imports `BaseLayout` and all section components
2. Renders components in order: Nav → Hero → About → Project → Contact
3. Uses `BaseLayout` wrapper for HTML structure and global styles

### 4. Layout System
**`src/layouts/BaseLayout.astro`**:
- Provides HTML skeleton with `<head>` and `<body>`
- Imports global CSS
- Accepts `title` prop for page titles
- Uses `<slot />` for child content injection
- Sets paper-themed background color (#f5f0e1)
- Loads Google Fonts (Caveat, Special Elite)

### 5. Component Architecture

#### Nav.astro
- Navigation bar with links to sections (Home, Projects, Contact)
- Uses anchor links with smooth scrolling
- Styled with hover effects (border, shadow, translate)

#### Hero.astro
- Landing section with animated title and subtitle
- Uses **GSAP** for entrance animations:
  - Title fades in with y-axis movement
  - Image fades in with y-axis movement
  - Subtitle fades in with slight delay
- Paper-themed styling with rotation effect

#### Project.astro
- Fetches all projects from content collection
- Displays project cards in a grid (1 col mobile, 3 col desktop)
- Each card shows:
  - Thumbnail image
  - Title (Caveat font)
  - Description
  - Tech stack
  - Link to detailed page
- Applies varied rotation styles for visual interest
- Links to `/projects/{project.id}`

#### About.astro, Contact.astro, Footer.astro
- Additional sections for portfolio content
- Follow same paper-themed design system

#### Callout.astro & TechBadge.astro
- Reusable components for MDX content
- Used within project markdown files

### 6. Dynamic Project Pages
**`src/pages/projects/[slug].astro`**:
- Uses `getStaticPaths()` to generate routes for all projects
- Sorts projects by date (newest first)
- Renders individual project page with:
  - Back link to homepage
  - Project title and description
  - Thumbnail image
  - Tech stack
  - Demo and GitHub links
  - MDX content body
- Uses `render()` from `astro:content` to render MDX

### 7. Content Management
Projects are stored as MDX files in `src/content/projects/`:
- **Frontmatter** contains project metadata (validated by schema)
- **Body** contains detailed content in markdown
- Can import and use components (Callout, TechBadge)
- Example: `test.mdx` demonstrates the structure

### 8. Styling System
**Tailwind CSS** with custom design:
- Paper-themed color palette (amber, stone, zinc)
- Custom CSS variables for ink colors
- Utility classes for layout, spacing, typography
- Special effects: rotation, shadows, borders for paper look
- Responsive grid system

**global.css**:
- Custom CSS variables
- Global styles
- Paper texture background

### 9. Animation System
**GSAP** integration:
- Hero section entrance animations
- Timeline-based sequencing
- Easing functions for smooth motion
- Opacity and transform animations

## Development Workflow

### Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server at localhost:4321
npm run build        # Build for production to ./dist/
npm run preview      # Preview production build
```

### Adding a New Project
1. Create new MDX file in `src/content/projects/`
2. Add frontmatter with required fields
3. Write project content in markdown
4. Add thumbnail image to `src/assets/images/projects/`
5. Project automatically appears on homepage and gets its own page

### Modifying Design
- Global styles: `src/styles/global.css`
- Component styles: Edit individual `.astro` files
- Tailwind config: Uses default with custom CSS variables

## Key Features
- **Static Site Generation**: Fast, SEO-friendly output
- **Content Collections**: Type-safe content management
- **MDX Support**: Rich content with component embedding
- **File-based Routing**: Simple, intuitive routing
- **Responsive Design**: Mobile-first approach
- **Paper Theme**: Unique visual identity with rotation effects
- **Animations**: GSAP-powered smooth transitions
- **TypeScript**: Type safety throughout

## Build Output
- Production builds go to `dist/` directory
- Static HTML, CSS, and JavaScript
- Optimized images and assets
- Ready for deployment to any static host
