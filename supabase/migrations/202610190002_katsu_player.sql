alter table public.partidos
  add column jugador_katsu_id uuid references public.jugadores(id) on delete set null;

grant select (jugador_katsu_id)
on public.partidos to anon, authenticated;
