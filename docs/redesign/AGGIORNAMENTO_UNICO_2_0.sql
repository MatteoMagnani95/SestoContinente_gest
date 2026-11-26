-- SESTO CONTINENTE 2.0 | aggiornamento unico conservativo
-- Sorgente immutabile: 36751d53cc7e09ede235d51aeb6c181a739f2f9e
-- Per database esistente con migrazioni canoniche 0001-0019.
-- Non azzera dati, utenti, ruoli, file, saldi o storico.
-- Applica ESCLUSIVAMENTE le 7 nuove migrazioni, in un'unica transazione.
-- Se lo schema e' gia' completamente aggiornato, esegue solo le verifiche.
-- Se trova uno schema precedente, parziale o divergente si interrompe senza commit.
-- Non registra versioni fittizie in supabase_migrations.schema_migrations.
-- Eseguire come proprietario del database nel SQL Editor, durante manutenzione.
-- Prima: verificare backup e ambiente, non eseguire su progetto sbagliato.
BEGIN;
SET LOCAL lock_timeout = '15s';
SET LOCAL statement_timeout = '180s';
SELECT pg_advisory_xact_lock(hashtextextended('sesto:upgrade:2.0',0));

CREATE TEMP TABLE sesto20_expected_functions(signature text PRIMARY KEY, source text NOT NULL, definer boolean NOT NULL) ON COMMIT DROP;
INSERT INTO pg_temp.sesto20_expected_functions VALUES
  ('public.registra_revisione(uuid,uuid,date,date,text,text,numeric,text,boolean)', $sesto_body$
declare
  precedente public.revisioni_attrezzature%rowtype;
begin
  if not coalesce(public.is_staff(), false) then
    raise exception using errcode='42501', message='Permesso insufficiente';
  end if;
  if p_richiesta is null or p_data is null or p_data > (now() at time zone 'Europe/Rome')::date
    or p_prossimo < p_data or nullif(btrim(p_tipo),'') is null or p_costo < 0
    or p_costo is distinct from round(p_costo, 2) then
    raise exception using errcode='22023', message='Dati intervento non validi';
  end if;
  perform 1 from public.attrezzature where id=p_attrezzatura for update;
  if not found then
    raise exception using errcode='P3501', message='Attrezzatura non disponibile';
  end if;
  select * into precedente from public.revisioni_attrezzature where id=p_richiesta;
  if found then
    if (precedente.attrezzatura_id, precedente.data_intervento, precedente.prossimo_intervento,
        precedente.tipo, precedente.esito, precedente.costo, precedente.note)
       is not distinct from (p_attrezzatura,p_data,p_prossimo,p_tipo,p_esito,p_costo,p_note) then
      return precedente.id;
    end if;
    raise exception using errcode='P3502', message='Richiesta già utilizzata';
  end if;
  if not coalesce(p_distinta,false) and exists (
    select 1 from public.revisioni_attrezzature
    where attrezzatura_id=p_attrezzatura and data_intervento=p_data
      and lower(btrim(tipo))=lower(btrim(p_tipo))
      and prossimo_intervento is not distinct from p_prossimo
  ) then
    raise exception using errcode='P3503', message='Intervento simile già registrato';
  end if;
  insert into public.revisioni_attrezzature(id,attrezzatura_id,data_intervento,prossimo_intervento,tipo,esito,costo,note)
    values(p_richiesta,p_attrezzatura,p_data,p_prossimo,p_tipo,p_esito,p_costo,p_note);
  return p_richiesta;
end;
$sesto_body$, false),
  ('public.correggi_date_revisione()', $sesto_body$
declare
  scheda public.attrezzature%rowtype;
begin
  if new.attrezzatura_id is distinct from old.attrezzatura_id then
    raise exception using errcode='P3504', message='Attrezzatura storica non riassegnabile';
  end if;
  if (new.data_intervento,new.prossimo_intervento) is not distinct from
     (old.data_intervento,old.prossimo_intervento) then return new; end if;
  if new.data_intervento > (now() at time zone 'Europe/Rome')::date or
     new.prossimo_intervento < new.data_intervento then
    raise exception using errcode='22023', message='Date intervento non valide';
  end if;
  select * into strict scheda from public.attrezzature where id=new.attrezzatura_id for update;
  if greatest(old.data_intervento,new.data_intervento) < scheda.ultima_revisione then
    -- La scadenza è attribuibile a un intervento successivo o resta non documentata.
    if (old.prossimo_intervento is null and new.prossimo_intervento is null) or
       exists (select 1 from public.revisioni_attrezzature r where r.attrezzatura_id=scheda.id
         and r.data_intervento=scheda.ultima_revisione and r.prossimo_intervento=scheda.prossima_revisione) then
      return new;
    end if;
  elsif old.data_intervento=scheda.ultima_revisione and new.data_intervento>=old.data_intervento
    and not exists (select 1 from public.revisioni_attrezzature r where r.attrezzatura_id=scheda.id
      and r.id<>old.id and r.data_intervento>=old.data_intervento)
    and (old.prossimo_intervento is null or old.prossimo_intervento=scheda.prossima_revisione)
    and (new.prossimo_intervento is not null or old.prossimo_intervento is null) then
    update public.attrezzature set ultima_revisione=new.data_intervento,
      prossima_revisione=coalesce(new.prossimo_intervento,prossima_revisione) where id=scheda.id;
    return new;
  end if;
  raise exception using errcode='P3504', message='Le date richiedono verifica dello storico';
end;
$sesto_body$, false),
  ('public.modifica_lezione_e_corsie(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text,text)', $sesto_body$
declare v_lezione record; v_corsia uuid; v_num integer; v_lock bigint;
begin
 if not (select public.is_staff()) then raise exception 'Operazione non autorizzata'; end if;
 if p_titolo is null or length(btrim(p_titolo))<1 or length(p_titolo)>160 or
    p_inizio is null or p_fine is null or p_fine<=p_inizio then
  raise exception 'Titolo o intervallo orario non valido';
 end if;
 if length(coalesce(p_esercizi,''))>2000 or length(coalesce(p_materiale,''))>1000 or
    length(coalesce(p_note,''))>2000 then
  raise exception 'Descrizione troppo lunga';
 end if;
 if coalesce(cardinality(p_corsie),0)>20 or
    (coalesce(cardinality(p_corsie),0)>0 and p_piscina is null) then
  raise exception 'Piscina obbligatoria per le corsie; massimo venti corsie';
 end if;
 select count(*) into v_num from (select distinct unnest(p_corsie)) s;
 if v_num<>coalesce(cardinality(p_corsie),0) then raise exception 'Corsie duplicate'; end if;
 select l.id,l.annullata_il,l.inizio as orario_inizio,l.fine as orario_fine,e.inizio as data_inizio,e.fine as data_fine,e.stato
 into v_lezione from public.lezioni l join public.edizioni_corsi e on e.id=l.edizione_id
 where l.id=p_lezione for update of l;
 if not found or v_lezione.annullata_il is not null then raise exception 'Lezione inesistente o annullata'; end if;
 if v_lezione.stato not in ('programmato','attivo') then
  raise exception 'Il corso non consente modifiche';
 end if;
 if (p_inizio at time zone 'Europe/Rome')::date<v_lezione.data_inizio or
    (p_fine at time zone 'Europe/Rome')::date>v_lezione.data_fine then
  raise exception 'Lezione fuori dalle date del corso';
 end if;
 if exists(select 1 from public.presenze where lezione_id=p_lezione) then
  raise exception 'Lezione con presenze: non spostabile senza rettifica amministrativa';
 end if;
 -- Il flusso guidato ricostruisce le corsie sull'intera durata della lezione.
 -- Non deve alterare implicitamente una prenotazione parziale storica.
 if exists(select 1 from public.prenotazioni_corsie
   where lezione_id=p_lezione and stato='confermata'
     and (inizio<>v_lezione.orario_inizio or fine<>v_lezione.orario_fine)) then
   raise exception using errcode='P3505', message='Prenotazione parziale da verificare prima della modifica guidata';
 end if;
 -- Acquisizione preventiva e ordinata per chiave, prima di scrivere prenotazioni.
 for v_lock in select distinct pg_catalog.hashtextextended('sesto:corsia:'||corsia::text,0) from (select unnest(coalesce(p_corsie,'{}'::uuid[])) as corsia union select corsia_id from public.prenotazioni_corsie where lezione_id=p_lezione and stato='confermata') as u where corsia is not null order by 1 loop
  perform pg_catalog.pg_advisory_xact_lock(v_lock);
 end loop;
 -- Dapprima disattiva tutti i vincoli di occupazione della lezione.
 update public.prenotazioni_corsie set stato='annullata'
 where lezione_id=p_lezione and stato='confermata';
 update public.lezioni set titolo=btrim(p_titolo),inizio=p_inizio,fine=p_fine,
 piscina_id=p_piscina,esercizi=p_esercizi,materiale=p_materiale,note=p_note
 where id=p_lezione;
 foreach v_corsia in array coalesce(p_corsie,'{}'::uuid[]) loop
  insert into public.prenotazioni_corsie(lezione_id,corsia_id,inizio,fine,stato)
  values(p_lezione,v_corsia,p_inizio,p_fine,'confermata')
  on conflict (lezione_id,corsia_id) do update set
   inizio=excluded.inizio,fine=excluded.fine,stato='confermata';
 end loop;
end; $sesto_body$, false),
  ('public.verifica_presenza()', $sesto_body$
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
end; $sesto_body$, true),
  ('public.proteggi_lezione_registrata()', $sesto_body$
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
end; $sesto_body$, false),
  ('public.valida_prenotazione_corsia()', $sesto_body$
declare v_pool uuid; v_start timestamptz; v_end timestamptz; v_annullata timestamptz; v_lane_pool uuid; v_lock bigint;
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
 -- Anche l'inserimento diretto di una prenotazione confermata usa la stessa chiave.
 if new.stato='confermata' then
   v_lock:=pg_catalog.hashtextextended('sesto:corsia:'||new.corsia_id::text,0);
   perform pg_catalog.pg_advisory_xact_lock(v_lock);
 end if;
 return new;
end; $sesto_body$, false),
  ('public.scelte_alla_registrazione()', $sesto_body$
declare m jsonb:=new.raw_user_meta_data;
begin
 if m->>'presa_visione'='si' and length(m->>'versione_privacy') between 1 and 200 then
  insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione,origine) values(new.id,'privacy',true,m->>'versione_privacy','registrazione');
  if m->>'immagini' in ('si','no') and length(m->>'versione_immagini') between 1 and 200 then
   insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione,origine) values(new.id,'immagini',m->>'immagini'='si',m->>'versione_immagini','registrazione');
  end if;
 end if;
 return new;
