-- Competiciones y equipos gestionables desde la base de datos.
-- Solo añade tablas nuevas: no modifica ni borra datos existentes.

create table public.competiciones (
  id uuid primary key default gen_random_uuid(),
  temporada text not null check (temporada ~ '^\d{4}-\d{4}$'),
  fase text not null check (fase in (
    'campeon_invierno',
    'liga_campeones',
    'clasificacion_descensos',
    'copa_grupos',
    'copa_campeon',
    'copa_consolacion'
  )),
  grupo text not null default '' check (char_length(grupo) <= 80),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  orden smallint not null default 0,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_curso', 'finalizada')),
  creado_en timestamptz not null default now(),
  constraint competicion_unica unique (temporada, fase, grupo),
  constraint competicion_slug_unico unique (temporada, slug)
);

alter table public.competiciones enable row level security;

revoke all on public.competiciones from anon, authenticated;
grant select on public.competiciones to anon, authenticated;

create policy "Competiciones visibles públicamente"
on public.competiciones for select to anon, authenticated using (true);

insert into public.competiciones (temporada, fase, grupo, nombre, slug, orden, estado) values
  ('2026-2027', 'campeon_invierno', '', 'Liga de invierno', 'liga-invierno', 1, 'en_curso'),
  ('2026-2027', 'liga_campeones', '', 'Liga de ascenso / descenso', 'liga-ascenso-descenso', 2, 'pendiente'),
  ('2026-2027', 'copa_grupos', '', 'Copa', 'copa', 3, 'pendiente')
on conflict (temporada, fase, grupo) do nothing;

create table public.equipos (
  codigo text primary key check (codigo ~ '^[A-Z0-9]{2,5}$'),
  nombre text not null unique check (char_length(btrim(nombre)) between 1 and 80),
  creado_en timestamptz not null default now()
);

alter table public.equipos enable row level security;

revoke all on public.equipos from anon, authenticated;
grant select on public.equipos to anon, authenticated;

create policy "Equipos visibles públicamente"
on public.equipos for select to anon, authenticated using (true);

insert into public.equipos (codigo, nombre) values
  ('TOR', 'Torrejon United'),
  ('LOC', 'Locotroes'),
  ('MPT', 'Manchester Pity'),
  ('LAG', 'Lagartos'),
  ('SPR', 'Sprinfield'),
  ('DAG', 'Daganzo Futsal'),
  ('ZEU', 'Zeus'),
  ('ZAR', 'Zarzuela XXI'),
  ('BAY', 'Bayern D.L.Caninos'),
  ('SEV', 'Severo Torrejon'),
  ('INT', 'Inter T.J.'),
  ('BLC', 'Barrio La Cañada')
on conflict (codigo) do nothing;
