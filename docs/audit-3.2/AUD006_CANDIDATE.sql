-- Candidate for isolated AUD-006 regression only. Do not apply to production before approval.
-- The policy expressions are stored by function OID. Moving the original helpers
-- preserves that identity and their existing EXECUTE grants to authenticated.
-- The internal schema must NOT be exposed by PostgREST.
create schema sesto_internal;
revoke all on schema sesto_internal from public, anon, authenticated;
grant usage on schema sesto_internal to authenticated;
alter function public.documento_sanitario(uuid) set schema sesto_internal;
alter function public.percorso_sanitario(text) set schema sesto_internal;
create or replace function sesto_internal.percorso_sanitario(p_percorso text)
returns boolean language sql stable security definer set search_path='' as $$
 select split_part(p_percorso,'/',2) in ('certificati','transito') or exists(
 select 1 from public.documenti d where d.percorso_storage=p_percorso and sesto_internal.documento_sanitario(d.id))
$$;
-- Public compatibility function: classify only a document the caller may read.
create function public.documento_sanitario(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select case when public.legge_certificato(p_id) then sesto_internal.documento_sanitario(p_id) else false end
$$;
revoke all on function public.documento_sanitario(uuid) from public, anon;
grant execute on function public.documento_sanitario(uuid) to authenticated;
create or replace function public.proteggi_file_medico()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if sesto_internal.documento_sanitario(old.id) and (new.categoria,new.ambito,new.visibilita,new.percorso_storage,new.persona_id,new.utente_id,new.mime)
 is distinct from (old.categoria,old.ambito,old.visibilita,old.percorso_storage,old.persona_id,old.utente_id,old.mime)
 then raise exception 'Documento medico protetto'; end if;
 return new;
end $$;
notify pgrst,'reload schema';