end $sesto_body$, true),
  ('public.registra_scelta_verificata(boolean,text,bigint,text)', $sesto_body$
declare precedente public.scelte_iscrizione%rowtype;
begin
 if not public.account_corrente_abilitato() or p_scelta is null or
 length(btrim(coalesce(p_versione,''))) not between 1 and 200 or
 p_origine not in ('domanda','profilo') then
  raise exception 'Scelta non valida' using errcode='23514';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,19));
 select * into precedente from public.scelte_iscrizione where utente_id=auth.uid() and tipo='immagini' order by id desc limit 1;
 if precedente.id is distinct from p_scelta_attesa then
  -- Un retry identico dopo un commit già riuscito non aggiunge una riga.
  if (precedente.scelta,precedente.versione) is not distinct from (p_scelta,p_versione) then return; end if;
  raise exception 'Scelta modificata dopo apertura del modulo' using errcode='P3508';
 end if;
 if (precedente.scelta,precedente.versione) is distinct from (p_scelta,p_versione) then
  insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione,origine)
   values(auth.uid(),'immagini',p_scelta,p_versione,p_origine);
 end if;
end $sesto_body$, true),
  ('public.scegli_immagini_verificata(boolean,text,bigint)', $sesto_body$
begin
 perform public.registra_scelta_verificata(p_scelta,p_versione,p_scelta_attesa,'profilo');
end $sesto_body$, true),
  ('public.salva_domanda_v20(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text,text,text,bigint)', $sesto_body$
declare v_prior public.richieste%rowtype; v_test boolean;
begin
 if not public.account_corrente_abilitato() then raise exception 'Accesso negato' using errcode='42501'; end if;
 v_test:=coalesce(p_versione_statuto like 'TEST-COLLAUDO-%',false);
 if v_test is distinct from coalesce(p_versione_privacy like 'TEST-COLLAUDO-%',false)
 or v_test is distinct from coalesce(p_versione_immagini like 'TEST-COLLAUDO-%',false) then
  raise exception 'Dichiarazioni di modalita diversa' using errcode='P3509';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,19));
 select * into v_prior from public.richieste where utente_id=auth.uid();
 if found and (v_prior.versione_statuto is not null or v_prior.versione_privacy is not null)
 and (coalesce(v_prior.versione_statuto like 'TEST-COLLAUDO-%',false) or coalesce(v_prior.versione_privacy like 'TEST-COLLAUDO-%',false)) is distinct from v_test then
  raise exception 'Non convertire pratica reale e collaudo' using errcode='P3509';
 end if;
 perform public.registra_scelta_verificata(p_flag_immagini,p_versione_immagini,p_scelta_attesa,'domanda');
 -- La RPC 0019 conserva tutti i vincoli anagrafici e associativi.
 return public.salva_domanda_v19(p_nome,p_cognome,p_data_nascita,p_luogo_nascita,p_codice_fiscale,p_indirizzo,p_cap,p_comune,p_telefono,p_nome_tutore,p_cognome_tutore,p_parentela_tutore,p_flag_statuto,p_flag_privacy,null,p_versione_statuto,p_versione_privacy,p_invia,p_provincia_nascita,p_stato_nascita,p_sesso_cf,p_versione_immagini,p_emergenza_nome,p_emergenza_telefono);
end $sesto_body$, true),
  ('public.blocca_incarico_responsabile()', $sesto_body$
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
end $sesto_body$, false),
  ('public.verifica_coerenza_direzione()', $sesto_body$
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
end $sesto_body$, true),
  ('public.allinea_direttore_responsabile(uuid,uuid,uuid,uuid)', $sesto_body$
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
end $sesto_body$, false),
  ('public.crea_anteprima_importazione(text,boolean,jsonb)', $sesto_body$
declare v_batch uuid; v_n integer;
begin
 if not public.is_staff() or auth.uid() is null then
  raise exception using errcode='42501',message='Operazione non autorizzata';
 end if;
 if p_tipo is null or p_tipo not in ('soci','corsi') or p_base_documentale is null or
    (p_tipo='corsi' and p_base_documentale) or jsonb_typeof(p_righe) is distinct from 'array' then
  raise exception using errcode='22023',message='Importazione non valida';
 end if;
 v_n:=jsonb_array_length(p_righe);
 if v_n not between 1 and 1000 or octet_length(p_righe::text)>4000000 then
  raise exception using errcode='22023',message='Dimensione anteprima non valida';
 end if;
 if exists(select 1 from jsonb_array_elements(p_righe) as r(value)
   where jsonb_typeof(r.value) is distinct from 'object'
      or jsonb_typeof(r.value->'dati') is distinct from 'object'
      or jsonb_typeof(r.value->'errori') is distinct from 'array') then
  raise exception using errcode='22023',message='Riga anteprima non valida';
 end if;
 insert into public.importazioni_batch(tipo,creato_da,base_documentale_verificata)
 values(p_tipo,auth.uid(),p_base_documentale) returning id into v_batch;
 insert into public.importazioni_righe(batch_id,numero,dati,errori)
 select v_batch,(r.ord+1)::integer,r.value->'dati',r.value->'errori'
 from jsonb_array_elements(p_righe) with ordinality as r(value,ord);
 return v_batch;
end $sesto_body$, false),
  ('public.crea_lezione_guidata(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text)', $sesto_body$
declare v_lezione uuid; v_corsia uuid; v_edizione record; v_lock bigint;
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
 -- Acquisizione preventiva e ordinata per chiave, prima di scrivere prenotazioni.
 for v_lock in select distinct pg_catalog.hashtextextended('sesto:corsia:'||corsia::text,0) from unnest(coalesce(p_corsie,'{}'::uuid[])) as u(corsia) where corsia is not null order by 1 loop
  perform pg_catalog.pg_advisory_xact_lock(v_lock);
 end loop;
 insert into public.lezioni(edizione_id,titolo,inizio,fine,piscina_id,esercizi,materiale)
 values(p_edizione,btrim(p_titolo),p_inizio,p_fine,p_piscina,p_esercizi,p_materiale)
 returning id into v_lezione;
 foreach v_corsia in array coalesce(p_corsie,'{}'::uuid[]) loop
  insert into public.prenotazioni_corsie(lezione_id,corsia_id,inizio,fine,stato)
  values(v_lezione,v_corsia,p_inizio,p_fine,'confermata');
 end loop;
 return v_lezione;
end; $sesto_body$, false),
  ('public.annulla_lezione_guidata(uuid)', $sesto_body$
declare v_id uuid; v_lock bigint;
begin
 if not (select public.is_staff()) then raise exception 'Operazione non autorizzata'; end if;
 select id into v_id from public.lezioni where id=p_lezione and annullata_il is null for update;
 if v_id is null then raise exception 'Lezione inesistente o già annullata'; end if;
 if exists(select 1 from public.presenze where lezione_id=p_lezione) then
  raise exception 'Non si annullano lezioni con presenze registrate';
 end if;
 -- Acquisizione preventiva e ordinata per chiave, prima di scrivere prenotazioni.
 for v_lock in select distinct pg_catalog.hashtextextended('sesto:corsia:'||corsia::text,0) from (select corsia_id as corsia from public.prenotazioni_corsie where lezione_id=p_lezione and stato='confermata') as u order by 1 loop
  perform pg_catalog.pg_advisory_xact_lock(v_lock);
 end loop;
 update public.prenotazioni_corsie set stato='annullata'
 where lezione_id=p_lezione and stato='confermata';
 update public.lezioni set annullata_il=now() where id=p_lezione;
end; $sesto_body$, false);

CREATE TEMP TABLE sesto20_expected_triggers(tabella text, nome text, funzione text) ON COMMIT DROP;
INSERT INTO pg_temp.sesto20_expected_triggers VALUES
  ('revisioni_attrezzature','correggi_date_revisione','correggi_date_revisione'),
  ('lezioni','proteggi_lezione_registrata','proteggi_lezione_registrata'),
  ('assegnazioni_istruttori','blocca_incarico_responsabile','blocca_incarico_responsabile'),
  ('edizioni_corsi','coerenza_direttore','verifica_coerenza_direzione'),
  ('assegnazioni_istruttori','coerenza_responsabile','verifica_coerenza_direzione');

