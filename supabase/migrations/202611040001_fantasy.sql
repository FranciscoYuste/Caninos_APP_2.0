-- Fantasy de los jugadores del Bayern: datos por partido que no están en estadisticas.
-- Los puntos se calculan en la web (src/lib/fantasy.ts) a partir de convocatorias,
-- estadísticas, resultado, KATSU y esta tabla. No modifica datos existentes.

-- 1. Una fila por jugador y partido, solo cuando hay algo distinto de lo normal:
--    - convocados: portero del partido, penaltis provocados/cometidos/parados y goles en propia;
--    - no convocados: motivo de la ausencia (sin fila = ausencia sin justificar).
create table if not exists public.fantasy_partido (
  partido_id uuid not null references public.partidos(id) on delete cascade,
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  ausencia text check (ausencia in ('injustificada', 'justificada', 'tecnica')),
  portero boolean not null default false,
  penaltis_provocados smallint not null default 0 check (penaltis_provocados between 0 and 99),
  penaltis_cometidos smallint not null default 0 check (penaltis_cometidos between 0 and 99),
  penaltis_cometidos_gol smallint not null default 0 check (penaltis_cometidos_gol between 0 and 99),
  penaltis_parados smallint not null default 0 check (penaltis_parados between 0 and 99),
  dobles_penaltis_parados smallint not null default 0 check (dobles_penaltis_parados between 0 and 99),
  goles_propia smallint not null default 0 check (goles_propia between 0 and 99),
  primary key (partido_id, jugador_id),
  constraint fantasy_cometidos_gol_validos check (penaltis_cometidos_gol <= penaltis_cometidos)
);

alter table public.fantasy_partido enable row level security;

revoke all on public.fantasy_partido from anon, authenticated;
grant select on public.fantasy_partido to anon, authenticated;

drop policy if exists "Fantasy visible públicamente" on public.fantasy_partido;
create policy "Fantasy visible públicamente"
on public.fantasy_partido for select to anon, authenticated using (true);

-- 2. Dobles penaltis que le pitan en contra al Bayern en el partido (restan a todos los que jugaron).
alter table public.partidos
  add column if not exists dobles_penaltis_en_contra smallint not null default 0
  check (dobles_penaltis_en_contra between 0 and 99);

grant select (dobles_penaltis_en_contra) on public.partidos to anon, authenticated;

-- 3. Guarda los datos fantasy de un partido desde el admin: sustituye todas sus filas.
--    p_jugadores: [{ jugador_id, ausencia, portero, penaltis_provocados, penaltis_cometidos,
--    penaltis_cometidos_gol, penaltis_parados, dobles_penaltis_parados, goles_propia }]
create or replace function public.guardar_fantasy_partido(
  p_partido_id uuid,
  p_dobles_penaltis_en_contra smallint,
  p_jugadores jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  jugador jsonb;
  jugador_uuid uuid;
  es_convocado boolean;
  nombre_jugador text;
  motivo text;
  es_portero boolean;
  provocados smallint;
  cometidos smallint;
  cometidos_gol smallint;
  parados smallint;
  dobles_parados smallint;
  propia smallint;
  cantidad integer := 0;
begin
  if jsonb_typeof(p_jugadores) <> 'array' then
    raise exception 'La lista de jugadores no es válida.';
  end if;
  if coalesce(p_dobles_penaltis_en_contra, 0) not between 0 and 99 then
    raise exception 'Los dobles penaltis en contra deben estar entre 0 y 99.';
  end if;

  update public.partidos
  set dobles_penaltis_en_contra = coalesce(p_dobles_penaltis_en_contra, 0)
  where id = p_partido_id;
  if not found then
    raise exception 'No existe el partido indicado.';
  end if;

  if not exists (select 1 from public.convocatorias where partido_id = p_partido_id) then
    raise exception 'Publica primero la convocatoria del partido.';
  end if;

  delete from public.fantasy_partido where partido_id = p_partido_id;

  for jugador in select value from jsonb_array_elements(p_jugadores)
  loop
    jugador_uuid := (jugador->>'jugador_id')::uuid;
    select nombre into nombre_jugador from public.jugadores where id = jugador_uuid;
    if nombre_jugador is null then
      raise exception 'El jugador % no existe.', jugador_uuid;
    end if;

    es_convocado := exists (
      select 1 from public.convocatorias
      where partido_id = p_partido_id and jugador_id = jugador_uuid and convocatorias.convocado
    );
    motivo := nullif(jugador->>'ausencia', '');
    es_portero := coalesce((jugador->>'portero')::boolean, false);
    provocados := coalesce((jugador->>'penaltis_provocados')::smallint, 0);
    cometidos := coalesce((jugador->>'penaltis_cometidos')::smallint, 0);
    cometidos_gol := coalesce((jugador->>'penaltis_cometidos_gol')::smallint, 0);
    parados := coalesce((jugador->>'penaltis_parados')::smallint, 0);
    dobles_parados := coalesce((jugador->>'dobles_penaltis_parados')::smallint, 0);
    propia := coalesce((jugador->>'goles_propia')::smallint, 0);

    if es_convocado then
      if motivo is not null then
        raise exception '% está convocado: no puede tener ausencia.', nombre_jugador;
      end if;
      -- Un convocado sin nada especial no necesita fila.
      continue when not es_portero and provocados = 0 and cometidos = 0 and cometidos_gol = 0
        and parados = 0 and dobles_parados = 0 and propia = 0;
    else
      if es_portero or provocados + cometidos + cometidos_gol + parados + dobles_parados + propia > 0 then
        raise exception '% no está convocado: solo se puede indicar el motivo de su ausencia.', nombre_jugador;
      end if;
      if motivo is null or motivo not in ('injustificada', 'justificada', 'tecnica') then
        raise exception 'Indica el motivo de la ausencia de %.', nombre_jugador;
      end if;
      -- Sin fila ya cuenta como ausencia sin justificar.
      continue when motivo = 'injustificada';
    end if;

    insert into public.fantasy_partido (
      partido_id, jugador_id, ausencia, portero, penaltis_provocados, penaltis_cometidos,
      penaltis_cometidos_gol, penaltis_parados, dobles_penaltis_parados, goles_propia
    ) values (
      p_partido_id, jugador_uuid, motivo, es_portero, provocados, cometidos,
      cometidos_gol, parados, dobles_parados, propia
    );
    cantidad := cantidad + 1;
  end loop;

  return jsonb_build_object('filas_guardadas', cantidad);
end;
$$;

revoke all on function public.guardar_fantasy_partido(uuid, smallint, jsonb) from public, anon, authenticated;
grant execute on function public.guardar_fantasy_partido(uuid, smallint, jsonb) to service_role;

-- 4. Partidos ya jugados: quien está lesionado ahora y no fue convocado cuenta como ausencia
--    justificada (el resto de ausencias, sin justificar, no necesitan fila).
insert into public.fantasy_partido (partido_id, jugador_id, ausencia)
select partidos.id, jugadores.id, 'justificada'
from public.partidos
cross join public.jugadores
where 'Bayern D.L.Caninos' in (partidos.equipo_local, partidos.equipo_visitante)
  and partidos.goles_local is not null
  and jugadores.activo
  and jugadores.lesionado
  and exists (select 1 from public.convocatorias where convocatorias.partido_id = partidos.id)
  and not exists (
    select 1 from public.convocatorias
    where convocatorias.partido_id = partidos.id
      and convocatorias.jugador_id = jugadores.id
      and convocatorias.convocado
  )
on conflict (partido_id, jugador_id) do nothing;
