alter table public.partidos
  add column cronica text;

grant select (cronica)
on public.partidos to anon, authenticated;