DO $sesto_preflight$
DECLARE r record; obj text; history text;
BEGIN
 IF to_regclass('auth.users') IS NULL OR to_regclass('storage.objects') IS NULL OR to_regclass('storage.buckets') IS NULL THEN
  RAISE EXCEPTION 'Progetto Supabase non inizializzato: Auth/Storage mancanti';
 END IF;
 FOR r IN SELECT * FROM (VALUES
  ('0001', ARRAY['persone','richieste','adesioni','ruoli_utente','stagioni','collegamenti_persone']::text[], ARRAY['is_staff']::text[]),
  ('0002', ARRAY['edizioni_corsi','iscrizioni_corsi','presenze','attrezzature','documenti','pagamenti','notifiche','revisioni_attrezzature','assegnazioni_istruttori','lezioni','prenotazioni_corsie','corsie']::text[], ARRAY['owns_person','insegna_edizione','verifica_presenza','valida_prenotazione_corsia']::text[]),
  ('0003', ARRAY['schede_soci','adesioni_stagione_stato_idx']::text[], ARRAY[]::text[]),
  ('0004', ARRAY[]::text[], ARRAY['crea_lezione_guidata','proteggi_responsabile_corso']::text[]),
  ('0005', ARRAY[]::text[], ARRAY['modifica_lezione_e_corsie','annulla_lezione_guidata']::text[]),
  ('0006', ARRAY[]::text[], ARRAY['registra_pagamento_guidato','verifica_riduzione_addebito']::text[]),
  ('0007', ARRAY[]::text[], ARRAY[]::text[]),
  ('0008', ARRAY['cda_verbali','importazioni_batch','importazioni_righe','moduli_didattici']::text[], ARRAY['conferma_importazione','is_board']::text[]),
  ('0009', ARRAY['moduli_didattici']::text[], ARRAY[]::text[]),
  ('0010', ARRAY[]::text[], ARRAY['cda_report_sicuro','registra_certificato_personale']::text[]),
  ('0011', ARRAY[]::text[], ARRAY['modifica_bozza_cda','salva_domanda_v13']::text[]),
  ('0012', ARRAY[]::text[], ARRAY['verifica_iscrizione_quota_attiva']::text[]),
  ('0013', ARRAY[]::text[], ARRAY['rimuovi_record_gestionale','rimuovi_ruolo_gestionale']::text[]),
  ('0014', ARRAY['eventi_soci','eventi_soci_iscrizioni']::text[], ARRAY['area_soci_iscrivi','area_soci_accesso']::text[]),
  ('0015', ARRAY['rettifiche_incassi']::text[], ARRAY['admin_elenco_account','account_corrente_abilitato']::text[]),
  ('0016', ARRAY['eliminazioni_account_pendenti']::text[], ARRAY['admin_anteprima_eliminazione_account']::text[]),
  ('0017', ARRAY[]::text[], ARRAY['admin_piano_eliminazione_0016','admin_avvia_eliminazione_account']::text[]),
  ('0018', ARRAY['impostazioni_promemoria']::text[], ARRAY['mailing_list_corso','genera_promemoria']::text[]),
  ('0019', ARRAY['scelte_iscrizione','contatti_emergenza','cda_letture','stato_certificati','allievi_senza_certificato','catalogo_identita','edizione_identita']::text[], ARRAY['salva_domanda_v19','iscrivi_con_contatto','firma_brevetto','verifica_direttore','documento_sanitario','legge_certificato','approva_versione_cda']::text[])
 ) AS checks(versione,tabelle,funzioni) LOOP
  FOREACH obj IN ARRAY r.tabelle LOOP
   IF to_regclass('public.'||obj) IS NULL THEN RAISE EXCEPTION 'Baseline %: oggetto % mancante. Nessuna modifica applicata.',r.versione,obj; END IF;
  END LOOP;
  FOREACH obj IN ARRAY r.funzioni LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=obj) THEN RAISE EXCEPTION 'Baseline %: funzione % mancante. Nessuna modifica applicata.',r.versione,obj; END IF;
  END LOOP;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_enum WHERE enumtypid=to_regtype('public.ruolo_app') AND enumlabel='consigliere_cda') THEN RAISE EXCEPTION '0007: ruolo consigliere_cda mancante'; END IF;
 IF (SELECT count(DISTINCT pre_id) FROM public.moduli_didattici WHERE pre_id IN (SELECT 'PRE-'||lpad(i::text,2,'0') FROM generate_series(1,16) i))<>16 THEN RAISE EXCEPTION '0009: uno o piu moduli PRE mancanti'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.admin_piano_eliminazione_0016(uuid)') AND prosrc=$sesto_old$
DECLARE v_persone uuid[]; v_pratiche uuid[]; v_escluse uuid[]; v_adesioni uuid[]; v_iscrizioni uuid[]; v_quote uuid[]; v_addebiti uuid[]; v_pagamenti uuid[]; v_documenti uuid[]; v_cfs text[];
 files jsonb; conteggi jsonb:='{}'; impronta jsonb:='{}'; blocchi text[]:=ARRAY[]::text[]; r record; n bigint; righe jsonb; extra jsonb; raw_plan jsonb;
