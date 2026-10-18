alter table public.partidos
  add column fase text not null default 'campeon_invierno',
  add column grupo text not null default '';

alter table public.partidos
  add constraint partidos_fase_check check (fase in (
    'campeon_invierno',
    'liga_campeones',
    'clasificacion_descensos',
    'copa_grupos',
    'copa_campeon',
    'copa_consolacion'
  ));

alter table public.partidos drop constraint partido_unico;
alter table public.partidos
  add constraint partido_unico unique (temporada, fase, grupo, jornada, equipo_local, equipo_visitante);

alter table public.clasificacion
  add column fase text not null default 'campeon_invierno',
  add column grupo text not null default '';

alter table public.clasificacion drop constraint clasificacion_pkey;
alter table public.clasificacion
  add constraint clasificacion_pkey primary key (temporada, fase, grupo, equipo);

grant select (fase, grupo)
on public.partidos, public.clasificacion to anon;

update public.partidos set temporada = '2026-2027' where temporada = '2026';
update public.clasificacion set temporada = '2026-2027' where temporada = '2026';

drop function public.importar_jornada(text, jsonb);

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
    insert into public.partidos as current_match (temporada, fase, grupo, jornada, fecha, equipo_local, equipo_visitante, goles_local, goles_visitante, estadio)
    values (p_temporada, p_fase, coalesce(p_grupo, ''), (partido->>'jornada')::smallint, (partido->>'fecha')::timestamptz,
      partido->>'equipo_local', partido->>'equipo_visitante', (partido->>'goles_local')::smallint,
      (partido->>'goles_visitante')::smallint, nullif(partido->>'estadio', ''))
    on conflict (temporada, fase, grupo, jornada, equipo_local, equipo_visitante) do update set
      fecha = excluded.fecha,
      goles_local = coalesce(excluded.goles_local, current_match.goles_local),
      goles_visitante = coalesce(excluded.goles_visitante, current_match.goles_visitante),
      estadio = excluded.estadio
    returning id into partido_uuid;

    if jsonb_typeof(partido->'estadisticas') = 'array' and jsonb_array_length(partido->'estadisticas') > 0 then
      delete from public.estadisticas where partido_id = partido_uuid;
      for stat in select value from jsonb_array_elements(partido->'estadisticas')
      loop
        insert into public.estadisticas (jugador_id, partido_id, goles, asistencias, amarillas, rojas)
        values ((stat->>'jugador_id')::uuid, partido_uuid, coalesce((stat->>'goles')::smallint, 0),
          coalesce((stat->>'asistencias')::smallint, 0), coalesce((stat->>'amarillas')::smallint, 0),
          coalesce((stat->>'rojas')::smallint, 0));
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

