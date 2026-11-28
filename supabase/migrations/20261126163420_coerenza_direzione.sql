-- Direttore e incarico di responsabile: coerenza sulle nuove modifiche.
-- Le difformità preesistenti non vengono corrette né rimosse automaticamente.
begin;
create function public.blocca_incarico_responsabile()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and old.ruolo='responsabile' and
   (new.edizione_id,new.ruolo) is distinct from (old.edizione_id,old.ruolo) then
  raise exception 'Sostituire il responsabile senza rimuovere o spostare l’incarico' using errcode='P3510';
 end if;
 if new.ruolo='responsabile' and (tg_op='INSERT' or
   (new.edizione_id,new.persona_id,new.ruolo) is distinct from (old.edizione_id,old.persona_id,old.ruolo)) then
  perform 1 from public.edizioni_corsi where id=new.edizione_id for update;
 end if;
 return new;
end $$;
create trigger blocca_incarico_responsabile before insert or update on public.assegnazioni_istruttori
for each row execute function public.blocca_incarico_responsabile();

-- Controllo a fine transazione: permette la sostituzione atomica dei due
-- riferimenti, ma impedisce la creazione di nuovi incarichi divergenti.
create function public.verifica_coerenza_direzione()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_edizione uuid;
begin
 if tg_table_name='edizioni_corsi' then
  if tg_op='UPDATE' and new.direttore_id is not distinct from old.direttore_id then return null; end if;
  v_edizione:=new.id;
 else
  if new.ruolo<>'responsabile' then return null; end if;
  if tg_op='UPDATE' and (new.edizione_id,new.persona_id,new.ruolo) is not distinct from
     (old.edizione_id,old.persona_id,old.ruolo) then return null; end if;
  v_edizione:=new.edizione_id;
 end if;
 if exists(select 1 from public.edizioni_corsi e join public.assegnazioni_istruttori a
   on a.edizione_id=e.id and a.ruolo='responsabile'
   where e.id=v_edizione and a.persona_id is distinct from e.direttore_id) then
  raise exception 'Direttore e responsabile devono coincidere' using errcode='P3510';
 end if;
 return null;
end $$;
create constraint trigger coerenza_direttore after insert or update on public.edizioni_corsi
 deferrable initially deferred for each row execute function public.verifica_coerenza_direzione();
create constraint trigger coerenza_responsabile after insert or update on public.assegnazioni_istruttori
 deferrable initially deferred for each row execute function public.verifica_coerenza_direzione();
revoke all on function public.blocca_incarico_responsabile(),public.verifica_coerenza_direzione() from public,anon,authenticated;

create function public.allinea_direttore_responsabile(p_edizione uuid,p_persona uuid,p_direttore_atteso uuid,p_responsabile_atteso uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare e public.edizioni_corsi%rowtype; a public.assegnazioni_istruttori%rowtype;
begin
 if not public.is_staff() then raise exception 'Accesso negato' using errcode='42501'; end if;
 select * into e from public.edizioni_corsi where id=p_edizione for update;
 if not found or e.stato not in ('programmato','attivo') then
  raise exception 'Corso non operativo' using errcode='P3511';
 end if;
 select * into a from public.assegnazioni_istruttori where edizione_id=p_edizione and ruolo='responsabile' for update;
 if a.id is null or a.persona_id is distinct from p_responsabile_atteso or e.direttore_id is distinct from p_direttore_atteso then
  raise exception 'Incarico cambiato dopo apertura scheda' using errcode='P3511';
 end if;
 if p_persona is null then raise exception 'Persona non valida' using errcode='23514'; end if;
 if a.persona_id is distinct from p_persona then
  if not exists(select 1 from public.qualifiche_istruttori where persona_id=p_persona) then
   raise exception 'Qualifica non registrata' using errcode='P3512';
  end if;
  if exists(select 1 from public.assegnazioni_istruttori where edizione_id=p_edizione and persona_id=p_persona and id<>a.id) then
   raise exception 'Istruttore già assegnato: verificare incarico di aiuto' using errcode='P3512';
  end if;
 end if;
 -- Il trigger 0019 conserva il divieto direttore/allievo e il brevetto storico.
 if e.direttore_id is distinct from p_persona then
  update public.edizioni_corsi set direttore_id=p_persona where id=p_edizione;
 end if;
 if a.persona_id is distinct from p_persona then
  update public.assegnazioni_istruttori set persona_id=p_persona where id=a.id;
 end if;
end $$;
revoke all on function public.allinea_direttore_responsabile(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.allinea_direttore_responsabile(uuid,uuid,uuid,uuid) to authenticated;
commit;
