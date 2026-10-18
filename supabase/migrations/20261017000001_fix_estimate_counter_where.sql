-- ---------------------------------------------------------------------------
-- BrightCoat Ops — Corrige next_estimate_number()
--
-- El UPDATE original no llevaba WHERE (la tabla estimate_counter solo tiene
-- una fila, así que no hacía falta filtrar) pero Supabase bloquea por
-- seguridad cualquier UPDATE sin WHERE, incluso en una tabla de una sola
-- fila — por eso al generar un estimado tiraba "UPDATE requires a WHERE
-- clause". Se agrega un WHERE que de todas formas apunta a esa única fila.
-- ---------------------------------------------------------------------------

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
