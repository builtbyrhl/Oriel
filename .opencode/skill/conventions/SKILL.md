---
name: conventions
description: Project conventions and development workflow for Oriel. Use when committing, pushing, reviewing code, or deciding where to put a file. Trigger words: commit, push, deploy, convention, structure, file location, eslint, typescript.
---

# Oriel Conventions

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS v4 (CSS variables, `@apply` discouraged)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Player**: iframe + custom branded controls
- **API**: TMDB v3 REST API
- **Hosting**: Vercel (main branch auto-deploys)

## File Structure

```
app/ui/
  app/
    page.tsx                  ← home page (hero only)
    browse/page.tsx           ← catalogue + hero
    movie/[id]/page.tsx      ← movie detail
    tv/[id]/page.tsx         ← TV series detail
    person/[id]/page.tsx     ← actor detail
    collection/page.tsx       ← collection view
    api/tmdb/
      trending/route.ts       ← /api/tmdb/trending
      popular/route.ts       ← /api/tmdb/popular
      top-rated/route.ts      ← /api/tmdb/top-rated
      search/route.ts         ← /api/tmdb/search
  components/
    browse/                   ← BrowseClient, MovieRow, BrowseHero
    movie/                    ← PlaybackPlayer, WatchButton, TrailerModal, etc.
    player/                   ← VideoPlayer, PlayerOverlay, LoadingOverlay
    continue-watching/        ← ContinueWatchingRow, ContinueWatchingTracker
    ui/                       ← Shared UI primitives
  lib/
    streaming/
      providers.ts            ← STREAM_PROVIDERS[] + helpers
      manager.ts              ← getStream()
      types.ts                ← StreamingProvider, StreamSource types
    playback/
      providers.ts            ← PlaybackProvider[] (reads from streaming)
      types.ts
    continueWatching.ts       ← localStorage read/write
    movies.ts
    tmdb.ts
    watchlist.ts
  hooks/
    usePlayback.ts             ← currentTime, seek, progress state
    useContinueWatching.ts
  .env.local                  ← TMDB_API_KEY, etc.
```

## Workflow Rules

### Branch Strategy

- `main` — production, always deployable
- Side branches: `oriel/<feature-name>` — for work-in-progress
- Never push experimental changes directly to `main`

### Before Pushing

1. Run `npm run lint` — lint must pass
2. Run `npx tsc --noEmit` — TypeScript must compile clean
3. Check the diff with `git diff`
4. Commit with a clear message: `feat: ...`, `fix: ...`, `chore: ...`

### Commit Message Format

```
type(scope): short description

Types: feat, fix, chore, refactor, style, docs, test, perf
Scope: the area changed (streaming, browse, player, etc.)
```

### Pushing

```bash
git add <files>
git commit -m "feat(streaming): add vidsrc.new mirror"
git push
```

### Testing New Changes

1. Push to a side branch: `git checkout -b oriel/my-feature && git push -u origin`
2. Wait for Vercel preview build
3. Check the preview URL
4. If good → merge to `main`
5. If bad → keep iterating on the side branch

### Merging to Main

```bash
git checkout main
git pull
git merge oriel/my-feature --no-edit
git push
```

## Code Style

### TypeScript

- No `any` — use `unknown` + type assertion or proper interfaces
- Prefer `type` over `interface` for simple shapes
- Use explicit return types on exported functions
- No non-null assertion (`!`) unless provably safe

### React

- `"use client"` on all components that use hooks, browser APIs, or event handlers
- Keep server components as thin as possible — push interactivity to client components
- Use `useMemo` for expensive computations, `useCallback` for stable references
- Clean up effects: always return a cleanup function from `useEffect`

### Tailwind

- Use `gap-3` not `gap-y-3 gap-x-3` (combined shorthand)
- Use `space-y-14` for vertical spacing between rows
- Reserve `rounded-[24px]` for cards only
- Always use `overflow-hidden` before `rounded-*`
- Use `scrollbar-hide` on all horizontal scroll rows

### Imports

```tsx
// Group 1: React
import { useState, useEffect } from "react";

// Group 2: Next.js
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Group 3: Libraries
import { motion } from "framer-motion";
import { Play, ArrowRight } from "lucide-react";

// Group 4: Internal — @ alias for app/ui
import MovieRow from "@/components/movies/MovieRow";
import { getStream } from "@/lib/streaming/manager";

// Group 5: Types
import type { Movie } from "@/components/movies/MovieCard";
```

### Lint Commands

```bash
npm run lint -- <file>    # lint a specific file
npm run lint               # lint entire project
npx tsc --noEmit          # typecheck entire project
npm run build              # full production build
npm run dev               # dev server
```

## Environment Variables

```
NEXT_PUBLIC_TMDB_API_KEY=...     # TMDB API key (safe for client)
NEXT_PUBLIC_ORIEL_PLAYER_URL=... # Self-hosted player origin (no trailing slash)
```

## Vercel

- Project auto-deploys from `main` on every push
- Each side branch gets its own preview URL
- To set env vars: Vercel Dashboard → Project → Settings → Environment Variables
