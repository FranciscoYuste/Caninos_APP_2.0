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

**Competitions.** The `competiciones` table (temporada, fase, grupo, nombre, slug, orden, estado `pendiente|en_curso|finalizada`) defines what exists; `src/lib/competition-data.ts` reads it (`getCompetitions`, `getActiveCompetition` = first `en_curso`, falling back to a hard-coded winter league if the table is missing). Public routes: `/[temporada]/[competicion]` (+ `/jugadores`, `/convocatorias`, `/estadisticas`, `/katsu`, `/lesionados`; paths built with `competitionPath()` in `src/lib/competition-paths.ts`), global detail pages `/partido/[id]`, `/jugador/[id]`, `/katsu/[id]` (with `opengraph-image.tsx` and `/partido/[id]/calendario` .ics), and `/equipo/[[...ruta]]`, which redirects to the active competition (used by the intro page and the PWA `start_url`). A pending competition shows a placeholder instead of its sections. `equipos` holds rival team codes/names.

**Data flow.** `getTeamData(season, phase, group)` in `src/lib/team-data.ts` queries Supabase in parallel (jugadores, partidos, clasificacion, convocatorias, estadisticas) for one competition, aggregates totals / per-match stats / callup counts in TypeScript, and is wrapped in React `cache()` so the layout and page of a request share one fetch. The squad is active players plus anyone called up in that competition (so archived seasons keep departed players). `CompetitionFrame` (server) loads a competition and renders the client `TeamShell` (header, hero, competition/season selectors, section nav); detail pages wrap themselves in it, finding their competition via `src/lib/match-lookup.ts` / `player-lookup.ts`. Shared types live in `src/lib/team-types.ts`; section UI in `src/components/team/`. Shared OG pieces are in `src/lib/og/` (the crest is embedded as a data URL because Workers can't read `/public`), and the root layout derives `metadataBase` from the request host. `FEATURED_TEAM`/`isFeaturedMatch` live in `src/lib/config.ts`; nothing else about seasons is hard-coded.

**Admin and competitions.** `/admin?competicion=<id>` selects which competition is managed (default: first `en_curso`); every admin form posts `competicion_id` and import routes load it with `loadAdminCompetition()` from `src/lib/admin-competition.ts`, check the file's season with `assertSeason()`, and pass `loadImportContext()` (season + team codes from `equipos`) to the parsers. Per-match admin endpoints (KATSU, chronicle, callup form, media) accept any featured match belonging to a registered competition (`isManagedMatch`). `/api/admin/competitions` and `/api/admin/teams` manage those tables; changing a competition's season/phase/group or deleting it is refused once it has matches, and teams with matches can't be deleted (matches store team names as text).

**Supabase clients** (`src/lib/supabase/`):
- `server.ts` — cookie-based SSR client with the publishable key (session/user lookup, public reads).
- `admin.ts` — service-role client; server-only, used in admin routes/pages.
- `client.ts` — browser client.
- `environment.ts` — reads env from `getCloudflareContext().env` first, falling back to `process.env`. Accepts either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. New server code should go through `getSupabaseEnvironment()`, not `process.env` directly.

**Admin authorization pattern.** There is no middleware. Every `src/app/api/admin/*/route.ts` starts with `requireAdmin()` from `src/lib/supabase/require-admin.ts` (session user → `perfiles.rol` via the admin client → must be `"admin"`), which returns either `{ adminClient }` or a 401/403 `{ response }`; use it for new admin endpoints. `src/app/admin/page.tsx` does the same check inline with redirects. Upload routes cap files at 5 MB. Phase codes live in `src/lib/competitions.ts` (`COMPETITION_PHASES`, `PHASE_LABELS`) and must match the `fase` check constraints in SQL.

**Admin forms and media.** `admin-panel.tsx` is organised by match: `admin-match-hub.tsx` picks one featured match and shows its steps (callup form, result, per-player stats with +/− steppers, KATSU, chronicle, callup photo); `AdminRoundResults` edits every match of a round (rivals included, for standings); `admin-roster-manager.tsx` edits name/dorsal/position of all active players in one save and handles alta/baja/recuperar/eliminar. Forms reuse the CSV RPCs with a single match (`/api/admin/callup-form` → `importar_convocatorias`, `/api/admin/match-stats` → `importar_estadisticas_jugadores`, `/api/admin/roster` → `importar_ficha_jugadores`); results use `guardar_resultados` (both goals empty clears a result) and every standings update goes through `recalcular_clasificacion`. Dorsal is unique only among active players (partial index). After saving, client forms call `router.refresh()` and drop their drafts when the server data changes. Photos/videos go to the public Supabase Storage bucket `caninos-media` (`src/lib/media.ts`): the browser resizes images (`src/lib/media-upload.ts`), asks `POST /api/admin/media` (`accion: "preparar"`) for a signed upload URL, uploads directly to Storage, then `accion: "confirmar"` stores the public URL in `jugadores.foto_url` / `video_url` or `partidos.foto_convocatoria_url`. Uploads live under `jugadores/<id>/…` and `convocatorias/<id>-…`; only files under those managed prefixes are ever deleted — legacy files in the bucket root are never touched.

**CSV imports.** Admin uploads are parsed in `src/lib/imports/parse-*.ts` (semicolon or comma CSV, UTF-8; team codes like `BAY`, `DAG` are resolved through the `equipos` table) and then sent to transactional Postgres RPCs — `importar_jornada`, `importar_convocatorias`, `importar_estadisticas_jugadores`, `importar_ficha_jugadores`. Validation and standings recalculation live in those SQL functions. `GET /api/admin/templates?tipo=resultados|convocatoria|estadisticas&fase=&grupo=` generates templates from current DB data. Key import semantics (see README for full CSV specs):
- Results never change date/time/field; the callup (convocatoria) CSV is the only source of confirmed schedule.
- Empty cells preserve previous values; stats import replaces stats only for matches included in the file.
- Stats are only accepted for players marked `convocado` in that match.
- Data is scoped by `temporada` + `fase` + `grupo` on `partidos`; player cards (dorsal, posición) are shared across competitions.

**Database.** Schema lives only in `supabase/migrations/` (applied manually, in order, via the Supabase SQL Editor — no Supabase CLI). Schema changes = a new timestamped migration file (`YYYYMMDDNNNN_description.sql`); RPCs are redefined with `create or replace function` in later migrations, so the latest migration defining a function is authoritative. RLS allows anonymous read of public data; writes go through the service-role client. The README documents each migration — update it when adding one.

**3D pitch.** `player-field.tsx` loads `player-pitch-3d.tsx` (react-three-fiber/drei) via `next/dynamic` with `ssr: false`, with error/ready callbacks so the field can fall back when WebGL fails. Keep three.js imports out of server-rendered modules.

**Landing.** `/` renders the active competition (same as its standings page) with `src/components/intro-overlay.tsx` on top: a requestAnimationFrame timeline animates the crest out of the tunnel image — as a three.js coin (`intro-coin.ts`, dynamically imported, positioned so its projected size matches the mask; faces use unlit `MeshBasicMaterial` to keep the crest colours) or a 2D fallback without WebGL — then flies it (shrinking, one last turn) onto the hero crest marked `data-intro-crest` in `team-shell.tsx` — measured each frame, hidden until a final cross-fade hand-off — while a growing radial `mask-image` on the tunnel layer reveals the real page underneath (`html` has `scrollbar-gutter: stable` so nothing shifts when scrolling is unlocked); at the end it `history.replaceState`s to the competition path. It plays fully once per session (`sessionStorage`), short on repeat, and is a plain fade with `prefers-reduced-motion`. Assets live in `public/intro/`.

## Conventions

- Path alias `@/` → `src/`.
- 4-space indentation.
- `SUPABASE_SERVICE_ROLE_KEY` must only be used server-side (Worker secret in production); never expose it via `NEXT_PUBLIC_`.
- Source CSVs in `public/plantillas/<temporada>/<competicion>/`; they are historical references — templates are generated from the database.
