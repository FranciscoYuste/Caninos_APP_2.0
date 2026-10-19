alter table public.jugadores
  add column descripcion_lesion text;

grant select (descripcion_lesion)
on public.jugadores to anon, authenticated;
