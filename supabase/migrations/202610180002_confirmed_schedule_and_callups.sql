alter table public.partidos
  alter column fecha drop not null,
  add column fecha_prevista date,
  add column campo text;

update public.partidos
set fecha_prevista = (fecha at time zone 'Europe/Madrid')::date,
    fecha = null
where fecha is not null;

create table public.convocatorias (
  partido_id uuid not null references public.partidos(id) on delete cascade,
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  participo boolean not null default false,
  creado_en timestamptz not null default now(),
  primary key (partido_id, jugador_id)
);

create index convocatorias_jugador_idx on public.convocatorias (jugador_id);

alter table public.convocatorias enable row level security;

create policy "Convocatorias visibles públicamente"
on public.convocatorias for select to anon, authenticated using (true);

grant select (partido_id, jugador_id, participo)
on public.convocatorias to anon, authenticated;

grant select (fecha_prevista, campo)
on public.partidos to anon;

drop function public.importar_jornada(text, text, text, jsonb);

create function public.importar_jornada(
  p_temporada text,
  p_fase text,
  p_grupo text,
  p_partidos jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  partido jsonb;
  stat jsonb;
  partido_uuid uuid;
  cantidad integer := 0;
begin
  if p_fase not in ('campeon_invierno', 'liga_campeones', 'clasificacion_descensos', 'copa_grupos', 'copa_campeon', 'copa_consolacion') then
    raise exception 'Fase de competición no válida.';
  end if;

  if jsonb_typeof(p_partidos) <> 'array' or jsonb_array_length(p_partidos) = 0 then
    raise exception 'La importación debe contener partidos.';
  end if;

  for partido in select value from jsonb_array_elements(p_partidos)
  loop
    update public.partidos
    set goles_local = coalesce((partido->>'goles_local')::smallint, goles_local),
        goles_visitante = coalesce((partido->>'goles_visitante')::smallint, goles_visitante)
    where temporada = p_temporada
      and fase = p_fase
      and grupo = coalesce(p_grupo, '')
      and jornada = (partido->>'jornada')::smallint
      and equipo_local = partido->>'equipo_local'
      and equipo_visitante = partido->>'equipo_visitante'
    returning id into partido_uuid;

    if partido_uuid is null then
      raise exception 'No existe el partido de la jornada %: % vs %.', partido->>'jornada', partido->>'equipo_local', partido->>'equipo_visitante';
    end if;

    if jsonb_typeof(partido->'estadisticas') = 'array' then
      for stat in select value from jsonb_array_elements(partido->'estadisticas')
      loop
        insert into public.estadisticas (jugador_id, partido_id, goles, asistencias, amarillas, rojas)
        values ((stat->>'jugador_id')::uuid, partido_uuid, coalesce((stat->>'goles')::smallint, 0),
          coalesce((stat->>'asistencias')::smallint, 0), coalesce((stat->>'amarillas')::smallint, 0),
          coalesce((stat->>'rojas')::smallint, 0))
        on conflict (jugador_id, partido_id) do update set
          goles = excluded.goles,
          asistencias = excluded.asistencias,
          amarillas = excluded.amarillas,
          rojas = excluded.rojas;
      end loop;
    end if;

    cantidad := cantidad + 1;
  end loop;

  delete from public.clasificacion
  where temporada = p_temporada and fase = p_fase and grupo = coalesce(p_grupo, '');

  with resultado as (
    select equipo_local as equipo, goles_local as gf, goles_visitante as gc,
      case when goles_local > goles_visitante then 1 else 0 end as pg,
      case when goles_local = goles_visitante then 1 else 0 end as pe,
      case when goles_local < goles_visitante then 1 else 0 end as pp
    from public.partidos
    where temporada = p_temporada and fase = p_fase and grupo = coalesce(p_grupo, '') and estado = 'finalizado'
    union all
    select equipo_visitante, goles_visitante, goles_local,
      case when goles_visitante > goles_local then 1 else 0 end,
      case when goles_visitante = goles_local then 1 else 0 end,
      case when goles_visitante < goles_local then 1 else 0 end
    from public.partidos
    where temporada = p_temporada and fase = p_fase and grupo = coalesce(p_grupo, '') and estado = 'finalizado'
  ), participantes as (
    select equipo_local as equipo
    from public.partidos
    where temporada = p_temporada and fase = p_fase and grupo = coalesce(p_grupo, '')
    union
    select equipo_visitante
    from public.partidos
    where temporada = p_temporada and fase = p_fase and grupo = coalesce(p_grupo, '')
  ), totales as (
    select equipo, count(*)::smallint as pj, sum(pg)::smallint as pg, sum(pe)::smallint as pe,
      sum(pp)::smallint as pp, sum(gf)::smallint as gf, sum(gc)::smallint as gc,
      (sum(pg) * 3 + sum(pe))::smallint as pts
    from resultado group by equipo
  )
  insert into public.clasificacion (temporada, fase, grupo, equipo, posicion, jugados, ganados, empatados, perdidos, goles_favor, goles_contra, puntos)
  select p_temporada, p_fase, coalesce(p_grupo, ''), participantes.equipo,
    row_number() over (
      order by coalesce(pts, 0) desc, (coalesce(gf, 0) - coalesce(gc, 0)) desc, coalesce(gf, 0) desc, participantes.equipo
    )::smallint,
    coalesce(pj, 0), coalesce(pg, 0), coalesce(pe, 0), coalesce(pp, 0),
    coalesce(gf, 0), coalesce(gc, 0), coalesce(pts, 0)
  from participantes left join totales using (equipo);

  return jsonb_build_object('partidos_importados', cantidad, 'temporada', p_temporada, 'fase', p_fase);
end;
$$;

revoke all on function public.importar_jornada(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_jornada(text, text, text, jsonb) to service_role;

create function public.importar_convocatorias(
  p_temporada text,
  p_fase text,
  p_grupo text,
  p_partidos jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  partido jsonb;
  jugador jsonb;
  partido_uuid uuid;
  cantidad_partidos integer := 0;
  cantidad_jugadores integer := 0;
  fecha_partido timestamptz;
begin
  if p_fase not in ('campeon_invierno', 'liga_campeones', 'clasificacion_descensos', 'copa_grupos', 'copa_campeon', 'copa_consolacion') then
    raise exception 'Fase de competición no válida.';
  end if;

  if jsonb_typeof(p_partidos) <> 'array' or jsonb_array_length(p_partidos) = 0 then
    raise exception 'La importación debe contener al menos una convocatoria.';
  end if;

  for partido in select value from jsonb_array_elements(p_partidos)
  loop
    fecha_partido := ((partido->>'fecha')::date + (partido->>'hora')::time) at time zone 'Europe/Madrid';

    update public.partidos
    set fecha = fecha_partido,
        campo = nullif(partido->>'campo', '')
    where temporada = p_temporada
      and fase = p_fase
      and grupo = coalesce(p_grupo, '')
      and jornada = (partido->>'jornada')::smallint
      and equipo_local = partido->>'equipo_local'
      and equipo_visitante = partido->>'equipo_visitante'
    returning id into partido_uuid;

    if partido_uuid is null then
      raise exception 'No existe el partido de la jornada %: % vs %.', partido->>'jornada', partido->>'equipo_local', partido->>'equipo_visitante';
    end if;

    delete from public.convocatorias where partido_id = partido_uuid;
    for jugador in select value from jsonb_array_elements(coalesce(partido->'jugadores', '[]'::jsonb))
    loop
      insert into public.convocatorias (partido_id, jugador_id, participo)
      values (partido_uuid, (jugador->>'jugador_id')::uuid, coalesce((jugador->>'participo')::boolean, false));
      cantidad_jugadores := cantidad_jugadores + 1;
    end loop;

    cantidad_partidos := cantidad_partidos + 1;
  end loop;

  return jsonb_build_object(
    'partidos_actualizados', cantidad_partidos,
    'jugadores_convocados', cantidad_jugadores,
    'temporada', p_temporada,
    'fase', p_fase
  );
end;
$$;

revoke all on function public.importar_convocatorias(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_convocatorias(text, text, text, jsonb) to service_role;