BEGIN
 IF NOT public.is_admin() OR p_utente IS NULL OR p_utente=auth.uid() THEN RAISE EXCEPTION 'Account protetto o permessi insufficienti' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.ruoli_utente WHERE utente_id=p_utente AND ruolo='amministratore') THEN RAISE EXCEPTION 'Revocare prima il ruolo amministratore' USING ERRCODE='P3414'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_utente) THEN RAISE EXCEPTION 'Account inesistente' USING ERRCODE='P3414'; END IF;
 SELECT ARRAY(SELECT id FROM public.richieste WHERE utente_id=p_utente ORDER BY id) INTO v_pratiche;
 SELECT ARRAY(SELECT id FROM public.persone p WHERE (EXISTS(SELECT 1 FROM public.collegamenti_persone c WHERE c.persona_id=p.id AND c.utente_id=p_utente AND c.relazione='titolare') OR EXISTS(SELECT 1 FROM public.richieste q WHERE q.utente_id=p_utente AND q.persona_id=p.id)) AND NOT EXISTS(SELECT 1 FROM public.collegamenti_persone c WHERE c.persona_id=p.id AND c.utente_id<>p_utente) AND NOT EXISTS(SELECT 1 FROM public.richieste q WHERE q.persona_id=p.id AND q.utente_id<>p_utente) ORDER BY id) INTO v_persone;
 SELECT ARRAY(SELECT DISTINCT persona_id FROM public.collegamenti_persone WHERE utente_id=p_utente AND NOT(persona_id=ANY(v_persone)) ORDER BY persona_id) INTO v_escluse;
 -- Evita di eliminare la pratica di un altro account o documenti appartenenti ad altri profili.
 SELECT ARRAY(SELECT id FROM public.adesioni WHERE persona_id=ANY(v_persone) ORDER BY id), ARRAY(SELECT id FROM public.iscrizioni_corsi WHERE persona_id=ANY(v_persone) ORDER BY id), ARRAY(SELECT id FROM public.quote_associative WHERE persona_id=ANY(v_persone) ORDER BY id) INTO v_adesioni,v_iscrizioni,v_quote;
 SELECT ARRAY(SELECT id FROM public.addebiti_corsi WHERE iscrizione_id=ANY(v_iscrizioni) ORDER BY id) INTO v_addebiti;
 SELECT ARRAY(SELECT id FROM public.pagamenti WHERE persona_id=ANY(v_persone) ORDER BY id) INTO v_pagamenti;
 SELECT ARRAY(SELECT id FROM public.documenti WHERE (persona_id=ANY(v_persone) OR (utente_id=p_utente AND ambito='personale' AND persona_id IS NULL)) AND (utente_id IS NULL OR utente_id=p_utente) AND ambito IN ('personale','amministrativo','didattica') AND edizione_id IS NULL AND programma_versione_id IS NULL ORDER BY id) INTO v_documenti;
 SELECT ARRAY(SELECT DISTINCT upper(btrim(cf)) FROM (SELECT codice_fiscale cf FROM public.persone WHERE id=ANY(v_persone) UNION ALL SELECT codice_fiscale FROM public.richieste WHERE id=ANY(v_pratiche) AND (persona_id IS NULL OR persona_id=ANY(v_persone))) c WHERE nullif(btrim(cf),'') IS NOT NULL ORDER BY 1) INTO v_cfs;
 IF EXISTS(SELECT 1 FROM public.cda_votanti WHERE utente_id=p_utente OR persona_id=ANY(v_persone)) THEN blocchi:=array_append(blocchi,'Votazioni CdA collegate: occorre conservare o gestire separatamente i verbali ufficiali.'); END IF;
 IF EXISTS(SELECT 1 FROM public.cda_adesioni a JOIN public.cda_verbali v ON v.id=a.verbale_id WHERE a.adesione_id=ANY(v_adesioni) AND v.stato='in_approvazione') THEN blocchi:=array_append(blocchi,'Adesione coinvolta in una votazione CdA in corso: concludere la votazione prima di eliminare.'); END IF;
 IF EXISTS(SELECT 1 FROM public.cda_verbali WHERE creato_da=p_utente OR rimosso_da=p_utente) THEN blocchi:=array_append(blocchi,'Verbali CdA creati/rimossi dall’account: archivio condiviso da gestire separatamente.'); END IF;
 IF EXISTS(SELECT 1 FROM public.assegnazioni_istruttori WHERE persona_id=ANY(v_persone) AND ruolo='responsabile') THEN blocchi:=array_append(blocchi,'L’utente è responsabile di un corso: assegnare prima un altro responsabile.'); END IF;
 IF EXISTS(SELECT 1 FROM public.certificati_medici WHERE documento_id=ANY(v_documenti) AND NOT(persona_id=ANY(v_persone))) THEN blocchi:=array_append(blocchi,'Un documento personale è collegato al certificato di un altro socio.'); END IF;
 IF EXISTS(SELECT 1 FROM public.documenti WHERE NOT(id=ANY(v_documenti)) AND (utente_id=p_utente OR caricato_da=p_utente OR persona_id=ANY(v_persone))) THEN blocchi:=array_append(blocchi,'Documenti di altri profili o condivisi: rimuovere o trasferire esplicitamente i collegamenti prima di procedere.'); END IF;
 IF EXISTS(SELECT 1 FROM public.pagamenti WHERE (quota_id=ANY(v_quote) OR addebito_corso_id=ANY(v_addebiti)) AND NOT(persona_id=ANY(v_persone))) THEN blocchi:=array_append(blocchi,'Pagamento collegato a un altro socio: verificare la coerenza dei dati.'); END IF;
 -- Non usare SQL per cancellare storage.objects: la rimozione fisica sarà effettuata tramite Storage API.
 -- Oggetti personali o orfani posseduti dall’utente nel bucket documenti; mai oggetti condivisi o CdA.
 IF EXISTS(SELECT 1 FROM storage.objects o WHERE (to_jsonb(o)->>'owner_id'=p_utente::text OR to_jsonb(o)->>'owner'=p_utente::text) AND (o.bucket_id<>'sesto-documenti' OR EXISTS(SELECT 1 FROM public.documenti d WHERE d.percorso_storage=o.name AND NOT(d.id=ANY(v_documenti))))) THEN blocchi:=array_append(blocchi,'File Storage condivisi o in altri bucket di proprietà dell’utente: trasferirli/gestirli prima di cancellare l’account.'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('bucket',s.bucket,'path',s.path) ORDER BY s.bucket,s.path),'[]'::jsonb) INTO files FROM (
  SELECT 'sesto-documenti'::text AS bucket,percorso_storage AS path FROM public.documenti WHERE id=ANY(v_documenti)
  UNION SELECT o.bucket_id,o.name FROM storage.objects o WHERE o.bucket_id='sesto-documenti' AND (to_jsonb(o)->>'owner_id'=p_utente::text OR to_jsonb(o)->>'owner'=p_utente::text OR split_part(o.name,'/',1)=p_utente::text) AND NOT EXISTS(SELECT 1 FROM public.documenti d WHERE d.percorso_storage=o.name)
 ) s;
 -- Ogni predicato proviene da una whitelist interna, nessuna tabella fornita dal client.
 FOR r IN SELECT * FROM (VALUES
('eventi_pratica','richiesta_id = ANY($3)'),
  ('eventi_soci_iscrizioni','utente_id=$1 OR persona_id=ANY($2)'),
  ('notifiche','utente_id=$1 OR (tipo=''nuova_domanda'' AND split_part(riferimento,'':'',1)=ANY(ARRAY(SELECT x::text FROM unnest($3) x)))'),
  ('movimenti_economici','pagamento_id=ANY($9)'),
  ('rettifiche_incassi','pagamento_originale->>''persona_id''=ANY(ARRAY(SELECT x::text FROM unnest($2) x)) OR pagamento_id=ANY($9)'),
  ('pagamenti','id=ANY($9)'),
  ('addebiti_corsi','id=ANY($8)'),
  ('quote_associative','id=ANY($7)'),
  ('presenze','persona_id=ANY($2)'),
  ('iscrizioni_corsi','id=ANY($6)'),
  ('assegnazioni_attrezzature','persona_id=ANY($2)'),
  ('assegnazioni_istruttori','persona_id=ANY($2)'),
  ('qualifiche_istruttori','persona_id=ANY($2)'),
  ('brevetti_allievi','persona_id=ANY($2)'),
  ('certificati_medici','persona_id=ANY($2)'),
  ('documenti','id=ANY($10)'),
  ('tesseramenti','adesione_id=ANY($5)'),
  ('cda_componenti','persona_id=ANY($2)'),
  ('cda_adesioni','adesione_id=ANY($5)'),
  ('adesioni','id=ANY($5)'),
  ('provenienza_accettazioni_storiche','persona_id=ANY($2)'),
  ('importazioni_righe','importato_id=ANY($2) OR importato_id=ANY($6) OR upper(btrim(dati->>''codice_fiscale''))=ANY($11)'),
  ('richieste','id=ANY($3)'),
  ('relazioni_tutori','minore_id=ANY($2) OR tutore_id=ANY($2)'),
  ('collegamenti_persone','utente_id=$1 OR persona_id=ANY($2)'),
  ('ruoli_utente','utente_id=$1'),
  ('persone','id=ANY($2)')
 ) AS t(tabella,predicato) LOOP
  EXECUTE format('SELECT count(*),coalesce(jsonb_agg(md5(to_jsonb(x)::text) ORDER BY md5(to_jsonb(x)::text)),''[]''::jsonb) FROM public.%I x WHERE %s',r.tabella,r.predicato)
   INTO n,righe USING p_utente,v_persone,v_pratiche,v_escluse,v_adesioni,v_iscrizioni,v_quote,v_addebiti,v_pagamenti,v_documenti,v_cfs;
  conteggi:=conteggi||jsonb_build_object(r.tabella,n);
  impronta:=impronta||jsonb_build_object(r.tabella,righe);
 END LOOP;
 SELECT jsonb_build_object('eventi_trasferiti',(SELECT count(*) FROM public.eventi_soci WHERE responsabile_id=p_utente),'riferimenti_anonimizzati',
 (SELECT count(*) FROM public.eventi_pratica WHERE attore_id=p_utente AND NOT(richiesta_id=ANY(v_pratiche)))+
 (SELECT count(*) FROM public.richieste WHERE esaminatore_id=p_utente AND NOT(id=ANY(v_pratiche)))+
 (SELECT count(*) FROM public.pagamenti WHERE registrato_da=p_utente AND NOT(id=ANY(v_pagamenti)))+
 (SELECT count(*) FROM public.comunicazioni WHERE autore_id=p_utente)+
 (SELECT count(*) FROM public.importazioni_batch WHERE creato_da=p_utente)+
 (SELECT count(*) FROM public.cda_versioni_bozze WHERE archiviata_da=p_utente)+
 (SELECT count(*) FROM public.eventi_soci_iscrizioni WHERE deciso_da=p_utente AND utente_id<>p_utente AND NOT(persona_id=ANY(v_persone)))) INTO extra;
 raw_plan:=jsonb_build_object('persona_ids',v_persone,'pratica_ids',v_pratiche,'escluse',v_escluse,'adesione_ids',v_adesioni,'iscrizione_ids',v_iscrizioni,'quota_ids',v_quote,'addebito_ids',v_addebiti,'pagamento_ids',v_pagamenti,'documento_ids',v_documenti,'cfs',v_cfs,'file',files,'conteggi',conteggi,'blocchi',blocchi,'extra',extra);
 RETURN raw_plan||jsonb_build_object('hash',md5(raw_plan::text||impronta::text));
