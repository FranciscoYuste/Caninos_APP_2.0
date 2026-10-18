revoke select on public.jugadores, public.partidos, public.estadisticas, public.clasificacion
from anon;

grant select (id, nombre, posicion, dorsal, foto_url, activo)
on public.jugadores to anon;

grant select (jugador_id, goles, asistencias, partidos_jugados, amarillas, rojas)
on public.estadisticas to anon;

grant select (id, temporada, fecha, equipo_local, equipo_visitante, goles_local, goles_visitante, estado)
on public.partidos to anon;

grant select (temporada, equipo, posicion, jugados, diferencia, puntos)
on public.clasificacion to anon;

grant select (fase, grupo)
on public.partidos, public.clasificacion to anon;

create policy "Jugadores visibles públicamente"
on public.jugadores for select to anon using (true);

create policy "Partidos visibles públicamente"
on public.partidos for select to anon using (true);

create policy "Estadísticas visibles públicamente"
on public.estadisticas for select to anon using (true);

create policy "Clasificación visible públicamente"
on public.clasificacion for select to anon using (true);
