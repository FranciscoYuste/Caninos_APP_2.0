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
  cantidad integer := 0;
begin
  if jsonb_typeof(p_jugadores) <> 'array' or jsonb_array_length(p_jugadores) = 0 then
    raise exception 'El archivo debe incluir jugadores para actualizar.';
  end if;

  for jugador in select value from jsonb_array_elements(p_jugadores)
  loop
    jugador_uuid := (jugador->>'jugador_id')::uuid;
    dorsal_numero := nullif(jugador->>'dorsal', '')::smallint;
    posicion_jugador := jugador->>'posicion';

    if posicion_jugador not in ('Portero', 'Cierre', 'Ala izquierda', 'Ala derecha', 'Pívot', 'Por definir') then
      raise exception 'La posición del jugador % no es válida.', jugador_uuid;
    end if;

    update public.jugadores
    set dorsal = dorsal_numero,
        posicion = posicion_jugador
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
