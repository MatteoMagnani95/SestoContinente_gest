-- SESTO CONTINENTE | Fase 3 | schede soci unificate
-- Eseguire dopo 0001 e 0002, una volta, su un ambiente di test.
-- Non elimina né modifica persone, adesioni, pagamenti o documenti esistenti.
-- La view usa le RLS originali delle tabelle sottostanti (PostgreSQL >= 15).

begin;

create index if not exists adesioni_stagione_stato_idx
  on public.adesioni(stagione_id, stato, persona_id);

create or replace view public.schede_soci
with (security_invoker = true)
as
select
  a.id as adesione_id,
  a.persona_id,
  a.stagione_id,
  s.nome as stagione,
  s.attiva as stagione_attiva,
  a.stato,
  a.data_approvazione,
  p.nome,
  p.cognome,
  p.codice_fiscale,
  p.email,
  p.telefono
from public.adesioni a
join public.persone p on p.id = a.persona_id
join public.stagioni s on s.id = a.stagione_id;

revoke all on public.schede_soci from public, anon;
grant select on public.schede_soci to authenticated;

comment on view public.schede_soci is
  'Elenco adesioni e soci. Security invoker: non aggira le policy RLS delle tabelle persone, adesioni e stagioni.';

commit;