insert into public.partidos (temporada, fase, jornada, fecha, equipo_local, equipo_visitante)
values
  ('2026-2027', 'campeon_invierno', 1, '2026-10-17'::date::timestamp at time zone 'Europe/Madrid', 'Torrejon United', 'Locotroes'),
  ('2026-2027', 'campeon_invierno', 1, '2026-10-17'::date::timestamp at time zone 'Europe/Madrid', 'Manchester Pity', 'Lagartos'),
  ('2026-2027', 'campeon_invierno', 1, '2026-10-17'::date::timestamp at time zone 'Europe/Madrid', 'Sprinfield', 'Daganzo Futsal'),
  ('2026-2027', 'campeon_invierno', 1, '2026-10-17'::date::timestamp at time zone 'Europe/Madrid', 'Zeus', 'Zarzuela XXI'),
  ('2026-2027', 'campeon_invierno', 1, '2026-10-17'::date::timestamp at time zone 'Europe/Madrid', 'Bayern D.L.Caninos', 'Severo Torrejon'),
  ('2026-2027', 'campeon_invierno', 1, '2026-10-17'::date::timestamp at time zone 'Europe/Madrid', 'Inter T.J.', 'Barrio La Cañada'),
  ('2026-2027', 'campeon_invierno', 2, '2026-10-24'::date::timestamp at time zone 'Europe/Madrid', 'Locotroes', 'Inter T.J.'),
  ('2026-2027', 'campeon_invierno', 2, '2026-10-24'::date::timestamp at time zone 'Europe/Madrid', 'Lagartos', 'Torrejon United'),
  ('2026-2027', 'campeon_invierno', 2, '2026-10-24'::date::timestamp at time zone 'Europe/Madrid', 'Daganzo Futsal', 'Manchester Pity'),
  ('2026-2027', 'campeon_invierno', 2, '2026-10-24'::date::timestamp at time zone 'Europe/Madrid', 'Zarzuela XXI', 'Sprinfield'),
  ('2026-2027', 'campeon_invierno', 2, '2026-10-24'::date::timestamp at time zone 'Europe/Madrid', 'Severo Torrejon', 'Zeus'),
  ('2026-2027', 'campeon_invierno', 2, '2026-10-24'::date::timestamp at time zone 'Europe/Madrid', 'Barrio La Cañada', 'Bayern D.L.Caninos'),
  ('2026-2027', 'campeon_invierno', 3, '2026-11-07'::date::timestamp at time zone 'Europe/Madrid', 'Locotroes', 'Lagartos'),
  ('2026-2027', 'campeon_invierno', 3, '2026-11-07'::date::timestamp at time zone 'Europe/Madrid', 'Torrejon United', 'Daganzo Futsal'),
  ('2026-2027', 'campeon_invierno', 3, '2026-11-07'::date::timestamp at time zone 'Europe/Madrid', 'Manchester Pity', 'Zarzuela XXI'),
  ('2026-2027', 'campeon_invierno', 3, '2026-11-07'::date::timestamp at time zone 'Europe/Madrid', 'Sprinfield', 'Severo Torrejon'),
  ('2026-2027', 'campeon_invierno', 3, '2026-11-07'::date::timestamp at time zone 'Europe/Madrid', 'Zeus', 'Barrio La Cañada'),
  ('2026-2027', 'campeon_invierno', 3, '2026-11-07'::date::timestamp at time zone 'Europe/Madrid', 'Inter T.J.', 'Bayern D.L.Caninos'),
  ('2026-2027', 'campeon_invierno', 4, '2026-11-14'::date::timestamp at time zone 'Europe/Madrid', 'Lagartos', 'Inter T.J.'),
  ('2026-2027', 'campeon_invierno', 4, '2026-11-14'::date::timestamp at time zone 'Europe/Madrid', 'Daganzo Futsal', 'Locotroes'),
  ('2026-2027', 'campeon_invierno', 4, '2026-11-14'::date::timestamp at time zone 'Europe/Madrid', 'Zarzuela XXI', 'Torrejon United'),
  ('2026-2027', 'campeon_invierno', 4, '2026-11-14'::date::timestamp at time zone 'Europe/Madrid', 'Severo Torrejon', 'Manchester Pity'),
  ('2026-2027', 'campeon_invierno', 4, '2026-11-14'::date::timestamp at time zone 'Europe/Madrid', 'Barrio La Cañada', 'Sprinfield'),
  ('2026-2027', 'campeon_invierno', 4, '2026-11-14'::date::timestamp at time zone 'Europe/Madrid', 'Bayern D.L.Caninos', 'Zeus'),
  ('2026-2027', 'campeon_invierno', 5, '2026-11-21'::date::timestamp at time zone 'Europe/Madrid', 'Lagartos', 'Daganzo Futsal'),
  ('2026-2027', 'campeon_invierno', 5, '2026-11-21'::date::timestamp at time zone 'Europe/Madrid', 'Locotroes', 'Zarzuela XXI'),
  ('2026-2027', 'campeon_invierno', 5, '2026-11-21'::date::timestamp at time zone 'Europe/Madrid', 'Torrejon United', 'Severo Torrejon'),
  ('2026-2027', 'campeon_invierno', 5, '2026-11-21'::date::timestamp at time zone 'Europe/Madrid', 'Manchester Pity', 'Barrio La Cañada'),
  ('2026-2027', 'campeon_invierno', 5, '2026-11-21'::date::timestamp at time zone 'Europe/Madrid', 'Sprinfield', 'Bayern D.L.Caninos'),
  ('2026-2027', 'campeon_invierno', 5, '2026-11-21'::date::timestamp at time zone 'Europe/Madrid', 'Inter T.J.', 'Zeus'),
  ('2026-2027', 'campeon_invierno', 6, '2026-11-28'::date::timestamp at time zone 'Europe/Madrid', 'Daganzo Futsal', 'Inter T.J.'),
  ('2026-2027', 'campeon_invierno', 6, '2026-11-28'::date::timestamp at time zone 'Europe/Madrid', 'Zarzuela XXI', 'Lagartos'),
  ('2026-2027', 'campeon_invierno', 6, '2026-11-28'::date::timestamp at time zone 'Europe/Madrid', 'Severo Torrejon', 'Locotroes'),
  ('2026-2027', 'campeon_invierno', 6, '2026-11-28'::date::timestamp at time zone 'Europe/Madrid', 'Barrio La Cañada', 'Torrejon United'),
  ('2026-2027', 'campeon_invierno', 6, '2026-11-28'::date::timestamp at time zone 'Europe/Madrid', 'Bayern D.L.Caninos', 'Manchester Pity'),
  ('2026-2027', 'campeon_invierno', 6, '2026-11-28'::date::timestamp at time zone 'Europe/Madrid', 'Zeus', 'Sprinfield'),
  ('2026-2027', 'campeon_invierno', 7, '2026-12-12'::date::timestamp at time zone 'Europe/Madrid', 'Daganzo Futsal', 'Zarzuela XXI'),
  ('2026-2027', 'campeon_invierno', 7, '2026-12-12'::date::timestamp at time zone 'Europe/Madrid', 'Lagartos', 'Severo Torrejon'),
  ('2026-2027', 'campeon_invierno', 7, '2026-12-12'::date::timestamp at time zone 'Europe/Madrid', 'Locotroes', 'Barrio La Cañada'),
  ('2026-2027', 'campeon_invierno', 7, '2026-12-12'::date::timestamp at time zone 'Europe/Madrid', 'Torrejon United', 'Bayern D.L.Caninos'),
  ('2026-2027', 'campeon_invierno', 7, '2026-12-12'::date::timestamp at time zone 'Europe/Madrid', 'Manchester Pity', 'Zeus'),
  ('2026-2027', 'campeon_invierno', 7, '2026-12-12'::date::timestamp at time zone 'Europe/Madrid', 'Inter T.J.', 'Sprinfield'),
  ('2026-2027', 'campeon_invierno', 8, '2026-12-19'::date::timestamp at time zone 'Europe/Madrid', 'Zarzuela XXI', 'Inter T.J.'),
  ('2026-2027', 'campeon_invierno', 8, '2026-12-19'::date::timestamp at time zone 'Europe/Madrid', 'Severo Torrejon', 'Daganzo Futsal'),
  ('2026-2027', 'campeon_invierno', 8, '2026-12-19'::date::timestamp at time zone 'Europe/Madrid', 'Barrio La Cañada', 'Lagartos'),
  ('2026-2027', 'campeon_invierno', 8, '2026-12-19'::date::timestamp at time zone 'Europe/Madrid', 'Bayern D.L.Caninos', 'Locotroes'),
  ('2026-2027', 'campeon_invierno', 8, '2026-12-19'::date::timestamp at time zone 'Europe/Madrid', 'Zeus', 'Torrejon United'),
  ('2026-2027', 'campeon_invierno', 8, '2026-12-19'::date::timestamp at time zone 'Europe/Madrid', 'Sprinfield', 'Manchester Pity'),
  ('2026-2027', 'campeon_invierno', 9, '2027-01-16'::date::timestamp at time zone 'Europe/Madrid', 'Zarzuela XXI', 'Severo Torrejon'),
  ('2026-2027', 'campeon_invierno', 9, '2027-01-16'::date::timestamp at time zone 'Europe/Madrid', 'Daganzo Futsal', 'Barrio La Cañada'),
  ('2026-2027', 'campeon_invierno', 9, '2027-01-16'::date::timestamp at time zone 'Europe/Madrid', 'Lagartos', 'Bayern D.L.Caninos'),
  ('2026-2027', 'campeon_invierno', 9, '2027-01-16'::date::timestamp at time zone 'Europe/Madrid', 'Locotroes', 'Zeus'),
  ('2026-2027', 'campeon_invierno', 9, '2027-01-16'::date::timestamp at time zone 'Europe/Madrid', 'Torrejon United', 'Sprinfield'),
  ('2026-2027', 'campeon_invierno', 9, '2027-01-16'::date::timestamp at time zone 'Europe/Madrid', 'Inter T.J.', 'Manchester Pity'),
  ('2026-2027', 'campeon_invierno', 10, '2027-01-23'::date::timestamp at time zone 'Europe/Madrid', 'Severo Torrejon', 'Inter T.J.'),
  ('2026-2027', 'campeon_invierno', 10, '2027-01-23'::date::timestamp at time zone 'Europe/Madrid', 'Barrio La Cañada', 'Zarzuela XXI'),
  ('2026-2027', 'campeon_invierno', 10, '2027-01-23'::date::timestamp at time zone 'Europe/Madrid', 'Bayern D.L.Caninos', 'Daganzo Futsal'),
  ('2026-2027', 'campeon_invierno', 10, '2027-01-23'::date::timestamp at time zone 'Europe/Madrid', 'Zeus', 'Lagartos'),
  ('2026-2027', 'campeon_invierno', 10, '2027-01-23'::date::timestamp at time zone 'Europe/Madrid', 'Sprinfield', 'Locotroes'),
  ('2026-2027', 'campeon_invierno', 10, '2027-01-23'::date::timestamp at time zone 'Europe/Madrid', 'Manchester Pity', 'Torrejon United'),
  ('2026-2027', 'campeon_invierno', 11, '2027-01-30'::date::timestamp at time zone 'Europe/Madrid', 'Severo Torrejon', 'Barrio La Cañada'),
  ('2026-2027', 'campeon_invierno', 11, '2027-01-30'::date::timestamp at time zone 'Europe/Madrid', 'Zarzuela XXI', 'Bayern D.L.Caninos'),
  ('2026-2027', 'campeon_invierno', 11, '2027-01-30'::date::timestamp at time zone 'Europe/Madrid', 'Daganzo Futsal', 'Zeus'),
  ('2026-2027', 'campeon_invierno', 11, '2027-01-30'::date::timestamp at time zone 'Europe/Madrid', 'Lagartos', 'Sprinfield'),
  ('2026-2027', 'campeon_invierno', 11, '2027-01-30'::date::timestamp at time zone 'Europe/Madrid', 'Locotroes', 'Manchester Pity'),
  ('2026-2027', 'campeon_invierno', 11, '2027-01-30'::date::timestamp at time zone 'Europe/Madrid', 'Inter T.J.', 'Torrejon United')
on conflict (temporada, fase, grupo, jornada, equipo_local, equipo_visitante) do nothing;

select public.importar_jornada(
  '2026-2027',
  'campeon_invierno',
  '',
  jsonb_build_array(jsonb_build_object(
    'jornada', 1,
    'fecha', '2026-10-17T00:00:00+02:00',
    'equipo_local', 'Torrejon United',
    'equipo_visitante', 'Locotroes',
    'goles_local', null,
    'goles_visitante', null,
    'estadisticas', '[]'::jsonb
  ))
);
