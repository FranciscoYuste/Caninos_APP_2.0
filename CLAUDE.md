# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Public dashboard + admin panel for the futsal team "Bayern D.L.Caninos" (squad, stats, calendar, standings). Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 + Supabase (Auth + Postgres), deployed to Cloudflare Workers via `@opennextjs/cloudflare`. UI text, DB schema, and README are in Spanish — keep new user-facing strings and DB identifiers in Spanish.

## Commands

- `npm run dev` — local dev server (uses `.env.local`)
- `npm run lint` — ESLint (`eslint-config-next/core-web-vitals`)
- `npm run build` — plain Next build (useful as a type check; **not** what gets deployed)
- `npm run build:cloudflare` — the real production build (OpenNext → `.open-next/`)
- `npm run preview` — run the build in the local Workers runtime (uses `.dev.vars`, copy from `.dev.vars.example`)
- `npm run deploy` — deploy with Wrangler (normally Workers Builds deploys on push; Worker name `bayerndeloscaninos` in `wrangler.jsonc`)

- `npm test` — Vitest unit tests (`src/**/*.test.ts`; currently the CSV parsers in `src/lib/imports/`)

## Architecture

**Data flow.** `getTeamData()` in `src/lib/team-data.ts` queries Supabase in parallel (jugadores, partidos, clasificacion, convocatorias, estadisticas), aggregates season totals / per-match stats / callup counts in TypeScript, and is wrapped in React `cache()` so `src/app/equipo/layout.tsx` and each page share one fetch per request. Shared types (`Player`, `MatchItem`, …) live in `src/lib/team-types.ts`. The public site is split into routes under `/equipo` (sections plus shareable detail pages `partido/[id]`, `jugador/[id]`, `katsu/[id]`), rendered inside the client `TeamShell` (header, hero, competition and section navs); section UI lives in `src/components/team/`. Detail routes have `opengraph-image.tsx` files (next/og) for WhatsApp previews; shared OG pieces are in `src/lib/og/` (the crest is embedded as a data URL because Workers can't read `/public`), and the root layout derives `metadataBase` from the request host. The active season, active phase and featured team name live in `src/lib/config.ts` (`ACTIVE_SEASON`, `ACTIVE_PHASE`, `FEATURED_TEAM`, `isFeaturedMatch`); use those instead of literals.

**Supabase clients** (`src/lib/supabase/`):
- `server.ts` — cookie-based SSR client with the publishable key (session/user lookup, public reads).
- `admin.ts` — service-role client; server-only, used in admin routes/pages.
- `client.ts` — browser client.
- `environment.ts` — reads env from `getCloudflareContext().env` first, falling back to `process.env`. Accepts either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. New server code should go through `getSupabaseEnvironment()`, not `process.env` directly.

**Admin authorization pattern.** There is no middleware. Every `src/app/api/admin/*/route.ts` starts with `requireAdmin()` from `src/lib/supabase/require-admin.ts` (session user → `perfiles.rol` via the admin client → must be `"admin"`), which returns either `{ adminClient }` or a 401/403 `{ response }`; use it for new admin endpoints. `src/app/admin/page.tsx` does the same check inline with redirects. Upload routes cap files at 5 MB and validate `fase` with `isCompetitionPhase` from `src/lib/competitions.ts` (the source of truth for phase codes and their file slugs).

**CSV imports.** Admin uploads are parsed in `src/lib/imports/parse-*.ts` (semicolon or comma CSV, UTF-8; team codes like `BAY`, `DAG` map to official names) and then sent to transactional Postgres RPCs — `importar_jornada`, `importar_convocatorias`, `importar_estadisticas_jugadores`, `importar_ficha_jugadores`. Validation and standings recalculation live in those SQL functions. `GET /api/admin/templates?tipo=resultados|convocatoria|estadisticas&fase=&grupo=` generates templates from current DB data. Key import semantics (see README for full CSV specs):
- Results never change date/time/field; the callup (convocatoria) CSV is the only source of confirmed schedule.
- Empty cells preserve previous values; stats import replaces stats only for matches included in the file.
- Stats are only accepted for players marked `convocado` in that match.
- Data is scoped by `temporada` + `fase` + `grupo` on `partidos`; player cards (dorsal, posición) are shared across competitions.

**Database.** Schema lives only in `supabase/migrations/` (applied manually, in order, via the Supabase SQL Editor — no Supabase CLI). Schema changes = a new timestamped migration file (`YYYYMMDDNNNN_description.sql`); RPCs are redefined with `create or replace function` in later migrations, so the latest migration defining a function is authoritative. RLS allows anonymous read of public data; writes go through the service-role client. The README documents each migration — update it when adding one.

**3D pitch.** `player-field.tsx` loads `player-pitch-3d.tsx` (react-three-fiber/drei) via `next/dynamic` with `ssr: false`, with error/ready callbacks so the field can fall back when WebGL fails. Keep three.js imports out of server-rendered modules.

**Landing.** `/` renders `intro-landing.tsx`, an intro video (`public/videos/introEdit.MP4`) with transparent hotspots positioned by percentage in `.intro-hotspot--enter` / `.intro-hotspot--admin` in `src/app/globals.css`.

## Conventions

- Path alias `@/` → `src/`.
- 4-space indentation.
- `SUPABASE_SERVICE_ROLE_KEY` must only be used server-side (Worker secret in production); never expose it via `NEXT_PUBLIC_`.
- Source CSVs in `public/plantillas/<temporada>/<competicion>/`; only the winter league (`campeon_invierno`) has active admin tooling — other phases are placeholders.
