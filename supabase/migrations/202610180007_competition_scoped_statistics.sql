drop function if exists public.importar_estadisticas_jugadores(text, text, jsonb);

create or replace function public.importar_estadisticas_jugadores(
  p_temporada text,
  p_fase text,
  p_grupo text,
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
  if p_fase not in (
    'campeon_invierno',
    'liga_campeones',
    'clasificacion_descensos',
    'copa_grupos',
    'copa_campeon',
    'copa_consolacion'
  ) then
    raise exception 'Fase de competición no válida.';
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
      and fixture.grupo = coalesce(p_grupo, '')
      and fixture.jornada = (partido_json->>'jornada')::smallint
      and fixture.equipo_local = partido_json->>'equipo_local'
      and fixture.equipo_visitante = partido_json->>'equipo_visitante'
      and (fixture.equipo_local = 'Bayern D.L.Caninos' or fixture.equipo_visitante = 'Bayern D.L.Caninos');

    if partido_uuid is null then
      raise exception 'No existe el partido del Bayern en la jornada % y grupo %.', partido_json->>'jornada', coalesce(p_grupo, '');
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
    'fase', p_fase,
    'grupo', coalesce(p_grupo, '')
  );
end;
$$;

revoke all on function public.importar_estadisticas_jugadores(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_estadisticas_jugadores(text, text, text, jsonb) to service_role;
