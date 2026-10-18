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
begin
  if p_fase not in ('campeon_invierno', 'liga_campeones', 'clasificacion_descensos', 'copa_grupos', 'copa_campeon', 'copa_consolacion') then
    raise exception 'Fase de competición no válida.';
  end if;

  if jsonb_typeof(p_partidos) <> 'array' or jsonb_array_length(p_partidos) = 0 then
    raise exception 'La importación debe contener al menos una convocatoria.';
  end if;

  for partido in select value from jsonb_array_elements(p_partidos)
  loop
    fecha_texto := nullif(btrim(partido->>'fecha'), '');
    hora_texto := nullif(btrim(partido->>'hora'), '');
    campo_texto := nullif(btrim(partido->>'campo'), '');

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
