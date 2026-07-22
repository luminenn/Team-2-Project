# CVC Dashboard (Critique, POCR review)

The reviewer dashboard for the CVC@ONE POCR AI review tool: an overview of every ingested course with pipeline progress, plus a full 25-standard rubric report per course. Built standalone so it can be merged into the existing Critique login project.

## Run

```bash
npm install
npm run dev
```

`/` redirects to `/dashboard`. Course data is display-only mock data in `lib/data/courses.ts`, shaped to match the backend's `types/pocr.ts` so swapping in real ingests later is a data-layer change only.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 (CSS-first tokens in `app/globals.css`) · GSAP + @gsap/react · next-themes (dark default) · lucide-react. No framer-motion: the 21st.dev animated grid background was rebuilt with GSAP in `components/ui/animated-grid-pattern.tsx` (wrapped by `components/ui/grid-backdrop.tsx`).

## Merging into the login project

The tokens, fonts, and conventions in this repo intentionally match the Critique design system (see `DESIGN.md`), so merging is mostly copying:

1. Copy `app/dashboard/`, `components/dashboard/`, `components/report/`, `components/ui/` (animated-grid-pattern, grid-backdrop, progress-bar), and `lib/` (types, status, motion, data) into the login project.
2. Append the additions to `app/globals.css`: the four `--status-*` tokens plus `--scrim` (both themes), their `@theme inline` color mappings, and the `shimmer` and `pulse-dot` keyframes with their reduced-motion guards. Everything else already exists there.
3. Keep the login project's `layout.tsx`, theme provider, and theme toggle; delete this repo's copies.
4. Protect the route: add `/dashboard/:path*` to the middleware matcher and the `authorized` callback, and guard the pages with `const session = await auth(); if (!session?.user) redirect("/")`.