END; $sesto_old$) THEN RAISE EXCEPTION '0017: definizione % non corrispondente; interrompere', 'admin_piano_eliminazione_0016'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.admin_avvia_eliminazione_account(uuid,text,text)') AND prosrc=$sesto_old$
DECLARE v jsonb; v_persone uuid[]; v_pratiche uuid[]; v_escluse uuid[]; v_adesioni uuid[]; v_iscrizioni uuid[]; v_quote uuid[]; v_addebiti uuid[]; v_pagamenti uuid[]; v_documenti uuid[]; v_cfs text[]; r record; existing jsonb;
BEGIN
 IF NOT public.is_admin() OR p_utente IS NULL OR p_utente=auth.uid() OR p_conferma IS DISTINCT FROM 'ELIMINA DEFINITIVAMENTE' THEN RAISE EXCEPTION 'Operazione non consentita' USING ERRCODE='42501'; END IF;
 -- Evita modifiche concorrenti al piano e a ruoli; lock timeout breve per non bloccare il gestionale.
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(7300413);
 SELECT file_da_rimuovere INTO existing FROM public.eliminazioni_account_pendenti WHERE utente_id=p_utente FOR UPDATE;
 IF FOUND THEN RETURN existing; END IF;
 PERFORM 1 FROM auth.users WHERE id=p_utente FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account inesistente' USING ERRCODE='P3414'; END IF;
 -- Blocca le scritture applicative per il solo tempo della transazione, prevenendo variazioni/cascade non viste nell'anteprima.
 LOCK TABLE public.adesioni,public.addebiti_corsi,public.assegnazioni_attrezzature,public.assegnazioni_istruttori,public.brevetti_allievi,public.cda_adesioni,public.cda_componenti,public.cda_verbali,public.cda_versioni_bozze,public.cda_votanti,public.cda_voti,public.certificati_medici,public.collegamenti_persone,public.comunicazioni,public.documenti,public.eventi_pratica,public.eventi_soci,public.eventi_soci_iscrizioni,public.importazioni_batch,public.importazioni_righe,public.iscrizioni_corsi,public.movimenti_economici,public.notifiche,public.pagamenti,public.persone,public.presenze,public.provenienza_accettazioni_storiche,public.qualifiche_istruttori,public.quote_associative,public.relazioni_tutori,public.rettifiche_incassi,public.richieste,public.ruoli_utente,public.tesseramenti IN SHARE ROW EXCLUSIVE MODE;
 v:=public.admin_piano_eliminazione_0016(p_utente);
 IF p_hash IS DISTINCT FROM v->>'hash' THEN RAISE EXCEPTION 'Dati cambiati: aggiornare l’anteprima' USING ERRCODE='P3414'; END IF;
 IF jsonb_array_length(v->'blocchi')>0 THEN RAISE EXCEPTION 'Sono presenti dati condivisi o protetti: controllare l’anteprima' USING ERRCODE='P3414'; END IF;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'persona_ids') x) INTO v_persone;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'pratica_ids') x) INTO v_pratiche;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'escluse') x) INTO v_escluse;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'adesione_ids') x) INTO v_adesioni;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'iscrizione_ids') x) INTO v_iscrizioni;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'quota_ids') x) INTO v_quote;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'addebito_ids') x) INTO v_addebiti;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'pagamento_ids') x) INTO v_pagamenti;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'documento_ids') x) INTO v_documenti;
 SELECT ARRAY(SELECT x FROM jsonb_array_elements_text(v->'cfs') x) INTO v_cfs;
 -- Mantiene eventi e comunicazioni condivisi; rimuove il legame con l'utente cancellato.
 UPDATE public.eventi_soci SET responsabile_id=auth.uid() WHERE responsabile_id=p_utente;
 UPDATE public.eventi_soci_iscrizioni SET deciso_da=NULL WHERE deciso_da=p_utente AND utente_id<>p_utente AND NOT(persona_id=ANY(v_persone));
 UPDATE public.eventi_pratica SET attore_id=NULL WHERE attore_id=p_utente AND NOT(richiesta_id=ANY(v_pratiche));
 UPDATE public.richieste SET esaminatore_id=NULL WHERE esaminatore_id=p_utente AND NOT(id=ANY(v_pratiche));
 UPDATE public.pagamenti SET registrato_da=NULL WHERE registrato_da=p_utente AND NOT(id=ANY(v_pagamenti));
 UPDATE public.comunicazioni SET autore_id=NULL WHERE autore_id=p_utente;
 UPDATE public.importazioni_batch SET creato_da=NULL WHERE creato_da=p_utente;
 UPDATE public.cda_versioni_bozze SET archiviata_da=NULL WHERE archiviata_da=p_utente;
 UPDATE public.rettifiche_incassi SET pagamento_originale=jsonb_set(pagamento_originale,'{registrato_da}','null'::jsonb) WHERE pagamento_originale->>'registrato_da'=p_utente::text;
 UPDATE public.registro_operazioni SET utente_id=NULL WHERE utente_id=p_utente;
 -- Rimuove i riferimenti identificativi diretti all’account dal registro, ma non cancella le registrazioni di operazioni su terzi.
 UPDATE public.registro_operazioni SET record_id=NULL WHERE tabella='auth.users' AND record_id=p_utente;
 -- Rimuove prima le foglie quindi le righe padre. Non disabilita trigger o RLS globalmente.
 FOR r IN SELECT * FROM (VALUES
  (1,'eventi_pratica','richiesta_id = ANY($3)'),
  (2,'eventi_soci_iscrizioni','utente_id=$1 OR persona_id=ANY($2)'),
  (3,'notifiche','utente_id=$1 OR (tipo=''nuova_domanda'' AND split_part(riferimento,'':'',1)=ANY(ARRAY(SELECT x::text FROM unnest($3) x)))'),
  (4,'movimenti_economici','pagamento_id=ANY($9)'),
  (5,'rettifiche_incassi','pagamento_originale->>''persona_id''=ANY(ARRAY(SELECT x::text FROM unnest($2) x)) OR pagamento_id=ANY($9)'),
  (6,'pagamenti','id=ANY($9)'),
  (7,'addebiti_corsi','id=ANY($8)'),
  (8,'quote_associative','id=ANY($7)'),
  (9,'presenze','persona_id=ANY($2)'),
  (10,'iscrizioni_corsi','id=ANY($6)'),
  (11,'assegnazioni_attrezzature','persona_id=ANY($2)'),
  (12,'assegnazioni_istruttori','persona_id=ANY($2)'),
  (13,'qualifiche_istruttori','persona_id=ANY($2)'),
  (14,'brevetti_allievi','persona_id=ANY($2)'),
  (15,'certificati_medici','persona_id=ANY($2)'),
  (16,'documenti','id=ANY($10)'),
  (17,'tesseramenti','adesione_id=ANY($5)'),
  (18,'cda_componenti','persona_id=ANY($2)'),
  (19,'cda_adesioni','adesione_id=ANY($5)'),
  (20,'adesioni','id=ANY($5)'),
  (21,'provenienza_accettazioni_storiche','persona_id=ANY($2)'),
  (22,'importazioni_righe','importato_id=ANY($2) OR importato_id=ANY($6) OR upper(btrim(dati->>''codice_fiscale''))=ANY($11)'),
  (23,'richieste','id=ANY($3)'),
  (24,'relazioni_tutori','minore_id=ANY($2) OR tutore_id=ANY($2)'),
  (25,'collegamenti_persone','utente_id=$1 OR persona_id=ANY($2)'),
  (26,'ruoli_utente','utente_id=$1'),
  (27,'persone','id=ANY($2)')
 ) AS t(ordine,tabella,predicato) ORDER BY ordine LOOP
  IF r.tabella='documenti' AND EXISTS (SELECT 1 FROM unnest(v_documenti) AS p(id) CROSS JOIN LATERAL public.admin_fk_dipendenze('public','documenti',p.id)) THEN RAISE EXCEPTION 'Dipendenze documentali residue: operazione annullata' USING ERRCODE='P3414'; END IF;
  IF r.tabella='persone' AND EXISTS (SELECT 1 FROM unnest(v_persone) AS p(id) CROSS JOIN LATERAL public.admin_fk_dipendenze('public','persone',p.id)) THEN RAISE EXCEPTION 'Dipendenze anagrafiche residue: operazione annullata' USING ERRCODE='P3414'; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE %s',r.tabella,r.predicato)
   USING p_utente,v_persone,v_pratiche,v_escluse,v_adesioni,v_iscrizioni,v_quote,v_addebiti,v_pagamenti,v_documenti,v_cfs;
 END LOOP;
 -- Verifica tutte le FK verso Auth, comprese quelle introdotte da altre migrazioni.
 IF EXISTS(SELECT 1 FROM public.admin_fk_dipendenze('auth','users',p_utente)) THEN RAISE EXCEPTION 'Riferimenti Auth residui: nessun dato eliminato' USING ERRCODE='P3414'; END IF;
 UPDATE auth.users SET banned_until=now()+interval '100 years' WHERE id=p_utente;
 INSERT INTO public.eliminazioni_account_pendenti(utente_id,file_da_rimuovere) VALUES(p_utente,v->'file');
 INSERT INTO public.registro_operazioni(utente_id,tabella,operazione,record_id) VALUES(auth.uid(),'auth.users','ELIMINAZIONE_COMPLETA_AVVIATA',NULL);
 RETURN v->'file';
END; $sesto_old$) THEN RAISE EXCEPTION '0017: definizione % non corrispondente; interrompere', 'admin_avvia_eliminazione_account'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.impostazioni_promemoria WHERE tipo='quota_corso') THEN RAISE EXCEPTION '0018: promemoria quota_corso mancante'; END IF;
 FOR r IN SELECT * FROM (VALUES ('corsi','duplicato_storico'),('edizioni_corsi','duplicato_storico'),('edizioni_corsi','direttore_id'),('brevetti_allievi','edizione_id'),('certificati_medici','esito_verifica'),('richieste','immagini_scelta'),('registro_operazioni','corso_id'),('cda_verbali','precedente_id')) AS checks(tabella,colonna) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.'||r.tabella) AND attname=r.colonna AND attnum>0 AND NOT attisdropped) THEN RAISE EXCEPTION '0019: manca %.%',r.tabella,r.colonna; END IF;
 END LOOP;
 FOR obj IN SELECT unnest(ARRAY['persone','richieste','adesioni','ruoli_utente','collegamenti_persone','documenti','certificati_medici','scelte_iscrizione','contatti_emergenza','presenze','edizioni_corsi','iscrizioni_corsi','prenotazioni_corsie','pagamenti','importazioni_batch','importazioni_righe','cda_letture','notifiche']) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.'||obj) AND relrowsecurity) THEN RAISE EXCEPTION 'RLS assente su public.%: interrompere',obj; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='sesto-documenti' AND NOT public) THEN RAISE EXCEPTION 'Bucket sesto-documenti mancante o non privato'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('storage.objects') AND relrowsecurity) THEN RAISE EXCEPTION 'RLS Storage mancante'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('storage.objects') AND polname='file_medico_solo_server' AND NOT polpermissive) THEN RAISE EXCEPTION '0019: protezione Storage medico mancante'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.documenti') AND polname='documento_medico_riservato' AND NOT polpermissive) THEN RAISE EXCEPTION '0019: protezione documenti medici mancante'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ruoli_utente r JOIN auth.users u ON u.id=r.utente_id WHERE r.ruolo='amministratore' AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<now())) THEN RAISE EXCEPTION 'Nessun amministratore attivo: proteggere prima l accesso'; END IF;
 IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
  EXECUTE 'SELECT string_agg(version::text, '', '' ORDER BY version) FROM supabase_migrations.schema_migrations' INTO history;
  RAISE NOTICE 'Versioni registrate da CLI (possono non includere esecuzioni manuali): %',coalesce(history,'nessuna');
 ELSE RAISE NOTICE 'Storico CLI assente: controllo oggetti effettivi, non deduco lo storico manuale';
 END IF;
 RAISE NOTICE 'Baseline 0001-0019: controlli di compatibilita e sicurezza superati';
END;
$sesto_preflight$;

DO $sesto_upgrade$
DECLARE missing integer; badtriggers integer; has_origin boolean; partial boolean;
BEGIN
 SELECT count(*) INTO missing FROM pg_temp.sesto20_expected_functions e
 LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature)
 WHERE p.oid IS NULL OR p.prosrc IS DISTINCT FROM e.source OR p.prosecdef IS DISTINCT FROM e.definer
 OR NOT coalesce('search_path=""'=ANY(p.proconfig),false);
 SELECT count(*) INTO badtriggers FROM pg_temp.sesto20_expected_triggers e
 WHERE NOT EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.'||e.tabella)
   AND t.tgname=e.nome AND t.tgenabled IN ('O','A') AND t.tgfoid=to_regprocedure('public.'||e.funzione||'()'));
 SELECT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scelte_iscrizione'::regclass AND attname='origine' AND attnum>0 AND NOT attisdropped AND atttypid='text'::regtype) INTO has_origin;
 IF missing=0 AND badtriggers=0 AND has_origin THEN
  RAISE NOTICE 'Gestionale 2.0 gia aggiornato: nessuna migrazione rieseguita';
  RETURN;
 END IF;
 SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=ANY(ARRAY['registra_revisione','correggi_date_revisione','proteggi_lezione_registrata','registra_scelta_verificata','scegli_immagini_verificata','salva_domanda_v20','blocca_incarico_responsabile','verifica_coerenza_direzione','allinea_direttore_responsabile','crea_anteprima_importazione']))
 OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_temp.sesto20_expected_triggers e ON t.tgname=e.nome AND t.tgrelid=to_regclass('public.'||e.tabella))
 OR EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scelte_iscrizione'::regclass AND attname='origine' AND attnum>0 AND NOT attisdropped)
 OR EXISTS(SELECT 1 FROM pg_temp.sesto20_expected_functions e JOIN pg_proc p ON p.oid=to_regprocedure(e.signature) WHERE p.prosrc=e.source)
 OR EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.modifica_lezione_e_corsie(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text,text)') AND (strpos(p.prosrc,'P3505')>0 OR strpos(p.prosrc,'sesto:corsia:')>0))
 INTO partial;
 IF partial THEN RAISE EXCEPTION 'Schema 2.0 parziale o divergente. Nessuna modifica. Verificare le migrazioni gia applicate prima di continuare.'; END IF;

  RAISE NOTICE 'Applico 20261126160000_registra_revisione.sql';
  EXECUTE $sesto_ddl$-- Serializza i nuovi interventi della stessa attrezzatura. Usa RLS e trigger esistenti.
