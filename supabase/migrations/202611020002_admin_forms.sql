-- Formularios del admin: resultados, estadísticas y plantilla editables en cualquier momento.
-- No modifica datos existentes.

-- 1. La clasificación se recalcula desde una sola función (CSV de resultados y formulario).
create or replace function public.recalcular_clasificacion(p_temporada text, p_fase text, p_grupo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
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
end;
$$;

revoke all on function public.recalcular_clasificacion(text, text, text) from public, anon, authenticated;
grant execute on function public.recalcular_clasificacion(text, text, text) to service_role;

-- Misma importación por CSV que antes, ahora usando recalcular_clasificacion.
create or replace function public.importar_jornada(
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

  perform public.recalcular_clasificacion(p_temporada, p_fase, p_grupo);

  return jsonb_build_object('partidos_importados', cantidad, 'temporada', p_temporada, 'fase', p_fase);
end;
$$;

revoke all on function public.importar_jornada(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_jornada(text, text, text, jsonb) to service_role;

-- 2. Resultados desde el formulario: a diferencia del CSV, dejar ambos goles vacíos borra el
-- resultado (el partido vuelve a «programado»). Recalcula la clasificación de cada grupo tocado.
create or replace function public.guardar_resultados(p_partidos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  partido jsonb;
  goles_l smallint;
  goles_v smallint;
  cantidad integer := 0;
  grupo_afectado record;
begin
  if jsonb_typeof(p_partidos) <> 'array' or jsonb_array_length(p_partidos) = 0 then
    raise exception 'Indica al menos un partido.';
  end if;

  for partido in select value from jsonb_array_elements(p_partidos)
  loop
    goles_l := (partido->>'goles_local')::smallint;
    goles_v := (partido->>'goles_visitante')::smallint;
    if (goles_l is null) <> (goles_v is null) then
      raise exception 'Indica los goles de los dos equipos o deja ambos vacíos.';
    end if;

    update public.partidos
    set goles_local = goles_l, goles_visitante = goles_v
    where id = (partido->>'partido_id')::uuid;

    if not found then
      raise exception 'No existe el partido %.', partido->>'partido_id';
    end if;

    cantidad := cantidad + 1;
  end loop;

  for grupo_afectado in
    select distinct temporada, fase, grupo
    from public.partidos
    where id in (select (value->>'partido_id')::uuid from jsonb_array_elements(p_partidos))
  loop
    perform public.recalcular_clasificacion(grupo_afectado.temporada, grupo_afectado.fase, grupo_afectado.grupo);
  end loop;

  return jsonb_build_object('partidos_actualizados', cantidad);
end;
$$;

revoke all on function public.guardar_resultados(jsonb) from public, anon, authenticated;
grant execute on function public.guardar_resultados(jsonb) to service_role;

-- 3. El dorsal solo tiene que ser único entre los jugadores activos: un jugador dado de baja
-- conserva su número en el archivo y otro puede heredarlo.
do $$
declare
  restriccion text;
begin
  for restriccion in
    select conname from pg_constraint
    where conrelid = 'public.jugadores'::regclass
      and contype = 'u'
      and conkey = array[(
        select attnum from pg_attribute where attrelid = 'public.jugadores'::regclass and attname = 'dorsal'
      )]::smallint[]
  loop
    execute format('alter table public.jugadores drop constraint %I', restriccion);
  end loop;
end;
$$;

create unique index if not exists jugadores_dorsal_activo_unico
on public.jugadores (dorsal) where activo and dorsal is not null;

-- 4. Ficha de jugadores: admite cambiar el nombre (opcional) e intercambiar dorsales en una
-- misma carga. Primero libera los dorsales de los jugadores incluidos y luego los asigna.
create or replace function public.importar_ficha_jugadores(p_jugadores jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  jugador jsonb;
  jugador_uuid uuid;
  dorsal_numero smallint;
  posicion_jugador text;
  nombre_jugador text;
  ocupante text;
  cantidad integer := 0;
begin
  if jsonb_typeof(p_jugadores) <> 'array' or jsonb_array_length(p_jugadores) = 0 then
    raise exception 'El archivo debe incluir jugadores para actualizar.';
  end if;

  update public.jugadores
  set dorsal = null
  where activo and id in (select (value->>'jugador_id')::uuid from jsonb_array_elements(p_jugadores));

  for jugador in select value from jsonb_array_elements(p_jugadores)
  loop
    jugador_uuid := (jugador->>'jugador_id')::uuid;
    dorsal_numero := nullif(jugador->>'dorsal', '')::smallint;
    posicion_jugador := jugador->>'posicion';
    nombre_jugador := nullif(btrim(coalesce(jugador->>'nombre', '')), '');

    if posicion_jugador not in ('Portero', 'Cierre', 'Ala izquierda', 'Ala derecha', 'Pívot', 'Por definir') then
      raise exception 'La posición del jugador % no es válida.', jugador_uuid;
    end if;

    if nombre_jugador is not null and char_length(nombre_jugador) > 40 then
      raise exception 'El nombre «%» supera 40 caracteres.', nombre_jugador;
    end if;

    ocupante := null;
    if dorsal_numero is not null then
      select nombre into ocupante
      from public.jugadores
      where activo and dorsal = dorsal_numero and id <> jugador_uuid;
      if ocupante is not null then
        raise exception 'El dorsal % ya lo lleva %.', dorsal_numero, ocupante;
      end if;
    end if;

    update public.jugadores
    set dorsal = dorsal_numero,
        posicion = posicion_jugador,
        nombre = coalesce(nombre_jugador, nombre)
    where id = jugador_uuid and activo;

    if not found then
      raise exception 'El jugador % no existe o no está activo.', jugador_uuid;
    end if;

    cantidad := cantidad + 1;
  end loop;

  return jsonb_build_object('jugadores_actualizados', cantidad);
end;
$$;

revoke all on function public.importar_ficha_jugadores(jsonb) from public, anon, authenticated;
grant execute on function public.importar_ficha_jugadores(jsonb) to service_role;
