alter table public.convocatorias
  add column if not exists convocado boolean not null default true;

do $$
begin
  if exists (
    select 1
    from pg_attribute
    where attrelid = 'public.convocatorias'::regclass
      and attname = 'participo'
      and not attisdropped
  ) then
    execute 'revoke select (participo) on public.convocatorias from anon, authenticated';
  end if;
end;
$$;

alter table public.convocatorias
  drop column if exists participo;

grant select (partido_id, jugador_id, convocado)
on public.convocatorias to anon, authenticated;

create or replace function public.importar_convocatorias(
  p_temporada text,
  p_fase text,
  p_grupo text,
  p_partidos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  partido jsonb;
  jugador jsonb;
  partido_uuid uuid;
  cantidad_partidos integer := 0;
  cantidad_jugadores integer := 0;
  fecha_partido timestamptz;
  fecha_texto text;
  hora_texto text;
  campo_texto text;
  actualizar_convocatoria boolean;
begin
  if p_fase not in ('campeon_invierno', 'liga_campeones', 'clasificacion_descensos', 'copa_grupos', 'copa_campeon', 'copa_consolacion') then
    raise exception 'Fase de competición no válida.';
  end if;

  if jsonb_typeof(p_partidos) <> 'array' or jsonb_array_length(p_partidos) = 0 then
    raise exception 'La importación debe contener al menos un partido.';
  end if;

  for partido in select value from jsonb_array_elements(p_partidos)
  loop
    fecha_texto := nullif(btrim(partido->>'fecha'), '');
    hora_texto := nullif(btrim(partido->>'hora'), '');
    campo_texto := nullif(btrim(partido->>'campo'), '');
    actualizar_convocatoria := coalesce((partido->>'actualizar_convocatoria')::boolean, false);

    if (fecha_texto is null) <> (hora_texto is null) then
      raise exception 'Indica fecha y hora definitivas juntas, o deja ambas vacías para la jornada %.', partido->>'jornada';
    end if;

    if fecha_texto is not null then
      fecha_partido := ((fecha_texto::date + hora_texto::time) at time zone 'Europe/Madrid');
    end if;

    update public.partidos
    set fecha = case when fecha_texto is not null then fecha_partido else fecha end,
        campo = coalesce(campo_texto, campo)
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

    if actualizar_convocatoria then
      for jugador in select value from jsonb_array_elements(coalesce(partido->'jugadores', '[]'::jsonb))
      loop
        if jugador ? 'convocado' and jsonb_typeof(jugador->'convocado') <> 'null' then
          insert into public.convocatorias (partido_id, jugador_id, convocado)
          values (partido_uuid, (jugador->>'jugador_id')::uuid, (jugador->>'convocado')::boolean)
          on conflict (partido_id, jugador_id)
          do update set convocado = excluded.convocado;
          if (jugador->>'convocado')::boolean then
            cantidad_jugadores := cantidad_jugadores + 1;
          end if;
        end if;
      end loop;
    end if;

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

create or replace function public.importar_estadisticas_jugadores(
  p_temporada text,
  p_fase text,
  p_estadisticas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  partido_json jsonb;
  stat jsonb;
  partido_uuid uuid;
  cantidad integer := 0;
begin
  if p_fase <> 'campeon_invierno' then
    raise exception 'Esta importación solo admite la fase Campeón de Invierno.';
  end if;

  if jsonb_typeof(p_estadisticas) <> 'array' or jsonb_array_length(p_estadisticas) = 0 then
    raise exception 'El archivo debe incluir al menos un partido.';
  end if;

  for partido_json in select value from jsonb_array_elements(p_estadisticas)
  loop
    if jsonb_typeof(partido_json->'estadisticas') <> 'array' then
      raise exception 'Cada partido debe incluir la lista de estadísticas (puede estar vacía).';
    end if;

    select fixture.id into partido_uuid
    from public.partidos fixture
    where fixture.temporada = p_temporada
      and fixture.fase = p_fase
      and fixture.jornada = (partido_json->>'jornada')::smallint
      and fixture.equipo_local = partido_json->>'equipo_local'
      and fixture.equipo_visitante = partido_json->>'equipo_visitante'
      and (fixture.equipo_local = 'Bayern D.L.Caninos' or fixture.equipo_visitante = 'Bayern D.L.Caninos');

    if partido_uuid is null then
      raise exception 'No existe el partido del Bayern en la jornada %.', partido_json->>'jornada';
    end if;

    delete from public.estadisticas where partido_id = partido_uuid;

    for stat in select value from jsonb_array_elements(partido_json->'estadisticas')
    loop
      if not exists (
        select 1 from public.convocatorias convocatoria
        where convocatoria.partido_id = partido_uuid
          and convocatoria.jugador_id = (stat->>'jugador_id')::uuid
          and convocatoria.convocado
      ) then
        raise exception 'El jugador % no figura como convocado en la jornada %.',
          stat->>'jugador_id', partido_json->>'jornada';
      end if;

      insert into public.estadisticas (
        jugador_id, partido_id, goles, asistencias, amarillas, rojas,
        penaltis_marcados, penaltis_tirados, dobles_penaltis_marcados,
        dobles_penaltis_tirados, faltas_directas_marcadas
      )
      values (
        (stat->>'jugador_id')::uuid,
        partido_uuid,
        coalesce((stat->>'goles')::smallint, 0),
        coalesce((stat->>'asistencias')::smallint, 0),
        coalesce((stat->>'amarillas')::smallint, 0),
        coalesce((stat->>'rojas')::smallint, 0),
        coalesce((stat->>'penaltis_marcados')::smallint, 0),
        coalesce((stat->>'penaltis_tirados')::smallint, 0),
        coalesce((stat->>'dobles_penaltis_marcados')::smallint, 0),
        coalesce((stat->>'dobles_penaltis_tirados')::smallint, 0),
        coalesce((stat->>'faltas_directas_marcadas')::smallint, 0)
      );

      cantidad := cantidad + 1;
    end loop;
  end loop;

  return jsonb_build_object(
    'estadisticas_actualizadas', cantidad,
    'partidos_actualizados', jsonb_array_length(p_estadisticas),
    'temporada', p_temporada,
    'fase', p_fase
  );
end;
$$;

revoke all on function public.importar_convocatorias(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_convocatorias(text, text, text, jsonb) to service_role;
revoke all on function public.importar_estadisticas_jugadores(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_estadisticas_jugadores(text, text, jsonb) to service_role;
