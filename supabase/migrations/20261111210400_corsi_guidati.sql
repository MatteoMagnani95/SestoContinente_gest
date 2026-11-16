-- SESTO CONTINENTE — Fase 3.2: gestione guidata dei corsi.
-- Richiede 0001, 0002 e 0003. Eseguire UNA volta su database di prova.
-- Migrazione additiva: non cancella dati o tabelle esistenti.
begin;

create index if not exists edizioni_stagione_stato_idx on public.edizioni_corsi(stagione_id,stato,inizio);
create index if not exists iscrizioni_edizione_stato_idx on public.iscrizioni_corsi(edizione_id,stato,persona_id);
create index if not exists lezioni_edizione_inizio_idx on public.lezioni(edizione_id,inizio);
create index if not exists presenze_lezione_idx on public.presenze(lezione_id,persona_id);

-- Consente alla segreteria di rimuovere aiuto-istruttori assegnati per errore.
-- La UI impedisce la rimozione diretta del responsabile; la policy non amplia gli accessi.
create policy assegnazioni_staff_del on public.assegnazioni_istruttori
for delete to authenticated using ((select public.is_staff()));

-- Blocca nuove conferme senza adesione attiva nella stessa stagione, anche
-- quando un utente staff utilizza i moduli generici anziché la scheda guidata.
create function public.valida_nuova_iscrizione_guidata()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_stagione uuid; v_stato text;
begin
 if tg_op='UPDATE' and new.stato is not distinct from old.stato
    and new.persona_id is not distinct from old.persona_id
    and new.edizione_id is not distinct from old.edizione_id then return new; end if;
 if new.stato in ('in_attesa','iscritto') then
  select stagione_id,stato into v_stagione,v_stato from public.edizioni_corsi where id=new.edizione_id;
  if v_stato not in ('programmato','attivo') then raise exception 'Edizione non aperta alle iscrizioni'; end if;
  if new.stato='iscritto' and not exists (
   select 1 from public.adesioni where persona_id=new.persona_id
   and stagione_id=v_stagione and stato='attiva') then
   raise exception 'Per confermare l’iscrizione serve un’adesione attiva alla stagione';
  end if;
 end if;
 return new;
end; $$;
create trigger valida_nuova_iscrizione_guidata_trigger
before insert or update of persona_id,edizione_id,stato on public.iscrizioni_corsi
for each row execute function public.valida_nuova_iscrizione_guidata();

-- Non si può eliminare il responsabile di un corso: va sostituito con UPDATE,
-- così l'edizione non resta accidentalmente senza referente.
create function public.proteggi_responsabile_corso()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if old.ruolo='responsabile' then raise exception 'Sostituire il responsabile, non rimuoverlo'; end if;
 return old;
end; $$;
create trigger proteggi_responsabile_corso_trigger
before delete on public.assegnazioni_istruttori
for each row execute function public.proteggi_responsabile_corso();

-- Creazione atomica di lezione e prenotazioni corsie. SECURITY INVOKER:
-- tutte le RLS di lezioni e prenotazioni_corsie continuano a valere.
create function public.crea_lezione_guidata(
 p_edizione uuid,
 p_titolo text,
 p_inizio timestamptz,
 p_fine timestamptz,
 p_piscina uuid,
 p_corsie uuid[],
 p_esercizi text,
 p_materiale text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_lezione uuid; v_corsia uuid; v_edizione record;
begin
 if not (select public.is_staff()) then raise exception 'Permessi insufficienti'; end if;
 if length(btrim(coalesce(p_titolo,''))) = 0 or length(p_titolo)>160 then
  raise exception 'Titolo obbligatorio (massimo 160 caratteri)';
 end if;
 if p_inizio is null or p_fine is null or p_fine<=p_inizio then
  raise exception 'Intervallo della lezione non valido';
 end if;
 select inizio,fine,stato into v_edizione from public.edizioni_corsi where id=p_edizione for update;
 if not found or v_edizione.stato not in ('programmato','attivo') then
  raise exception 'Edizione non disponibile';
 end if;
 if (p_inizio at time zone 'Europe/Rome')::date<v_edizione.inizio or
    (p_fine at time zone 'Europe/Rome')::date>v_edizione.fine then
  raise exception 'La lezione deve rientrare nelle date del corso';
 end if;
 if coalesce(array_length(p_corsie,1),0)>20 or
    (coalesce(array_length(p_corsie,1),0)>0 and p_piscina is null) then
  raise exception 'Selezionare una piscina e al massimo 20 corsie';
 end if;
 insert into public.lezioni(edizione_id,titolo,inizio,fine,piscina_id,esercizi,materiale)
 values(p_edizione,btrim(p_titolo),p_inizio,p_fine,p_piscina,p_esercizi,p_materiale)
 returning id into v_lezione;
 foreach v_corsia in array coalesce(p_corsie,'{}'::uuid[]) loop
  insert into public.prenotazioni_corsie(lezione_id,corsia_id,inizio,fine,stato)
  values(v_lezione,v_corsia,p_inizio,p_fine,'confermata');
 end loop;
 return v_lezione;
end; $$;
revoke all on function public.crea_lezione_guidata(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text) from public,anon;
grant execute on function public.crea_lezione_guidata(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text) to authenticated;

comment on function public.crea_lezione_guidata(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text)
is 'Aggiunge lezione e corsie in modo atomico con validazione stagione/orario, RLS e vincolo antisovrapposizione.';
commit;
