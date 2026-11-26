-- Fase 5: serializza registrazione presenze e variazioni strutturali della lezione.
-- Nessuna riscrittura di dati storici. Le RLS delle scritture restano in vigore.
begin;

-- L'istruttore non ha UPDATE sulle lezioni, quindi il solo blocco di lettura
-- richiede il contesto del proprietario. Il perimetro di accesso viene
-- ricontrollato esplicitamente; non si concedono nuovi privilegi al chiamante.
create or replace function public.verifica_presenza()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_edizione uuid; v_annullata timestamptz;
begin
 select l.edizione_id,l.annullata_il into v_edizione,v_annullata
 from public.lezioni l where l.id=new.lezione_id
 and (auth.uid() is null or public.is_staff() or public.insegna_edizione(l.edizione_id))
 for share of l;
 if not found or v_annullata is not null or not exists(
  select 1 from public.iscrizioni_corsi i
  where i.edizione_id=v_edizione and i.persona_id=new.persona_id
  and i.stato in ('iscritto','concluso')
 ) then
  raise exception using errcode='P3506', message='Iscrizione o lezione non valida per la presenza';
 end if;
 return new;
end; $$;
revoke all on function public.verifica_presenza() from public,anon,authenticated;

-- Anche l'UPDATE diretto deve rispettare il registro delle presenze.
-- Il blocco della riga della lezione è già acquisito dall'UPDATE.
create or replace function public.proteggi_lezione_con_presenze()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if (new.edizione_id,new.inizio,new.fine,new.piscina_id,new.annullata_il)
 is distinct from (old.edizione_id,old.inizio,old.fine,old.piscina_id,old.annullata_il)
 and exists(select 1 from public.presenze where lezione_id=old.id) then
  raise exception using errcode='P3506', message='Lezione con presenze registrate: variazione strutturale non consentita';
 end if;
 return new;
end; $$;
revoke all on function public.proteggi_lezione_con_presenze() from public,anon,authenticated;
create trigger proteggi_lezione_con_presenze_trigger
before update of edizione_id,inizio,fine,piscina_id,annullata_il on public.lezioni
for each row execute function public.proteggi_lezione_con_presenze();

commit;
