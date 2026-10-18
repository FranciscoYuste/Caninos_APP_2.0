create extension if not exists pgcrypto;

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  rol text not null default 'compañero' check (rol in ('compañero', 'admin')),
  jugador_id uuid,
  creado_en timestamptz not null default now()
);

create table public.jugadores (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid unique references public.perfiles(id) on delete set null,
  nombre text not null,
  posicion text not null,
  dorsal smallint not null unique check (dorsal between 0 and 99),
  foto_url text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table public.perfiles add constraint perfiles_jugador_fk foreign key (jugador_id) references public.jugadores(id) on delete set null;

create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  temporada text not null,
  jornada smallint not null check (jornada > 0),
  fecha timestamptz not null,
  equipo_local text not null,
  equipo_visitante text not null,
  goles_local smallint check (goles_local >= 0),
  goles_visitante smallint check (goles_visitante >= 0),
  estadio text,
  estado text generated always as (case when goles_local is null or goles_visitante is null then 'programado' else 'finalizado' end) stored,
  creado_en timestamptz not null default now(),
  constraint partido_equipos_distintos check (equipo_local <> equipo_visitante),
  constraint partido_unico unique (temporada, jornada, equipo_local, equipo_visitante)
);

create table public.estadisticas (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  partido_id uuid not null references public.partidos(id) on delete cascade,
  goles smallint not null default 0 check (goles >= 0),
  asistencias smallint not null default 0 check (asistencias >= 0),
  partidos_jugados boolean not null default true,
  amarillas smallint not null default 0 check (amarillas >= 0),
  rojas smallint not null default 0 check (rojas >= 0),
  minutos smallint check (minutos between 0 and 120),
  unique (jugador_id, partido_id)
);

create table public.clasificacion (
  temporada text not null,
  equipo text not null,
  posicion smallint not null,
  jugados smallint not null default 0,
  ganados smallint not null default 0,
  empatados smallint not null default 0,
  perdidos smallint not null default 0,
  goles_favor smallint not null default 0,
  goles_contra smallint not null default 0,
  diferencia smallint generated always as (goles_favor - goles_contra) stored,
  puntos smallint not null default 0,
  primary key (temporada, equipo)
);

create index partidos_temporada_fecha_idx on public.partidos (temporada, fecha);
create index estadisticas_jugador_idx on public.estadisticas (jugador_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, email) values (new.id, new.email);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.perfiles enable row level security;
alter table public.jugadores enable row level security;
alter table public.partidos enable row level security;
alter table public.estadisticas enable row level security;
alter table public.clasificacion enable row level security;

create policy "Perfiles visibles para su titular" on public.perfiles for select to authenticated using (id = (select auth.uid()));
create policy "Jugadores visibles para usuarios autenticados" on public.jugadores for select to authenticated using (true);
create policy "Partidos visibles para usuarios autenticados" on public.partidos for select to authenticated using (true);
create policy "Estadisticas visibles para usuarios autenticados" on public.estadisticas for select to authenticated using (true);
create policy "Clasificacion visible para usuarios autenticados" on public.clasificacion for select to authenticated using (true);
create policy "Admin gestiona jugadores" on public.jugadores for all to authenticated using (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.rol = 'admin')) with check (exists (select 1 from public.perfiles p where p.id = (select auth.uid()) and p.rol = 'admin'));

create or replace function public.importar_jornada(p_temporada text, p_partidos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  partido jsonb;
  stat jsonb;
  partido_uuid uuid;
  cantidad integer := 0;
begin
  if jsonb_typeof(p_partidos) <> 'array' or jsonb_array_length(p_partidos) = 0 then
    raise exception 'La importación debe contener partidos.';
  end if;

  for partido in select value from jsonb_array_elements(p_partidos)
  loop
    insert into public.partidos (temporada, jornada, fecha, equipo_local, equipo_visitante, goles_local, goles_visitante, estadio)
    values (p_temporada, (partido->>'jornada')::smallint, (partido->>'fecha')::timestamptz,
      partido->>'equipo_local', partido->>'equipo_visitante', (partido->>'goles_local')::smallint,
      (partido->>'goles_visitante')::smallint, nullif(partido->>'estadio', ''))
    on conflict (temporada, jornada, equipo_local, equipo_visitante) do update set
      fecha = excluded.fecha, goles_local = excluded.goles_local, goles_visitante = excluded.goles_visitante,
      estadio = excluded.estadio
    returning id into partido_uuid;

    delete from public.estadisticas where partido_id = partido_uuid;
    for stat in select value from jsonb_array_elements(coalesce(partido->'estadisticas', '[]'::jsonb))
    loop
      insert into public.estadisticas (jugador_id, partido_id, goles, asistencias, amarillas, rojas)
      values ((stat->>'jugador_id')::uuid, partido_uuid, coalesce((stat->>'goles')::smallint, 0),
        coalesce((stat->>'asistencias')::smallint, 0), coalesce((stat->>'amarillas')::smallint, 0),
        coalesce((stat->>'rojas')::smallint, 0));
    end loop;
    cantidad := cantidad + 1;
  end loop;

  delete from public.clasificacion where temporada = p_temporada;
  with resultado as (
    select equipo_local as equipo, goles_local as gf, goles_visitante as gc,
      case when goles_local > goles_visitante then 1 else 0 end as pg,
      case when goles_local = goles_visitante then 1 else 0 end as pe,
      case when goles_local < goles_visitante then 1 else 0 end as pp
    from public.partidos where temporada = p_temporada and estado = 'finalizado'
    union all
    select equipo_visitante, goles_visitante, goles_local,
      case when goles_visitante > goles_local then 1 else 0 end,
      case when goles_visitante = goles_local then 1 else 0 end,
      case when goles_visitante < goles_local then 1 else 0 end
    from public.partidos where temporada = p_temporada and estado = 'finalizado'
  ), totales as (
    select equipo, count(*)::smallint as pj, sum(pg)::smallint as pg, sum(pe)::smallint as pe,
      sum(pp)::smallint as pp, sum(gf)::smallint as gf, sum(gc)::smallint as gc,
      (sum(pg) * 3 + sum(pe))::smallint as pts
    from resultado group by equipo
  )
  insert into public.clasificacion (temporada, equipo, posicion, jugados, ganados, empatados, perdidos, goles_favor, goles_contra, puntos)
  select p_temporada, equipo, row_number() over (order by pts desc, (gf - gc) desc, gf desc, equipo)::smallint,
    pj, pg, pe, pp, gf, gc, pts from totales;

  return jsonb_build_object('partidos_importados', cantidad, 'temporada', p_temporada);
end;
$$;

revoke all on function public.importar_jornada(text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_jornada(text, jsonb) to service_role;