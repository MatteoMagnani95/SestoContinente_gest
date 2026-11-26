-- Coordina presenze/prenotazioni e modifiche della lezione sulla stessa riga.
-- Le policy RLS e le RPC esistenti continuano ad applicarsi.
begin;
create or replace function public.verifica_presenza()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_lezione public.lezioni%rowtype;
begin
 -- SECURITY DEFINER solo per il lock: gli istruttori non hanno UPDATE sulle lezioni.
 -- Non concedere a un account accesso oltre le policy esistenti.
 if auth.uid() is not null and not (public.is_staff() or exists(
   select 1 from public.lezioni l where l.id=new.lezione_id and public.insegna_edizione(l.edizione_id)
 )) then
   raise exception using errcode='42501',message='Presenza non autorizzata';
 end if;
 select * into v_lezione from public.lezioni where id=new.lezione_id for share;
 if not found or v_lezione.annullata_il is not null then
   raise exception using errcode='P3506',message='Lezione non disponibile o annullata';
 end if;
 if auth.uid() is not null and not (public.is_staff() or public.insegna_edizione(v_lezione.edizione_id)) then
   raise exception using errcode='42501',message='Presenza non autorizzata';
 end if;
 if not exists(select 1 from public.iscrizioni_corsi i
   where i.edizione_id=v_lezione.edizione_id and i.persona_id=new.persona_id
     and i.stato in ('iscritto','concluso')) then
   raise exception using errcode='P3506',message='Iscrizione non valida per la presenza';
 end if;
 return new;
end; $$;
revoke all on function public.verifica_presenza() from public,anon,authenticated;

-- Le scritture generiche non devono aggirare i vincoli delle RPC guidate.
create or replace function public.proteggi_lezione_registrata()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if (new.edizione_id,new.inizio,new.fine,new.piscina_id,new.annullata_il)
     is distinct from (old.edizione_id,old.inizio,old.fine,old.piscina_id,old.annullata_il)
   and exists(select 1 from public.presenze where lezione_id=old.id) then
   raise exception using errcode='P3507',message='Lezione con presenze registrate';
 end if;
 if new.annullata_il is not null and old.annullata_il is null and exists(
   select 1 from public.prenotazioni_corsie where lezione_id=old.id and stato='confermata'
 ) then
   raise exception using errcode='P3507',message='Annullare prima le prenotazioni confermate';
 end if;
 return new;
end; $$;
create trigger proteggi_lezione_registrata before update of edizione_id,inizio,fine,piscina_id,annullata_il
 on public.lezioni for each row execute function public.proteggi_lezione_registrata();
revoke all on function public.proteggi_lezione_registrata() from public,anon,authenticated;

-- Una prenotazione diretta deve vedere l'ultimo stato della lezione prima
-- di scrivere; il lock SHARE confligge con l'UPDATE della lezione.
create or replace function public.valida_prenotazione_corsia()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_pool uuid; v_start timestamptz; v_end timestamptz; v_annullata timestamptz; v_lane_pool uuid;
begin
 select piscina_id,inizio,fine,annullata_il into v_pool,v_start,v_end,v_annullata
 from public.lezioni where id=new.lezione_id for share;
 if not found then raise exception 'Lezione non disponibile'; end if;
 select piscina_id into v_lane_pool from public.corsie where id=new.corsia_id;
 if not found or v_pool is distinct from v_lane_pool or
    new.inizio<v_start or new.fine>v_end then
   raise exception 'Piscina, corsia e orari non coerenti';
 end if;
 if new.stato='confermata' and v_annullata is not null then
   raise exception 'Non è possibile prenotare una lezione annullata';
 end if;
 return new;
end; $$;
commit;
