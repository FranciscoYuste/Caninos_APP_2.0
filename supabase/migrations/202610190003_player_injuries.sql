alter table public.jugadores
  add column lesionado boolean not null default false;

grant select (lesionado)
on public.jugadores to anon, authenticated;