create or replace function public.registra_revisione(
  p_richiesta uuid, p_attrezzatura uuid, p_data date, p_prossimo date,
  p_tipo text, p_esito text, p_costo numeric, p_note text, p_distinta boolean
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  precedente public.revisioni_attrezzature%rowtype;
begin
  if not coalesce(public.is_staff(), false) then
    raise exception using errcode='42501', message='Permesso insufficiente';
  end if;
  if p_richiesta is null or p_data is null or p_data > (now() at time zone 'Europe/Rome')::date
    or p_prossimo < p_data or nullif(btrim(p_tipo),'') is null or p_costo < 0
    or p_costo is distinct from round(p_costo, 2) then
    raise exception using errcode='22023', message='Dati intervento non validi';
  end if;
  perform 1 from public.attrezzature where id=p_attrezzatura for update;
  if not found then
    raise exception using errcode='P3501', message='Attrezzatura non disponibile';
  end if;
  select * into precedente from public.revisioni_attrezzature where id=p_richiesta;
  if found then
    if (precedente.attrezzatura_id, precedente.data_intervento, precedente.prossimo_intervento,
        precedente.tipo, precedente.esito, precedente.costo, precedente.note)
       is not distinct from (p_attrezzatura,p_data,p_prossimo,p_tipo,p_esito,p_costo,p_note) then
      return precedente.id;
    end if;
    raise exception using errcode='P3502', message='Richiesta già utilizzata';
  end if;
  if not coalesce(p_distinta,false) and exists (
    select 1 from public.revisioni_attrezzature
    where attrezzatura_id=p_attrezzatura and data_intervento=p_data
      and lower(btrim(tipo))=lower(btrim(p_tipo))
      and prossimo_intervento is not distinct from p_prossimo
  ) then
    raise exception using errcode='P3503', message='Intervento simile già registrato';
  end if;
  insert into public.revisioni_attrezzature(id,attrezzatura_id,data_intervento,prossimo_intervento,tipo,esito,costo,note)
    values(p_richiesta,p_attrezzatura,p_data,p_prossimo,p_tipo,p_esito,p_costo,p_note);
  return p_richiesta;
end;
$$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.registra_revisione(uuid,uuid,date,date,text,text,numeric,text,boolean) from public, anon;$sesto_ddl$;
  EXECUTE $sesto_ddl$
grant execute on function public.registra_revisione(uuid,uuid,date,date,text,text,numeric,text,boolean) to authenticated;$sesto_ddl$;
  EXECUTE $sesto_ddl$

-- Correzioni delle date con provenienza verificabile. Un intervallo o una
-- scadenza storica mancante non si possono ricostruire dalla sola anagrafica.
create or replace function public.correggi_date_revisione()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  scheda public.attrezzature%rowtype;
begin
  if new.attrezzatura_id is distinct from old.attrezzatura_id then
    raise exception using errcode='P3504', message='Attrezzatura storica non riassegnabile';
  end if;
  if (new.data_intervento,new.prossimo_intervento) is not distinct from
     (old.data_intervento,old.prossimo_intervento) then return new; end if;
  if new.data_intervento > (now() at time zone 'Europe/Rome')::date or
     new.prossimo_intervento < new.data_intervento then
    raise exception using errcode='22023', message='Date intervento non valide';
  end if;
  select * into strict scheda from public.attrezzature where id=new.attrezzatura_id for update;
  if greatest(old.data_intervento,new.data_intervento) < scheda.ultima_revisione then
    -- La scadenza è attribuibile a un intervento successivo o resta non documentata.
    if (old.prossimo_intervento is null and new.prossimo_intervento is null) or
       exists (select 1 from public.revisioni_attrezzature r where r.attrezzatura_id=scheda.id
         and r.data_intervento=scheda.ultima_revisione and r.prossimo_intervento=scheda.prossima_revisione) then
      return new;
    end if;
  elsif old.data_intervento=scheda.ultima_revisione and new.data_intervento>=old.data_intervento
    and not exists (select 1 from public.revisioni_attrezzature r where r.attrezzatura_id=scheda.id
      and r.id<>old.id and r.data_intervento>=old.data_intervento)
    and (old.prossimo_intervento is null or old.prossimo_intervento=scheda.prossima_revisione)
    and (new.prossimo_intervento is not null or old.prossimo_intervento is null) then
    update public.attrezzature set ultima_revisione=new.data_intervento,
      prossima_revisione=coalesce(new.prossimo_intervento,prossima_revisione) where id=scheda.id;
    return new;
  end if;
  raise exception using errcode='P3504', message='Le date richiedono verifica dello storico';
end;
$$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
create trigger correggi_date_revisione before update of attrezzatura_id,data_intervento,prossimo_intervento
  on public.revisioni_attrezzature for each row execute function public.correggi_date_revisione();$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.correggi_date_revisione() from public,anon;$sesto_ddl$;

  RAISE NOTICE 'Applico 20261126162500_proteggi_prenotazioni_parziali.sql';
  EXECUTE $sesto_ddl$
create or replace function public.modifica_lezione_e_corsie(
 p_lezione uuid, p_titolo text, p_inizio timestamptz, p_fine timestamptz,
 p_piscina uuid, p_corsie uuid[], p_esercizi text, p_materiale text, p_note text
) returns void language plpgsql security invoker set search_path = '' as $$
declare v_lezione record; v_corsia uuid; v_num integer;
begin
 if not (select public.is_staff()) then raise exception 'Operazione non autorizzata'; end if;
 if p_titolo is null or length(btrim(p_titolo))<1 or length(p_titolo)>160 or
    p_inizio is null or p_fine is null or p_fine<=p_inizio then
  raise exception 'Titolo o intervallo orario non valido';
 end if;
 if length(coalesce(p_esercizi,''))>2000 or length(coalesce(p_materiale,''))>1000 or
    length(coalesce(p_note,''))>2000 then
  raise exception 'Descrizione troppo lunga';
 end if;
 if coalesce(cardinality(p_corsie),0)>20 or
    (coalesce(cardinality(p_corsie),0)>0 and p_piscina is null) then
  raise exception 'Piscina obbligatoria per le corsie; massimo venti corsie';
 end if;
 select count(*) into v_num from (select distinct unnest(p_corsie)) s;
 if v_num<>coalesce(cardinality(p_corsie),0) then raise exception 'Corsie duplicate'; end if;
 select l.id,l.annullata_il,l.inizio as orario_inizio,l.fine as orario_fine,e.inizio as data_inizio,e.fine as data_fine,e.stato
 into v_lezione from public.lezioni l join public.edizioni_corsi e on e.id=l.edizione_id
 where l.id=p_lezione for update of l;
 if not found or v_lezione.annullata_il is not null then raise exception 'Lezione inesistente o annullata'; end if;
 if v_lezione.stato not in ('programmato','attivo') then
  raise exception 'Il corso non consente modifiche';
 end if;
 if (p_inizio at time zone 'Europe/Rome')::date<v_lezione.data_inizio or
    (p_fine at time zone 'Europe/Rome')::date>v_lezione.data_fine then
  raise exception 'Lezione fuori dalle date del corso';
 end if;
 if exists(select 1 from public.presenze where lezione_id=p_lezione) then
  raise exception 'Lezione con presenze: non spostabile senza rettifica amministrativa';
 end if;
 -- Il flusso guidato ricostruisce le corsie sull'intera durata della lezione.
 -- Non deve alterare implicitamente una prenotazione parziale storica.
 if exists(select 1 from public.prenotazioni_corsie
   where lezione_id=p_lezione and stato='confermata'
     and (inizio<>v_lezione.orario_inizio or fine<>v_lezione.orario_fine)) then
   raise exception using errcode='P3505', message='Prenotazione parziale da verificare prima della modifica guidata';
 end if;
 -- Dapprima disattiva tutti i vincoli di occupazione della lezione.
 update public.prenotazioni_corsie set stato='annullata'
 where lezione_id=p_lezione and stato='confermata';
 update public.lezioni set titolo=btrim(p_titolo),inizio=p_inizio,fine=p_fine,
 piscina_id=p_piscina,esercizi=p_esercizi,materiale=p_materiale,note=p_note
 where id=p_lezione;
 foreach v_corsia in array coalesce(p_corsie,'{}'::uuid[]) loop
  insert into public.prenotazioni_corsie(lezione_id,corsia_id,inizio,fine,stato)
  values(p_lezione,v_corsia,p_inizio,p_fine,'confermata')
  on conflict (lezione_id,corsia_id) do update set
   inizio=excluded.inizio,fine=excluded.fine,stato='confermata';
 end loop;
end; $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.modifica_lezione_e_corsie(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text,text) from public,anon;$sesto_ddl$;
  EXECUTE $sesto_ddl$
grant execute on function public.modifica_lezione_e_corsie(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text,text) to authenticated;$sesto_ddl$;

  RAISE NOTICE 'Applico 20261126163000_coerenza_lezioni_presenze.sql';
  EXECUTE $sesto_ddl$
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
end; $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.verifica_presenza() from public,anon,authenticated;$sesto_ddl$;
  EXECUTE $sesto_ddl$

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
end; $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
create trigger proteggi_lezione_registrata before update of edizione_id,inizio,fine,piscina_id,annullata_il
 on public.lezioni for each row execute function public.proteggi_lezione_registrata();$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.proteggi_lezione_registrata() from public,anon,authenticated;$sesto_ddl$;
  EXECUTE $sesto_ddl$

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
end; $$;$sesto_ddl$;

  RAISE NOTICE 'Applico 20261126163410_dichiarazioni_verificate.sql';
  EXECUTE $sesto_ddl$
alter table public.scelte_iscrizione add column origine text
 check(origine in ('registrazione','domanda','profilo'));$sesto_ddl$;
  EXECUTE $sesto_ddl$
create or replace function public.scelte_alla_registrazione() returns trigger language plpgsql security definer set search_path='' as $$
declare m jsonb:=new.raw_user_meta_data;
begin
 if m->>'presa_visione'='si' and length(m->>'versione_privacy') between 1 and 200 then
  insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione,origine) values(new.id,'privacy',true,m->>'versione_privacy','registrazione');
  if m->>'immagini' in ('si','no') and length(m->>'versione_immagini') between 1 and 200 then
   insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione,origine) values(new.id,'immagini',m->>'immagini'='si',m->>'versione_immagini','registrazione');
  end if;
 end if;
 return new;
