alter table public.partidos
  add column foto_convocatoria_url text;

grant select (foto_convocatoria_url)
on public.partidos to anon, authenticated;
