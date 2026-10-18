-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Numeración de Estimados
--
-- Los Estimados (módulo nuevo: formulario -> PDF) NO se guardan en la base
-- de datos — solo se arma el PDF al momento y se descarga, sin historial.
-- Pero sí necesitan un número consecutivo compartido entre ops-web y
-- ops-mobile (para que no se repitan números si David genera uno desde el
-- celular y otro desde la compu). Esta tabla guarda únicamente el próximo
-- número a usar, como seguía con QuickBooks.
--
-- next_estimate_number() incrementa y devuelve el número en una sola
-- operación atómica, para evitar que dos estimados generados casi al mismo
-- tiempo (web + mobile) terminen con el mismo número.
-- ---------------------------------------------------------------------------

create table if not exists estimate_counter (
  id          uuid primary key default gen_random_uuid(),
  next_number integer not null
);

comment on table estimate_counter is 'Fila única con el próximo número de Estimado a asignar — ver next_estimate_number().';

-- Semilla: David confirmó que el próximo número de Estimado a asignar es
-- el 4200 (siguiendo la numeración de QuickBooks).
insert into estimate_counter (next_number)
  select 4200
  where not exists (select 1 from estimate_counter);

alter table estimate_counter enable row level security;

create policy "estimate_counter_select_authenticated" on estimate_counter
  for select to authenticated using (true);

create or replace function next_estimate_number()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned integer;
begin
  update estimate_counter
    set next_number = next_number + 1
    where id = (select id from estimate_counter order by id limit 1)
    returning next_number - 1 into assigned;
  return assigned;
end;
$$;

comment on function next_estimate_number() is 'Reserva y devuelve el siguiente número de Estimado de forma atómica (evita choques entre ops-web y ops-mobile).';

grant execute on function next_estimate_number() to authenticated;