end $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
-- Solo le nuove UI usano la versione confrontata e il lock esistente.
-- Un rifiuto/revoca intervenuti dopo l'apertura del modulo non vengono sovrascritti.
create function public.registra_scelta_verificata(
 p_scelta boolean,p_versione text,p_scelta_attesa bigint,p_origine text
) returns void language plpgsql security definer set search_path='' as $$
declare precedente public.scelte_iscrizione%rowtype;
begin
 if not public.account_corrente_abilitato() or p_scelta is null or
 length(btrim(coalesce(p_versione,''))) not between 1 and 200 or
 p_origine not in ('domanda','profilo') then
  raise exception 'Scelta non valida' using errcode='23514';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,19));
 select * into precedente from public.scelte_iscrizione where utente_id=auth.uid() and tipo='immagini' order by id desc limit 1;
 if precedente.id is distinct from p_scelta_attesa then
  -- Un retry identico dopo un commit già riuscito non aggiunge una riga.
  if (precedente.scelta,precedente.versione) is not distinct from (p_scelta,p_versione) then return; end if;
  raise exception 'Scelta modificata dopo apertura del modulo' using errcode='P3508';
 end if;
 if (precedente.scelta,precedente.versione) is distinct from (p_scelta,p_versione) then
  insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione,origine)
   values(auth.uid(),'immagini',p_scelta,p_versione,p_origine);
 end if;
end $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.registra_scelta_verificata(boolean,text,bigint,text) from public,anon,authenticated;$sesto_ddl$;
  EXECUTE $sesto_ddl$

create function public.scegli_immagini_verificata(p_scelta boolean,p_versione text,p_scelta_attesa bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.registra_scelta_verificata(p_scelta,p_versione,p_scelta_attesa,'profilo');
end $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.scegli_immagini_verificata(boolean,text,bigint) from public,anon;$sesto_ddl$;
  EXECUTE $sesto_ddl$
grant execute on function public.scegli_immagini_verificata(boolean,text,bigint) to authenticated;$sesto_ddl$;
  EXECUTE $sesto_ddl$

create function public.salva_domanda_v20(
 p_nome text,p_cognome text,p_data_nascita date,p_luogo_nascita text,p_codice_fiscale text,p_indirizzo text,p_cap text,p_comune text,p_telefono text,
 p_nome_tutore text,p_cognome_tutore text,p_parentela_tutore text,p_flag_statuto boolean,p_flag_privacy boolean,p_flag_immagini boolean,
 p_versione_statuto text,p_versione_privacy text,p_invia boolean,p_provincia_nascita text,p_stato_nascita text,p_sesso_cf text,
 p_versione_immagini text,p_emergenza_nome text,p_emergenza_telefono text,p_scelta_attesa bigint
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_prior public.richieste%rowtype; v_test boolean;
begin
 if not public.account_corrente_abilitato() then raise exception 'Accesso negato' using errcode='42501'; end if;
 v_test:=coalesce(p_versione_statuto like 'TEST-COLLAUDO-%',false);
 if v_test is distinct from coalesce(p_versione_privacy like 'TEST-COLLAUDO-%',false)
 or v_test is distinct from coalesce(p_versione_immagini like 'TEST-COLLAUDO-%',false) then
  raise exception 'Dichiarazioni di modalita diversa' using errcode='P3509';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,19));
 select * into v_prior from public.richieste where utente_id=auth.uid();
 if found and (v_prior.versione_statuto is not null or v_prior.versione_privacy is not null)
 and (coalesce(v_prior.versione_statuto like 'TEST-COLLAUDO-%',false) or coalesce(v_prior.versione_privacy like 'TEST-COLLAUDO-%',false)) is distinct from v_test then
  raise exception 'Non convertire pratica reale e collaudo' using errcode='P3509';
 end if;
 perform public.registra_scelta_verificata(p_flag_immagini,p_versione_immagini,p_scelta_attesa,'domanda');
 -- La RPC 0019 conserva tutti i vincoli anagrafici e associativi.
 return public.salva_domanda_v19(p_nome,p_cognome,p_data_nascita,p_luogo_nascita,p_codice_fiscale,p_indirizzo,p_cap,p_comune,p_telefono,p_nome_tutore,p_cognome_tutore,p_parentela_tutore,p_flag_statuto,p_flag_privacy,null,p_versione_statuto,p_versione_privacy,p_invia,p_provincia_nascita,p_stato_nascita,p_sesso_cf,p_versione_immagini,p_emergenza_nome,p_emergenza_telefono);
end $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.salva_domanda_v20(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text,text,text,bigint) from public,anon;$sesto_ddl$;
  EXECUTE $sesto_ddl$
grant execute on function public.salva_domanda_v20(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text,text,text,bigint) to authenticated;$sesto_ddl$;

  RAISE NOTICE 'Applico 20261126163420_coerenza_direzione.sql';
  EXECUTE $sesto_ddl$
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
end $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
create trigger blocca_incarico_responsabile before insert or update on public.assegnazioni_istruttori
for each row execute function public.blocca_incarico_responsabile();$sesto_ddl$;
  EXECUTE $sesto_ddl$

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
end $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
create constraint trigger coerenza_direttore after insert or update on public.edizioni_corsi
 deferrable initially deferred for each row execute function public.verifica_coerenza_direzione();$sesto_ddl$;
  EXECUTE $sesto_ddl$
create constraint trigger coerenza_responsabile after insert or update on public.assegnazioni_istruttori
 deferrable initially deferred for each row execute function public.verifica_coerenza_direzione();$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.blocca_incarico_responsabile(),public.verifica_coerenza_direzione() from public,anon,authenticated;$sesto_ddl$;
  EXECUTE $sesto_ddl$

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
end $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.allinea_direttore_responsabile(uuid,uuid,uuid,uuid) from public,anon;$sesto_ddl$;
  EXECUTE $sesto_ddl$
grant execute on function public.allinea_direttore_responsabile(uuid,uuid,uuid,uuid) to authenticated;$sesto_ddl$;

  RAISE NOTICE 'Applico 20261126171000_anteprima_importazione_atomica.sql';
  EXECUTE $sesto_ddl$
