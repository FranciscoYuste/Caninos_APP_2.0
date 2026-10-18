alter table public.jugadores
  alter column dorsal drop not null,
  alter column posicion set default 'Por definir',
  add column if not exists video_url text;

insert into public.jugadores (nombre, posicion, dorsal)
select roster.nombre, 'Por definir', null
from (values
  ('Miguel'),
  ('Adri'),
  ('Rubén'),
  ('Jorge'),
  ('Carmona'),
  ('Álex'),
  ('Raul'),
  ('Víctor'),
  ('Alfonso'),
  ('Fran'),
  ('David'),
  ('Alberto'),
  ('Jorge Lazaro'),
  ('Pacha'),
  ('Sáez')
) as roster(nombre)
where not exists (
  select 1 from public.jugadores player where player.nombre = roster.nombre
);

alter table public.estadisticas
  add column if not exists penaltis_marcados smallint not null default 0 check (penaltis_marcados >= 0),
  add column if not exists penaltis_tirados smallint not null default 0 check (penaltis_tirados >= 0),
  add column if not exists dobles_penaltis_marcados smallint not null default 0 check (dobles_penaltis_marcados >= 0),
  add column if not exists dobles_penaltis_tirados smallint not null default 0 check (dobles_penaltis_tirados >= 0),
  add column if not exists faltas_directas_marcadas smallint not null default 0 check (faltas_directas_marcadas >= 0);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'estadisticas_penaltis_validos'
      and conrelid = 'public.estadisticas'::regclass
  ) then
    alter table public.estadisticas
      add constraint estadisticas_penaltis_validos
      check (penaltis_marcados <= penaltis_tirados);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'estadisticas_dobles_penaltis_validos'
      and conrelid = 'public.estadisticas'::regclass
  ) then
    alter table public.estadisticas
      add constraint estadisticas_dobles_penaltis_validos
      check (dobles_penaltis_marcados <= dobles_penaltis_tirados);
  end if;
end;
$$;

grant select (video_url)
on public.jugadores to anon;

grant select (
  penaltis_marcados,
  penaltis_tirados,
  dobles_penaltis_marcados,
  dobles_penaltis_tirados,
  faltas_directas_marcadas
)
on public.estadisticas to anon;

grant select (jornada)
on public.partidos to anon;

grant select (ganados, empatados, perdidos, goles_favor, goles_contra)
on public.clasificacion to anon;

create or replace function public.importar_estadisticas_jugadores(
  p_temporada text,
  p_fase text,
  p_estadisticas jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
          and convocatoria.participo
      ) then
        raise exception 'El jugador % no figura como participante en la convocatoria de la jornada %.',
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

  return jsonb_build_object('estadisticas_actualizadas', cantidad, 'partidos_actualizados', jsonb_array_length(p_estadisticas), 'temporada', p_temporada, 'fase', p_fase);
end;
$$;

revoke all on function public.importar_estadisticas_jugadores(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.importar_estadisticas_jugadores(text, text, jsonb) to service_role;