create function public.crea_anteprima_importazione(p_tipo text,p_base_documentale boolean,p_righe jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_batch uuid; v_n integer;
begin
 if not public.is_staff() or auth.uid() is null then
  raise exception using errcode='42501',message='Operazione non autorizzata';
 end if;
 if p_tipo is null or p_tipo not in ('soci','corsi') or p_base_documentale is null or
    (p_tipo='corsi' and p_base_documentale) or jsonb_typeof(p_righe) is distinct from 'array' then
  raise exception using errcode='22023',message='Importazione non valida';
 end if;
 v_n:=jsonb_array_length(p_righe);
 if v_n not between 1 and 1000 or octet_length(p_righe::text)>4000000 then
  raise exception using errcode='22023',message='Dimensione anteprima non valida';
 end if;
 if exists(select 1 from jsonb_array_elements(p_righe) as r(value)
   where jsonb_typeof(r.value) is distinct from 'object'
      or jsonb_typeof(r.value->'dati') is distinct from 'object'
      or jsonb_typeof(r.value->'errori') is distinct from 'array') then
  raise exception using errcode='22023',message='Riga anteprima non valida';
 end if;
 insert into public.importazioni_batch(tipo,creato_da,base_documentale_verificata)
 values(p_tipo,auth.uid(),p_base_documentale) returning id into v_batch;
 insert into public.importazioni_righe(batch_id,numero,dati,errori)
 select v_batch,(r.ord+1)::integer,r.value->'dati',r.value->'errori'
 from jsonb_array_elements(p_righe) with ordinality as r(value,ord);
 return v_batch;
end $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$
revoke all on function public.crea_anteprima_importazione(text,boolean,jsonb) from public,anon;$sesto_ddl$;
  EXECUTE $sesto_ddl$
grant execute on function public.crea_anteprima_importazione(text,boolean,jsonb) to authenticated;$sesto_ddl$;

  RAISE NOTICE 'Applico 20261126172500_serializza_prenotazioni_guidate.sql';
  EXECUTE $sesto_ddl$
create or replace function public.crea_lezione_guidata(
 p_edizione uuid,
 p_titolo text,
 p_inizio timestamptz,
 p_fine timestamptz,
 p_piscina uuid,
 p_corsie uuid[],
 p_esercizi text,
 p_materiale text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_lezione uuid; v_corsia uuid; v_edizione record; v_lock bigint;
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
 -- Acquisizione preventiva e ordinata per chiave, prima di scrivere prenotazioni.
 for v_lock in select distinct pg_catalog.hashtextextended('sesto:corsia:'||corsia::text,0) from unnest(coalesce(p_corsie,'{}'::uuid[])) as u(corsia) where corsia is not null order by 1 loop
  perform pg_catalog.pg_advisory_xact_lock(v_lock);
 end loop;
 insert into public.lezioni(edizione_id,titolo,inizio,fine,piscina_id,esercizi,materiale)
 values(p_edizione,btrim(p_titolo),p_inizio,p_fine,p_piscina,p_esercizi,p_materiale)
 returning id into v_lezione;
 foreach v_corsia in array coalesce(p_corsie,'{}'::uuid[]) loop
  insert into public.prenotazioni_corsie(lezione_id,corsia_id,inizio,fine,stato)
  values(v_lezione,v_corsia,p_inizio,p_fine,'confermata');
 end loop;
 return v_lezione;
end; $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$

create or replace function public.modifica_lezione_e_corsie(
 p_lezione uuid, p_titolo text, p_inizio timestamptz, p_fine timestamptz,
 p_piscina uuid, p_corsie uuid[], p_esercizi text, p_materiale text, p_note text
) returns void language plpgsql security invoker set search_path = '' as $$
declare v_lezione record; v_corsia uuid; v_num integer; v_lock bigint;
begin
 if not (select public.is_staff()) then raise exception 'Operazione non autorizzata'; end if;
 if p_titolo is null or length(btrim(p_titolo))<1 or length(p_titolo)>160 or
    p_inizio is null or p_fine is null or p_fine<=p_inizio then
  raise exception 'Titolo o intervallo orario non valido';
 end if;
 if length(coalesce(p_esercizi,''))>2000 or length(coalesce(p_materiale,''))>1000 or
    length(coalesce(p_note,''))>2000 then
  raise exception 'Descrizione troppo lunga';
 end if;
 if coalesce(cardinality(p_corsie),0)>20 or
    (coalesce(cardinality(p_corsie),0)>0 and p_piscina is null) then
  raise exception 'Piscina obbligatoria per le corsie; massimo venti corsie';
 end if;
 select count(*) into v_num from (select distinct unnest(p_corsie)) s;
 if v_num<>coalesce(cardinality(p_corsie),0) then raise exception 'Corsie duplicate'; end if;
 select l.id,l.annullata_il,l.inizio as orario_inizio,l.fine as orario_fine,e.inizio as data_inizio,e.fine as data_fine,e.stato
 into v_lezione from public.lezioni l join public.edizioni_corsi e on e.id=l.edizione_id
 where l.id=p_lezione for update of l;
 if not found or v_lezione.annullata_il is not null then raise exception 'Lezione inesistente o annullata'; end if;
 if v_lezione.stato not in ('programmato','attivo') then
  raise exception 'Il corso non consente modifiche';
 end if;
 if (p_inizio at time zone 'Europe/Rome')::date<v_lezione.data_inizio or
    (p_fine at time zone 'Europe/Rome')::date>v_lezione.data_fine then
  raise exception 'Lezione fuori dalle date del corso';
 end if;
 if exists(select 1 from public.presenze where lezione_id=p_lezione) then
  raise exception 'Lezione con presenze: non spostabile senza rettifica amministrativa';
 end if;
 -- Il flusso guidato ricostruisce le corsie sull'intera durata della lezione.
 -- Non deve alterare implicitamente una prenotazione parziale storica.
 if exists(select 1 from public.prenotazioni_corsie
   where lezione_id=p_lezione and stato='confermata'
     and (inizio<>v_lezione.orario_inizio or fine<>v_lezione.orario_fine)) then
   raise exception using errcode='P3505', message='Prenotazione parziale da verificare prima della modifica guidata';
 end if;
 -- Acquisizione preventiva e ordinata per chiave, prima di scrivere prenotazioni.
 for v_lock in select distinct pg_catalog.hashtextextended('sesto:corsia:'||corsia::text,0) from (select unnest(coalesce(p_corsie,'{}'::uuid[])) as corsia union select corsia_id from public.prenotazioni_corsie where lezione_id=p_lezione and stato='confermata') as u where corsia is not null order by 1 loop
  perform pg_catalog.pg_advisory_xact_lock(v_lock);
 end loop;
 -- Dapprima disattiva tutti i vincoli di occupazione della lezione.
 update public.prenotazioni_corsie set stato='annullata'
 where lezione_id=p_lezione and stato='confermata';
 update public.lezioni set titolo=btrim(p_titolo),inizio=p_inizio,fine=p_fine,
 piscina_id=p_piscina,esercizi=p_esercizi,materiale=p_materiale,note=p_note
 where id=p_lezione;
 foreach v_corsia in array coalesce(p_corsie,'{}'::uuid[]) loop
  insert into public.prenotazioni_corsie(lezione_id,corsia_id,inizio,fine,stato)
  values(p_lezione,v_corsia,p_inizio,p_fine,'confermata')
  on conflict (lezione_id,corsia_id) do update set
   inizio=excluded.inizio,fine=excluded.fine,stato='confermata';
 end loop;
end; $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$

create or replace function public.annulla_lezione_guidata(p_lezione uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_lock bigint;
begin
 if not (select public.is_staff()) then raise exception 'Operazione non autorizzata'; end if;
 select id into v_id from public.lezioni where id=p_lezione and annullata_il is null for update;
 if v_id is null then raise exception 'Lezione inesistente o già annullata'; end if;
 if exists(select 1 from public.presenze where lezione_id=p_lezione) then
  raise exception 'Non si annullano lezioni con presenze registrate';
 end if;
 -- Acquisizione preventiva e ordinata per chiave, prima di scrivere prenotazioni.
 for v_lock in select distinct pg_catalog.hashtextextended('sesto:corsia:'||corsia::text,0) from (select corsia_id as corsia from public.prenotazioni_corsie where lezione_id=p_lezione and stato='confermata') as u order by 1 loop
  perform pg_catalog.pg_advisory_xact_lock(v_lock);
 end loop;
 update public.prenotazioni_corsie set stato='annullata'
 where lezione_id=p_lezione and stato='confermata';
 update public.lezioni set annullata_il=now() where id=p_lezione;
end; $$;$sesto_ddl$;
  EXECUTE $sesto_ddl$

create or replace function public.valida_prenotazione_corsia()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_pool uuid; v_start timestamptz; v_end timestamptz; v_annullata timestamptz; v_lane_pool uuid; v_lock bigint;
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
 -- Anche l'inserimento diretto di una prenotazione confermata usa la stessa chiave.
 if new.stato='confermata' then
   v_lock:=pg_catalog.hashtextextended('sesto:corsia:'||new.corsia_id::text,0);
   perform pg_catalog.pg_advisory_xact_lock(v_lock);
 end if;
 return new;
end; $$;$sesto_ddl$;
END;
$sesto_upgrade$;

DO $sesto_postflight$
DECLARE e record;
BEGIN
 FOR e IN SELECT * FROM pg_temp.sesto20_expected_functions LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(e.signature) AND p.prosrc=e.source AND p.prosecdef=e.definer AND 'search_path=""'=ANY(p.proconfig)) THEN RAISE EXCEPTION 'Verifica funzione fallita: %',e.signature; END IF;
 END LOOP;
 FOR e IN SELECT * FROM pg_temp.sesto20_expected_triggers LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.'||e.tabella) AND t.tgname=e.nome AND t.tgenabled IN ('O','A') AND t.tgfoid=to_regprocedure('public.'||e.funzione||'()')) THEN RAISE EXCEPTION 'Verifica trigger fallita: %',e.nome; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.scelte_iscrizione'::regclass AND attname='origine' AND atttypid='text'::regtype AND NOT attisdropped) THEN RAISE EXCEPTION 'Colonna origine mancante'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.scelte_iscrizione'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%origine%' AND pg_get_constraintdef(oid) LIKE '%registrazione%' AND pg_get_constraintdef(oid) LIKE '%domanda%' AND pg_get_constraintdef(oid) LIKE '%profilo%') THEN RAISE EXCEPTION 'Vincolo origine mancante'; END IF;
 FOR e IN SELECT * FROM pg_temp.sesto20_expected_functions WHERE split_part(split_part(signature,'(',1),'.',2)=ANY(ARRAY['registra_revisione','scegli_immagini_verificata','salva_domanda_v20','allinea_direttore_responsabile','crea_anteprima_importazione','crea_lezione_guidata','modifica_lezione_e_corsie','annulla_lezione_guidata']) LOOP
  IF NOT has_function_privilege('authenticated',to_regprocedure(e.signature),'EXECUTE') OR has_function_privilege('anon',to_regprocedure(e.signature),'EXECUTE') THEN RAISE EXCEPTION 'Permessi RPC non conformi: %',e.signature; END IF;
 END LOOP;
 RAISE NOTICE 'Verifica finale: 7 migrazioni 2.0 presenti; 16 funzioni e 5 trigger verificati';
END;
$sesto_postflight$;

-- Ricarica la cache schema PostgREST dopo il commit.
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Risultato atteso: OK. Conteggi aggregati, nessuna anagrafica o dato sensibile.
SELECT 'OK - GESTIONALE 2.0: SCHEMA AGGIORNATO E VERIFICATO' AS esito,
 (SELECT count(*) FROM public.persone) AS persone_conservate,
 (SELECT count(*) FROM auth.users) AS account_conservati,
 (SELECT count(*) FROM public.edizioni_corsi) AS edizioni_conservate,
 (SELECT count(*) FROM public.pagamenti) AS pagamenti_conservati,
 (SELECT count(*) FROM public.documenti) AS documenti_conservati;
