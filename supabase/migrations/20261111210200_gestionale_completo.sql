-- SESTO CONTINENTE - Migrazione incrementale Fase 2
-- Eseguire DOPO 0001_fase1.sql, una sola volta, su una copia di test.
-- Nessuna eliminazione o modifica distruttiva delle pratiche già esistenti.
create extension if not exists btree_gist;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.ruoli_utente where utente_id=(select auth.uid()) and ruolo='amministratore'::public.ruolo_app);
$$;
create or replace function public.is_instructor()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.ruoli_utente where utente_id=(select auth.uid()) and ruolo='istruttore'::public.ruolo_app);
$$;
create or replace function public.owns_person(p_persona uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.collegamenti_persone where persona_id=p_persona and utente_id=(select auth.uid()));
$$;

-- Consente rettifiche operative agli utenti della segreteria, senza accesso pubblico in scrittura.
create policy persone_staff_ins on public.persone for insert to authenticated with check ((select public.is_staff()));
create policy persone_staff_upd on public.persone for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy adesioni_staff_ins on public.adesioni for insert to authenticated with check ((select public.is_staff()));
create policy adesioni_staff_upd on public.adesioni for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy stagioni_admin_ins on public.stagioni for insert to authenticated with check ((select public.is_admin()));
create policy stagioni_admin_upd on public.stagioni for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy ruoli_admin_ins on public.ruoli_utente for insert to authenticated with check ((select public.is_admin()));
create policy ruoli_admin_del on public.ruoli_utente for delete to authenticated using ((select public.is_admin()));

create table public.programmi_didattici (
 id uuid primary key default gen_random_uuid(), titolo text not null unique,
 tipo text not null check(tipo in ('ARA','APNEA','NUOTO_LIBERO')),
 descrizione text, creato_il timestamptz not null default now()
);
create table public.versioni_programmi (
 id uuid primary key default gen_random_uuid(), programma_id uuid not null references public.programmi_didattici(id),
 versione integer not null check(versione>0), obiettivi text, teoria text, pratica text,
 sequenza_lezioni text, durata_ore numeric(6,2) check(durata_ore>=0), verifiche text,
 stato text not null default 'bozza' check(stato in ('bozza','approvato','archiviato')),
 creato_il timestamptz not null default now(), unique(programma_id,versione)
);
create table public.corsi (
 id uuid primary key default gen_random_uuid(), nome text not null,
 tipo text not null check(tipo in ('ARA','APNEA','NUOTO_LIBERO')),
 livello smallint check(livello between 1 and 5), descrizione text,
 creato_il timestamptz not null default now(),
 constraint livello_ara check(tipo <> 'ARA' or livello is not null)
);
create table public.edizioni_corsi (
 id uuid primary key default gen_random_uuid(), corso_id uuid not null references public.corsi(id),
 stagione_id uuid not null references public.stagioni(id),
 nome text not null, inizio date not null, fine date not null,
 massimo_partecipanti integer not null default 20 check(massimo_partecipanti > 0),
 stato text not null default 'programmato' check(stato in ('programmato','attivo','concluso','annullato')),
 programma_versione_id uuid references public.versioni_programmi(id),
 note text, creato_il timestamptz not null default now(), check(fine>=inizio)
);
create table public.iscrizioni_corsi (
 id uuid primary key default gen_random_uuid(), edizione_id uuid not null references public.edizioni_corsi(id),
 persona_id uuid not null references public.persone(id),
 stato text not null default 'in_attesa' check(stato in ('in_attesa','iscritto','ritirato','concluso','respinto')),
 iscritta_il timestamptz not null default now(), note text,
 unique(edizione_id,persona_id)
);
create table public.qualifiche_istruttori (
 id uuid primary key default gen_random_uuid(), persona_id uuid not null references public.persone(id),
 titolo text not null, ente text, numero_brevetto text, conseguito_il date, scade_il date,
 note text, check(scade_il is null or conseguito_il is null or scade_il>=conseguito_il)
);
create table public.assegnazioni_istruttori (
 id uuid primary key default gen_random_uuid(), edizione_id uuid not null references public.edizioni_corsi(id),
 persona_id uuid not null references public.persone(id),
 ruolo text not null check(ruolo in ('responsabile','aiuto')),
 unique(edizione_id,persona_id)
);
create unique index uno_responsabile_per_corso on public.assegnazioni_istruttori(edizione_id) where ruolo='responsabile';
create table public.brevetti_allievi (
 id uuid primary key default gen_random_uuid(), persona_id uuid not null references public.persone(id),
 titolo text not null, ente text, numero_brevetto text, ottenuto_il date, scade_il date,
 note text
);
create table public.certificati_medici (
 id uuid primary key default gen_random_uuid(), persona_id uuid not null references public.persone(id),
 rilasciato_il date not null, scade_il date not null, idoneita_verificata boolean not null default false,
 note_amministrative text, creato_il timestamptz not null default now(), check(scade_il>=rilasciato_il)
);

create or replace function public.insegna_edizione(p_edizione uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.assegnazioni_istruttori a
   join public.collegamenti_persone cp on cp.persona_id=a.persona_id
   where cp.utente_id=(select auth.uid()) and a.edizione_id=p_edizione);
$$;
create or replace function public.iscritto_edizione(p_edizione uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.iscrizioni_corsi i
 join public.collegamenti_persone cp on cp.persona_id=i.persona_id
 where cp.utente_id=(select auth.uid()) and i.edizione_id=p_edizione
 and i.stato in ('iscritto','concluso'));
$$;

create table public.piscine (
 id uuid primary key default gen_random_uuid(), nome text not null, indirizzo text,
 orari_disponibili text, limitazioni text, note text
);
create table public.corsie (
 id uuid primary key default gen_random_uuid(), piscina_id uuid not null references public.piscine(id),
 numero integer not null check(numero>0), note text, unique(piscina_id,numero)
);
create table public.lezioni (
 id uuid primary key default gen_random_uuid(), edizione_id uuid not null references public.edizioni_corsi(id),
 titolo text not null, inizio timestamptz not null, fine timestamptz not null,
 piscina_id uuid references public.piscine(id), esercizi text, materiale text,
 note text, check(fine>inizio)
);
create table public.prenotazioni_corsie (
 id uuid primary key default gen_random_uuid(), lezione_id uuid not null references public.lezioni(id),
 corsia_id uuid not null references public.corsie(id),
 inizio timestamptz not null, fine timestamptz not null,
 stato text not null default 'confermata' check(stato in ('confermata','annullata')),
 check(fine>inizio), unique(lezione_id,corsia_id),
 exclude using gist (corsia_id with =, tstzrange(inizio,fine,'[)') with &&) where (stato='confermata')
);
create or replace function public.valida_prenotazione_corsia()
returns trigger language plpgsql set search_path = '' as $$
declare v_pool uuid; v_start timestamptz; v_end timestamptz; v_lane_pool uuid;
begin
 select piscina_id,inizio,fine into v_pool,v_start,v_end from public.lezioni where id=new.lezione_id;
 select piscina_id into v_lane_pool from public.corsie where id=new.corsia_id;
 if v_pool is distinct from v_lane_pool or new.inizio<v_start or new.fine>v_end then
   raise exception 'Corsia non appartenente alla piscina o orario fuori dalla lezione';
 end if;
 return new;
end; $$;
create trigger prenotazione_coerente before insert or update on public.prenotazioni_corsie
for each row execute function public.valida_prenotazione_corsia();
create table public.presenze (
 id uuid primary key default gen_random_uuid(), lezione_id uuid not null references public.lezioni(id),
 persona_id uuid not null references public.persone(id),
 presente boolean, nota_didattica text, registrata_il timestamptz not null default now(),
 unique(lezione_id,persona_id)
);
create or replace function public.verifica_presenza()
returns trigger language plpgsql set search_path = '' as $$
begin
 if not exists(select 1 from public.lezioni l join public.iscrizioni_corsi i on i.edizione_id=l.edizione_id
               where l.id=new.lezione_id and i.persona_id=new.persona_id and i.stato in ('iscritto','concluso')) then
   raise exception 'La persona non risulta iscritta a questa lezione';
 end if;
 return new;
end; $$;
create trigger verifica_presenza_trigger before insert or update on public.presenze
for each row execute function public.verifica_presenza();

create or replace function public.verifica_capienza_corso()
returns trigger language plpgsql set search_path = '' as $$
declare v_max integer; v_count integer;
begin
 if new.stato='iscritto' then
   select massimo_partecipanti into v_max from public.edizioni_corsi where id=new.edizione_id for update;
   select count(*) into v_count from public.iscrizioni_corsi
   where edizione_id=new.edizione_id and stato='iscritto' and id<>new.id;
   if v_count>=v_max then raise exception 'Capienza massima del corso raggiunta'; end if;
 end if;
 return new;
end; $$;
create trigger verifica_capienza_trigger before insert or update of stato,edizione_id on public.iscrizioni_corsi
for each row execute function public.verifica_capienza_corso();

create table public.attrezzature (
 id uuid primary key default gen_random_uuid(), codice text not null unique,
 categoria text not null, marca text, modello text, matricola text,
 acquistata_il date, stato text not null default 'disponibile'
 check(stato in ('disponibile','assegnata','in_manutenzione','fuori_servizio')),
 ultima_revisione date, prossima_revisione date, note text
);
create table public.revisioni_attrezzature (
 id uuid primary key default gen_random_uuid(), attrezzatura_id uuid not null references public.attrezzature(id),
 data_intervento date not null, prossimo_intervento date, tipo text not null,
 esito text, costo numeric(12,2) check(costo>=0), note text
);
create table public.assegnazioni_attrezzature (
 id uuid primary key default gen_random_uuid(), attrezzatura_id uuid not null references public.attrezzature(id),
 persona_id uuid references public.persone(id), edizione_id uuid references public.edizioni_corsi(id),
 assegnata_il date not null, restituita_il date,
 note text, check (persona_id is not null or edizione_id is not null),
 check (restituita_il is null or restituita_il>=assegnata_il)
);
create unique index unica_assegnazione_attiva on public.assegnazioni_attrezzature(attrezzatura_id) where restituita_il is null;

create table public.quote_associative (
 id uuid primary key default gen_random_uuid(), persona_id uuid not null references public.persone(id),
 stagione_id uuid not null references public.stagioni(id),
 importo_dovuto numeric(12,2) not null check(importo_dovuto>=0),
 scadenza date, note text, unique(persona_id,stagione_id)
);
create table public.addebiti_corsi (
 id uuid primary key default gen_random_uuid(), iscrizione_id uuid not null unique references public.iscrizioni_corsi(id),
 importo_dovuto numeric(12,2) not null check(importo_dovuto>=0), scadenza date,
 note text
);
create table public.pagamenti (
 id uuid primary key default gen_random_uuid(), persona_id uuid not null references public.persone(id),
 quota_id uuid references public.quote_associative(id),
 addebito_corso_id uuid references public.addebiti_corsi(id),
 importo numeric(12,2) not null check(importo>0), data_pagamento date not null,
 metodo text not null check(metodo in ('contanti','bonifico','pos','altro')),
 riferimento text, note text, creato_il timestamptz not null default now(),
 constraint un_solo_tipo_pagamento check ((quota_id is not null) <> (addebito_corso_id is not null))
);
create or replace function public.verifica_destinatario_pagamento()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.quota_id is not null and not exists(select 1 from public.quote_associative where id=new.quota_id and persona_id=new.persona_id) then
   raise exception 'Quota non associata a questo socio';
 end if;
 if new.addebito_corso_id is not null and not exists(
  select 1 from public.addebiti_corsi a join public.iscrizioni_corsi i on i.id=a.iscrizione_id
  where a.id=new.addebito_corso_id and i.persona_id=new.persona_id) then
   raise exception 'Corso non associato a questo allievo';
 end if;
 return new;
end; $$;
create trigger pagamento_destinatario before insert on public.pagamenti
for each row execute function public.verifica_destinatario_pagamento();

create table public.movimenti_economici (
 id uuid primary key default gen_random_uuid(), data_movimento date not null,
 tipo text not null check(tipo in ('entrata','uscita')),
 categoria text not null, descrizione text not null,
 importo numeric(12,2) not null check(importo>0), metodo text,
 pagamento_id uuid unique references public.pagamenti(id),
 note text, creato_il timestamptz not null default now()
);
create or replace function public.contabilizza_pagamento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.movimenti_economici(data_movimento,tipo,categoria,descrizione,importo,metodo,pagamento_id)
 values(new.data_pagamento,'entrata',case when new.quota_id is not null then 'Quote associative' else 'Iscrizioni corsi' end,
  'Versamento registrato',new.importo,new.metodo,new.id);
 return new;
end; $$;
create trigger pagamento_contabile after insert on public.pagamenti
for each row execute function public.contabilizza_pagamento();
create or replace view public.saldi_quote with (security_invoker=true) as
 select q.id, q.persona_id, q.stagione_id, q.importo_dovuto,
 coalesce(sum(p.importo),0)::numeric(12,2) as versato,
 greatest(q.importo_dovuto-coalesce(sum(p.importo),0),0)::numeric(12,2) as residuo,
 case when coalesce(sum(p.importo),0)>=q.importo_dovuto then 'pagata'
      when coalesce(sum(p.importo),0)>0 then 'parziale' else 'non_pagata' end as stato
 from public.quote_associative q left join public.pagamenti p on p.quota_id=q.id
 group by q.id;

create table public.documenti (
 id uuid primary key default gen_random_uuid(), nome text not null,
 categoria text not null, ambito text not null check(ambito in ('associazione','personale','didattica','amministrativo')),
 visibilita text not null default 'staff' check(visibilita in ('staff','proprietario','soci','istruttori')),
 utente_id uuid references auth.users(id), persona_id uuid references public.persone(id),
 edizione_id uuid references public.edizioni_corsi(id),
 percorso_storage text not null unique, mime text not null,
 dimensione_bytes bigint not null check(dimensione_bytes between 1 and 10485760),
 caricato_da uuid not null references auth.users(id), caricato_il timestamptz not null default now(),
 constraint documento_personale_owner check(ambito <> 'personale' or utente_id is not null)
);
create table public.comunicazioni (
 id uuid primary key default gen_random_uuid(), titolo text not null, contenuto text not null,
 destinatari text not null check(destinatari in ('tutti','soci','istruttori','staff')),
 pubblicata_il timestamptz not null default now(), attiva boolean not null default true,
 autore_id uuid references auth.users(id)
);
create table public.notifiche (
 id uuid primary key default gen_random_uuid(), utente_id uuid not null references auth.users(id),
 tipo text not null, riferimento text, titolo text not null, messaggio text not null,
 letta_il timestamptz, email_inviata_il timestamptz,
 creata_il timestamptz not null default now(),
 unique(utente_id,tipo,riferimento)
);
create table public.impostazioni_promemoria (
 id uuid primary key default gen_random_uuid(), tipo text not null unique,
 giorni_anticipo int[] not null default '{30,15,7}', attivo boolean not null default true
);
insert into public.impostazioni_promemoria(tipo) values
('certificato_medico'),('quota_associativa'),('brevetto'),('revisione_attrezzatura'),('inizio_corso')
on conflict (tipo) do nothing;

create table public.registro_operazioni (
 id bigint generated always as identity primary key, utente_id uuid,
 tabella text not null, operazione text not null, record_id uuid,
 registrata_il timestamptz not null default now()
);
create or replace function public.registra_operazione()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.registro_operazioni(utente_id,tabella,operazione,record_id)
 values(auth.uid(),tg_table_name,tg_op,case when tg_op='DELETE' then old.id else new.id end);
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;

-- RLS: ogni tabella viene protetta, anche quando nessun ruolo ha una policy di scrittura.
do $$ declare t text; begin
 foreach t in array array[
 'programmi_didattici','versioni_programmi','corsi','edizioni_corsi','iscrizioni_corsi',
 'qualifiche_istruttori','assegnazioni_istruttori','brevetti_allievi','certificati_medici',
 'piscine','corsie','lezioni','prenotazioni_corsie','presenze',
 'attrezzature','revisioni_attrezzature','assegnazioni_attrezzature','quote_associative',
 'addebiti_corsi','pagamenti','movimenti_economici','documenti','comunicazioni',
 'notifiche','impostazioni_promemoria','registro_operazioni'] loop
  execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;

-- Cataloghi consultabili dai soci autenticati, modificabili solo dalla segreteria.
do $$ declare t text; begin
 foreach t in array array['programmi_didattici','versioni_programmi','corsi','piscine','corsie'] loop
  execute format('create policy %I on public.%I for select to authenticated using (true)',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_staff()))',t||'_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))',t||'_update',t);
 end loop;
end $$;
create policy edizioni_read on public.edizioni_corsi for select to authenticated using(true);
create policy edizioni_ins on public.edizioni_corsi for insert to authenticated with check ((select public.is_staff()));
create policy edizioni_upd on public.edizioni_corsi for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy iscrizioni_read on public.iscrizioni_corsi for select to authenticated using (
 (select public.is_staff()) or (select public.owns_person(persona_id)) or (select public.insegna_edizione(edizione_id)));
create policy iscrizioni_ins on public.iscrizioni_corsi for insert to authenticated with check((select public.is_staff()));
create policy iscrizioni_upd on public.iscrizioni_corsi for update to authenticated using((select public.is_staff())) with check((select public.is_staff()));
create policy assegnazioni_read on public.assegnazioni_istruttori for select to authenticated using (
 (select public.is_staff()) or (select public.owns_person(persona_id)) or (select public.iscritto_edizione(edizione_id)));
create policy assegnazioni_ins on public.assegnazioni_istruttori for insert to authenticated with check((select public.is_staff()));
create policy assegnazioni_upd on public.assegnazioni_istruttori for update to authenticated using((select public.is_staff())) with check((select public.is_staff()));

-- Dati personali, brevetti e certificati: solo segreteria o titolare/tutore.
do $$ declare t text; begin
 foreach t in array array['qualifiche_istruttori','brevetti_allievi','certificati_medici'] loop
  execute format('create policy %I on public.%I for select to authenticated using ((select public.is_staff()) or (select public.owns_person(persona_id)))',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_staff()))',t||'_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))',t||'_update',t);
 end loop;
end $$;
create policy lezioni_read on public.lezioni for select to authenticated using (
 (select public.is_staff()) or (select public.insegna_edizione(edizione_id)) or (select public.iscritto_edizione(edizione_id)));
create policy lezioni_ins on public.lezioni for insert to authenticated with check ((select public.is_staff()));
create policy lezioni_upd on public.lezioni for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy prenotazioni_read on public.prenotazioni_corsie for select to authenticated using (
 (select public.is_staff()) or exists(select 1 from public.lezioni l where l.id=lezione_id));
create policy prenotazioni_ins on public.prenotazioni_corsie for insert to authenticated with check ((select public.is_staff()));
create policy prenotazioni_upd on public.prenotazioni_corsie for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy presenze_read on public.presenze for select to authenticated using (
 (select public.is_staff()) or (select public.owns_person(persona_id)) or exists(
 select 1 from public.lezioni l where l.id=lezione_id and (select public.insegna_edizione(l.edizione_id))));
create policy presenze_ins on public.presenze for insert to authenticated with check (
 (select public.is_staff()) or exists(select 1 from public.lezioni l where l.id=lezione_id and (select public.insegna_edizione(l.edizione_id))));
create policy presenze_upd on public.presenze for update to authenticated using (
 (select public.is_staff()) or exists(select 1 from public.lezioni l where l.id=lezione_id and (select public.insegna_edizione(l.edizione_id))))
 with check ((select public.is_staff()) or exists(select 1 from public.lezioni l where l.id=lezione_id and (select public.insegna_edizione(l.edizione_id))));

-- Materiale e attività: lettura istruttori, gestione staff.
do $$ declare t text; begin
 foreach t in array array['attrezzature','revisioni_attrezzature','assegnazioni_attrezzature'] loop
  execute format('create policy %I on public.%I for select to authenticated using ((select public.is_staff()) or (select public.is_instructor()))',t||'_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_staff()))',t||'_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()))',t||'_update',t);
 end loop;
end $$;

create policy quote_read on public.quote_associative for select to authenticated using (
 (select public.is_staff()) or (select public.owns_person(persona_id)));
create policy quote_ins on public.quote_associative for insert to authenticated with check ((select public.is_staff()));
create policy quote_upd on public.quote_associative for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy addebiti_read on public.addebiti_corsi for select to authenticated using (
 (select public.is_staff()) or exists(select 1 from public.iscrizioni_corsi i where i.id=iscrizione_id and (select public.owns_person(i.persona_id))));
create policy addebiti_ins on public.addebiti_corsi for insert to authenticated with check ((select public.is_staff()));
create policy addebiti_upd on public.addebiti_corsi for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy pagamenti_read on public.pagamenti for select to authenticated using (
 (select public.is_staff()) or (select public.owns_person(persona_id)));
create policy pagamenti_ins on public.pagamenti for insert to authenticated with check ((select public.is_staff()));
-- Pagamenti contabilizzati immutabili: eventuali rettifiche vanno gestite separatamente.
create policy movimenti_read on public.movimenti_economici for select to authenticated using ((select public.is_admin()));
create policy movimenti_ins on public.movimenti_economici for insert to authenticated with check ((select public.is_admin()) and pagamento_id is null);
create policy movimenti_upd on public.movimenti_economici for update to authenticated using ((select public.is_admin()) and pagamento_id is null)
 with check ((select public.is_admin()) and pagamento_id is null);

create policy documenti_read on public.documenti for select to authenticated using (
 (select public.is_staff()) or (utente_id=(select auth.uid())) or
 (visibilita='soci' and exists(select 1 from public.ruoli_utente r where r.utente_id=(select auth.uid()) and r.ruolo='socio')) or
 (visibilita='istruttori' and (select public.is_instructor())));
create policy documenti_ins on public.documenti for insert to authenticated with check (
 caricato_da=(select auth.uid()) and
 ((select public.is_staff()) or (utente_id=(select auth.uid()) and ambito='personale' and visibilita='proprietario')));
create policy documenti_upd on public.documenti for update to authenticated using((select public.is_staff())) with check((select public.is_staff()));

-- Storage: bucket privato, documenti autorizzati dalla stessa RLS di metadata.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('sesto-documenti','sesto-documenti',false,10485760,
 array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy sesto_storage_read on storage.objects for select to authenticated using(
 bucket_id='sesto-documenti' and exists(select 1 from public.documenti d where d.percorso_storage=name));
create policy sesto_storage_insert on storage.objects for insert to authenticated with check(
 bucket_id='sesto-documenti' and (storage.foldername(name))[1]=(select auth.uid())::text and
 exists(select 1 from public.documenti d where d.percorso_storage=name and d.caricato_da=(select auth.uid())));
create policy sesto_storage_delete on storage.objects for delete to authenticated using(
 bucket_id='sesto-documenti' and (select public.is_admin()));

create policy comunicazioni_read on public.comunicazioni for select to authenticated using (
 attiva and (destinatari='tutti' or (destinatari='staff' and (select public.is_staff()))
 or (destinatari='soci' and exists(select 1 from public.ruoli_utente r where r.utente_id=(select auth.uid()) and r.ruolo='socio'))
 or (destinatari='istruttori' and (select public.is_instructor()))) or (select public.is_staff()));
create policy comunicazioni_ins on public.comunicazioni for insert to authenticated with check ((select public.is_staff()));
create policy comunicazioni_upd on public.comunicazioni for update to authenticated using((select public.is_staff())) with check((select public.is_staff()));
create policy notifiche_read on public.notifiche for select to authenticated using(utente_id=(select auth.uid()) or (select public.is_staff()));
create policy notifiche_upd on public.notifiche for update to authenticated using(utente_id=(select auth.uid())) with check(utente_id=(select auth.uid()));
create policy impostazioni_read on public.impostazioni_promemoria for select to authenticated using((select public.is_staff()));
create policy impostazioni_ins on public.impostazioni_promemoria for insert to authenticated with check((select public.is_admin()));
create policy impostazioni_upd on public.impostazioni_promemoria for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy registro_read on public.registro_operazioni for select to authenticated using((select public.is_admin()));

-- Tracciamento minimo senza copiare nel log CF, certificati e dati sensibili.
do $$ declare t text; begin
 foreach t in array array['persone','adesioni','corsi','edizioni_corsi','iscrizioni_corsi',
 'qualifiche_istruttori','assegnazioni_istruttori','brevetti_allievi','certificati_medici',
 'piscine','corsie','lezioni','prenotazioni_corsie','presenze',
 'attrezzature','revisioni_attrezzature','quote_associative','addebiti_corsi',
 'pagamenti','movimenti_economici','documenti','comunicazioni'] loop
  execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.registra_operazione()',t,t);
 end loop;
end $$;

-- Richiesta autonoma d'iscrizione a un corso: entra sempre in lista di attesa.
create or replace function public.richiedi_iscrizione_corso(p_edizione uuid,p_persona uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not public.owns_person(p_persona) then raise exception 'Non autorizzato'; end if;
 if not exists(select 1 from public.adesioni where persona_id=p_persona and stato in ('attiva','da_perfezionare')) then
  raise exception 'Adesione associativa non presente';
 end if;
 if not exists(select 1 from public.edizioni_corsi where id=p_edizione and stato in ('programmato','attivo')) then
  raise exception 'Corso non disponibile';
 end if;
 insert into public.iscrizioni_corsi(edizione_id,persona_id,stato)
 values(p_edizione,p_persona,'in_attesa') on conflict (edizione_id,persona_id) do nothing returning id into v_id;
 if v_id is null then raise exception 'Richiesta già presente'; end if;
 return v_id;
end; $$;

-- Le notifiche dei promemoria vengono generate con uno scheduler autenticato.
-- Nessun certificato o informazione sanitaria dettagliata è copiato nelle email.
create or replace function public.genera_promemoria()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer:=0; v_record record; v_user uuid; v_days int; v_arr int[];
begin
 if auth.role() <> 'service_role' and not public.is_admin() then raise exception 'Accesso negato'; end if;
 for v_record in
  select 'certificato_medico'::text as tipo,c.id as id,c.persona_id as persona_id,c.scade_il as scadenza,
    'Verifica documenti'::text as titolo,'Controlla le scadenze nella tua area personale.'::text as messaggio
  from public.certificati_medici c where c.scade_il>=current_date and c.scade_il<=current_date+interval '30 days'
  union all
  select 'quota_associativa',q.id,q.persona_id,q.scadenza,'Scadenza quota','Controlla la tua posizione associativa.'
  from public.quote_associative q where q.scadenza between current_date and current_date+30
  union all
  select 'brevetto',b.id,b.persona_id,b.scade_il,'Scadenza brevetto','Controlla i tuoi brevetti personali.'
  from public.brevetti_allievi b where b.scade_il between current_date and current_date+30
 loop
  select giorni_anticipo into v_arr from public.impostazioni_promemoria where tipo=v_record.tipo and attivo;
  v_days:=v_record.scadenza-current_date;
  if v_days=any(coalesce(v_arr,'{}'::int[])) then
   for v_user in select utente_id from public.collegamenti_persone where persona_id=v_record.persona_id loop
    insert into public.notifiche(utente_id,tipo,riferimento,titolo,messaggio)
    values(v_user,v_record.tipo,v_record.id::text||':'||v_days::text,v_record.titolo,v_record.messaggio)
    on conflict (utente_id,tipo,riferimento) do nothing;
    if found then v_count:=v_count+1; end if;
   end loop;
  end if;
 end loop;
 return v_count;
end; $$;

-- Dieci tracce didattiche iniziali. Non costituiscono programmi federali ufficiali.
insert into public.programmi_didattici(titolo,tipo,descrizione) values
 ('ARA - Livello 1','ARA','Traccia da completare e approvare dal responsabile didattico'),
 ('ARA - Livello 2','ARA','Traccia da completare e approvare dal responsabile didattico'),
 ('ARA - Livello 3','ARA','Traccia da completare e approvare dal responsabile didattico'),
 ('ARA - Livello 4','ARA','Traccia da completare e approvare dal responsabile didattico'),
 ('ARA - Livello 5','ARA','Traccia da completare e approvare dal responsabile didattico'),
 ('Apnea - Base','APNEA','Traccia da completare e approvare dal responsabile didattico'),
 ('Apnea - Intermedio','APNEA','Traccia da completare e approvare dal responsabile didattico'),
 ('Apnea - Avanzato','APNEA','Traccia da completare e approvare dal responsabile didattico'),
 ('Nuoto libero - Sessione 1','NUOTO_LIBERO','Traccia di organizzazione delle attività'),
 ('Nuoto libero - Sessione 2','NUOTO_LIBERO','Traccia di organizzazione delle attività')
on conflict (titolo) do nothing;
insert into public.versioni_programmi(programma_id,versione,obiettivi,stato)
 select id,1,'Da definire secondo il programma approvato dall’associazione','bozza' from public.programmi_didattici
 on conflict(programma_id,versione) do nothing;

-- Privilegi di esecuzione delle funzioni elevate, assegnati solo ai ruoli previsti.
revoke all on function public.is_admin() from public,anon;
revoke all on function public.is_instructor() from public,anon;
revoke all on function public.owns_person(uuid) from public,anon;
revoke all on function public.insegna_edizione(uuid) from public,anon;
revoke all on function public.iscritto_edizione(uuid) from public,anon;
revoke all on function public.richiedi_iscrizione_corso(uuid,uuid) from public,anon;
revoke all on function public.genera_promemoria() from public,anon,authenticated;
grant execute on function public.is_admin(),public.is_instructor() to authenticated;
grant execute on function public.owns_person(uuid),public.insegna_edizione(uuid),public.iscritto_edizione(uuid),public.richiedi_iscrizione_corso(uuid,uuid) to authenticated;
grant execute on function public.genera_promemoria() to service_role;

-- Mutazione limitata: l'utente può contrassegnare la notifica come letta,
-- non modificare titolo, messaggio o destinatario.
drop policy if exists notifiche_upd on public.notifiche;
create or replace function public.segna_notifica_letta(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
 update public.notifiche set letta_il=coalesce(letta_il,now())
 where id=p_id and utente_id=auth.uid();
end; $$;
revoke all on function public.segna_notifica_letta(uuid) from public,anon;
grant execute on function public.segna_notifica_letta(uuid) to authenticated;

-- Attribuzione ruolo a un account esistente e verificato; solo amministratori.
create or replace function public.assegna_ruolo_email(p_email text,p_ruolo public.ruolo_app)
returns void language plpgsql security definer set search_path = '' as $$
declare v_target uuid;
begin
 if not public.is_admin() then raise exception 'Solo amministratore'; end if;
 select id into v_target from auth.users where lower(email)=lower(btrim(p_email)) and email_confirmed_at is not null;
 if v_target is null then raise exception 'Account non trovato o non verificato'; end if;
 insert into public.ruoli_utente(utente_id,ruolo) values(v_target,p_ruolo) on conflict do nothing;
end; $$;
revoke all on function public.assegna_ruolo_email(text,public.ruolo_app) from public,anon;
grant execute on function public.assegna_ruolo_email(text,public.ruolo_app) to authenticated;

-- Legame facoltativo tra metadata del certificato e documento privato.
alter table public.certificati_medici add column if not exists documento_id uuid references public.documenti(id);

alter table public.documenti add constraint documenti_privati_personali
 check(ambito <> 'personale' or visibilita in ('staff','proprietario'));
drop policy if exists documenti_read on public.documenti;
create policy documenti_read on public.documenti for select to authenticated using (
 (select public.is_staff()) or utente_id=(select auth.uid()) or
 (visibilita='soci' and ((ambito='associazione' and exists(
 select 1 from public.ruoli_utente r where r.utente_id=(select auth.uid()) and r.ruolo='socio'))
 or (edizione_id is not null and (select public.iscritto_edizione(edizione_id))))) or
 (visibilita='istruttori' and (select public.is_instructor()) and
 (edizione_id is null or (select public.insegna_edizione(edizione_id)))));

-- Pulizia metadata nel raro caso in cui Storage rifiuti un upload.
create or replace function public.annulla_upload_documento(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Accesso negato'; end if;
 delete from public.documenti where id=p_id and caricato_da=auth.uid()
 and caricato_il > now()-interval '10 minutes'
 and not exists(select 1 from storage.objects o where o.bucket_id='sesto-documenti' and o.name=documenti.percorso_storage);
end; $$;
revoke all on function public.annulla_upload_documento(uuid) from public,anon;
grant execute on function public.annulla_upload_documento(uuid) to authenticated;

-- Istruttori: solo l'identità degli allievi nei corsi effettivamente assegnati.
create or replace function public.istruttore_di_persona(p_persona uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_instructor() and exists(
 select 1 from public.iscrizioni_corsi i
 join public.assegnazioni_istruttori a on a.edizione_id=i.edizione_id
 join public.collegamenti_persone cp on cp.persona_id=a.persona_id
 where i.persona_id=p_persona and cp.utente_id=(select auth.uid()) and i.stato in ('iscritto','concluso'));
$$;
create policy persone_insegnanti on public.persone for select to authenticated using (
 (select public.istruttore_di_persona(id)));
revoke all on function public.istruttore_di_persona(uuid) from public,anon;
grant execute on function public.istruttore_di_persona(uuid) to authenticated;

-- I programmi ancora in bozza non sono visibili indiscriminatamente ai soci.
drop policy if exists versioni_programmi_read on public.versioni_programmi;
create policy versioni_programmi_read on public.versioni_programmi for select to authenticated using (
 (select public.is_staff()) or (select public.is_instructor()) or stato='approvato');

-- Promemoria aggiuntivi per manutenzioni e inizio corsi.
create or replace function public.genera_promemoria_organizzativi()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer:=0; v_record record; v_user uuid; v_day integer; v_days int[];
begin
 if auth.role() <> 'service_role' and not public.is_admin() then raise exception 'Accesso negato'; end if;
 for v_record in
  select 'revisione_attrezzatura'::text as tipo,a.id as id,a.prossima_revisione as scadenza,
   'Manutenzione attrezzatura'::text as titolo,
   'Verifica le manutenzioni dell’inventario.'::text as messaggio
  from public.attrezzature a where a.prossima_revisione between current_date and current_date+30
 loop
  select giorni_anticipo into v_days from public.impostazioni_promemoria where tipo=v_record.tipo and attivo;
  v_day:=v_record.scadenza-current_date;
  if v_day=any(coalesce(v_days,'{}'::int[])) then
   for v_user in select distinct utente_id from public.ruoli_utente where ruolo in ('amministratore','segreteria') loop
    insert into public.notifiche(utente_id,tipo,riferimento,titolo,messaggio)
    values(v_user,v_record.tipo,v_record.id::text||':'||v_day::text,v_record.titolo,v_record.messaggio)
    on conflict (utente_id,tipo,riferimento) do nothing;
    if found then v_count:=v_count+1; end if;
   end loop;
  end if;
 end loop;
 for v_record in
  select id,inizio from public.edizioni_corsi where inizio between current_date and current_date+30 and stato in ('programmato','attivo')
 loop
  select giorni_anticipo into v_days from public.impostazioni_promemoria where tipo='inizio_corso' and attivo;
  v_day:=v_record.inizio-current_date;
  if v_day=any(coalesce(v_days,'{}'::int[])) then
   for v_user in select distinct cp.utente_id from public.assegnazioni_istruttori a
    join public.collegamenti_persone cp on cp.persona_id=a.persona_id where a.edizione_id=v_record.id
    union select distinct cp.utente_id from public.iscrizioni_corsi i
    join public.collegamenti_persone cp on cp.persona_id=i.persona_id
    where i.edizione_id=v_record.id and i.stato='iscritto'
   loop
    insert into public.notifiche(utente_id,tipo,riferimento,titolo,messaggio)
    values(v_user,'inizio_corso',v_record.id::text||':'||v_day::text,'Inizio attività','Consulta il calendario del tuo corso.')
    on conflict (utente_id,tipo,riferimento) do nothing;
    if found then v_count:=v_count+1; end if;
   end loop;
  end if;
 end loop;
 return v_count;
end; $$;
revoke all on function public.genera_promemoria_organizzativi() from public,anon,authenticated;
grant execute on function public.genera_promemoria_organizzativi() to service_role;

-- Avviso interno quando vengono modificate le date di una lezione.
create or replace function public.avvisa_cambio_lezione()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
 if tg_op='UPDATE' and new.inizio is not distinct from old.inizio and new.fine is not distinct from old.fine then return new; end if;
 for v_user in
  select distinct cp.utente_id from public.iscrizioni_corsi i
  join public.collegamenti_persone cp on cp.persona_id=i.persona_id
  where i.edizione_id=new.edizione_id and i.stato='iscritto'
  union
  select distinct cp.utente_id from public.assegnazioni_istruttori a
  join public.collegamenti_persone cp on cp.persona_id=a.persona_id
  where a.edizione_id=new.edizione_id
 loop
  insert into public.notifiche(utente_id,tipo,riferimento,titolo,messaggio)
  values(v_user,'calendario',new.id::text||':'||extract(epoch from now())::text,
   'Calendario aggiornato','Controlla le informazioni della prossima lezione nella tua area.')
  on conflict (utente_id,tipo,riferimento) do nothing;
 end loop;
 return new;
end; $$;
create trigger avviso_modifica_lezione after update of inizio,fine on public.lezioni
for each row execute function public.avvisa_cambio_lezione();

-- Una versione didattica approvata non deve essere sovrascritta.
create or replace function public.proteggi_versione_didattica()
returns trigger language plpgsql set search_path = '' as $$
begin
 if old.stato in ('approvato','archiviato') and
   (new.programma_id,new.versione,new.obiettivi,new.teoria,new.pratica,new.sequenza_lezioni,
   new.durata_ore,new.verifiche) is distinct from
   (old.programma_id,old.versione,old.obiettivi,old.teoria,old.pratica,old.sequenza_lezioni,
   old.durata_ore,old.verifiche) then
  raise exception 'Versione approvata non modificabile: creare una nuova versione';
 end if;
 if old.stato='archiviato' and new.stato <> old.stato then
  raise exception 'Versione archiviata non riattivabile';
 end if;
 return new;
end; $$;
create trigger proteggi_versione_didattica before update on public.versioni_programmi
for each row execute function public.proteggi_versione_didattica();

-- La scheda attrezzatura si allinea automaticamente alla cronologia revisioni.
create or replace function public.aggiorna_revisione_attrezzatura()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 update public.attrezzature set ultima_revisione=new.data_intervento,
  prossima_revisione=coalesce(new.prossimo_intervento,prossima_revisione)
 where id=new.attrezzatura_id and
   (ultima_revisione is null or new.data_intervento>=ultima_revisione);
 return new;
end; $$;
create trigger aggiorna_revisione_attrezzatura after insert on public.revisioni_attrezzature
for each row execute function public.aggiorna_revisione_attrezzatura();

create or replace function public.verifica_modifica_lezione()
returns trigger language plpgsql set search_path = '' as $$
begin
 if exists(
  select 1 from public.prenotazioni_corsie p
  join public.corsie c on c.id=p.corsia_id
  where p.lezione_id=new.id and p.stato='confermata' and
   (p.inizio<new.inizio or p.fine>new.fine or c.piscina_id is distinct from new.piscina_id)
 ) then raise exception 'Aggiornare prima le prenotazioni corsie associate'; end if;
 return new;
end; $$;
create trigger verifica_modifica_lezione before update of inizio,fine,piscina_id on public.lezioni
for each row execute function public.verifica_modifica_lezione();

-- Tesseramenti distinti dall'approvazione dell'adesione e dal pagamento.
create table public.tesseramenti (
 id uuid primary key default gen_random_uuid(), adesione_id uuid not null references public.adesioni(id),
 ente text not null, numero_tessera text, emessa_il date, scade_il date not null,
 stato text not null default 'da_emettere' check(stato in ('da_emettere','attiva','sospesa','scaduta')),
 note text, unique(adesione_id,ente), check(emessa_il is null or scade_il>=emessa_il)
);
alter table public.tesseramenti enable row level security;
create policy tesseramenti_read on public.tesseramenti for select to authenticated using(
 (select public.is_staff()) or exists(select 1 from public.adesioni a where a.id=adesione_id and (select public.owns_person(a.persona_id))));
create policy tesseramenti_ins on public.tesseramenti for insert to authenticated with check((select public.is_staff()));
create policy tesseramenti_upd on public.tesseramenti for update to authenticated using((select public.is_staff())) with check((select public.is_staff()));
create trigger audit_tesseramenti after insert or update or delete on public.tesseramenti
for each row execute function public.registra_operazione();
insert into public.impostazioni_promemoria(tipo) values('tesseramento') on conflict(tipo) do nothing;

create or replace function public.genera_promemoria_tessere()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer:=0;v_record record;v_user uuid;v_days int[];v_delta integer;
begin
 if auth.role()<>'service_role' and not public.is_admin() then raise exception 'Accesso negato'; end if;
 select giorni_anticipo into v_days from public.impostazioni_promemoria where tipo='tesseramento' and attivo;
 if v_days is null then return 0; end if;
 for v_record in select t.id,t.scade_il,a.persona_id from public.tesseramenti t
  join public.adesioni a on a.id=t.adesione_id
  where t.scade_il between current_date and current_date+30
 loop
  v_delta:=v_record.scade_il-current_date;
  if v_delta=any(v_days) then
   for v_user in select utente_id from public.collegamenti_persone where persona_id=v_record.persona_id loop
    insert into public.notifiche(utente_id,tipo,riferimento,titolo,messaggio)
    values(v_user,'tesseramento',v_record.id::text||':'||v_delta::text,
     'Scadenza tesseramento','Controlla il rinnovo della tessera con la segreteria.')
    on conflict(utente_id,tipo,riferimento) do nothing;
    if found then v_count:=v_count+1; end if;
   end loop;
  end if;
 end loop;
 return v_count;
end; $$;
revoke all on function public.genera_promemoria_tessere() from public,anon,authenticated;
grant execute on function public.genera_promemoria_tessere() to service_role;

-- Rettifica dei recapiti personali senza poter cambiare nome, CF o stato associativo.
create or replace function public.aggiorna_recapiti_personali(
 p_persona uuid,p_telefono text,p_indirizzo text,p_cap text,p_comune text
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.owns_person(p_persona) then raise exception 'Persona non collegata all’account'; end if;
 if length(btrim(coalesce(p_telefono,'')))>30 or length(btrim(coalesce(p_indirizzo,'')))>250 or
  length(btrim(coalesce(p_cap,'')))>10 or length(btrim(coalesce(p_comune,'')))>100 then
  raise exception 'Campo troppo lungo';
 end if;
 update public.persone set telefono=nullif(btrim(p_telefono),''),indirizzo=nullif(btrim(p_indirizzo),''),
  cap=nullif(btrim(p_cap),''),comune=nullif(btrim(p_comune),'') where id=p_persona;
end; $$;
revoke all on function public.aggiorna_recapiti_personali(uuid,text,text,text,text) from public,anon;
grant execute on function public.aggiorna_recapiti_personali(uuid,text,text,text,text) to authenticated;

-- Collega istruttori/soci già esistenti a un account verificato; il collegamento non è pubblico.
create or replace function public.collega_account_a_persona(
 p_email text,p_persona uuid,p_relazione text default 'titolare'
) returns void language plpgsql security definer set search_path = '' as $$
declare v_account uuid;
begin
 if not public.is_admin() then raise exception 'Solo amministratore'; end if;
 if p_relazione not in ('titolare','tutore') then raise exception 'Relazione non valida'; end if;
 if not exists(select 1 from public.persone where id=p_persona) then raise exception 'Persona non trovata'; end if;
 select id into v_account from auth.users where lower(email)=lower(btrim(p_email)) and email_confirmed_at is not null;
 if v_account is null then raise exception 'Account inesistente o non verificato'; end if;
 insert into public.collegamenti_persone(utente_id,persona_id,relazione)
 values(v_account,p_persona,p_relazione)
 on conflict (utente_id,persona_id) do update set relazione=excluded.relazione;
end; $$;
revoke all on function public.collega_account_a_persona(text,uuid,text) from public,anon;
grant execute on function public.collega_account_a_persona(text,uuid,text) to authenticated;

-- L'archivio conserva una data amministrativa di revisione/eliminazione.
alter table public.documenti add column if not exists scadenza_conservazione date;
alter table public.documenti add column if not exists programma_versione_id uuid references public.versioni_programmi(id);
create policy documenti_delete_admin on public.documenti for delete to authenticated using((select public.is_admin()));

-- Non è possibile riaprire o alterare una versione approvata/archiviata.
create or replace function public.proteggi_versione_didattica()
returns trigger language plpgsql set search_path = '' as $$
begin
 if old.stato='approvato' and new.stato not in ('approvato','archiviato') then
  raise exception 'Versione approvata: si può soltanto archiviare';
 end if;
 if old.stato='archiviato' and new.stato<>'archiviato' then
  raise exception 'Versione archiviata non riattivabile';
 end if;
 if old.stato in ('approvato','archiviato') and
   (new.programma_id,new.versione,new.obiettivi,new.teoria,new.pratica,new.sequenza_lezioni,
    new.durata_ore,new.verifiche) is distinct from
   (old.programma_id,old.versione,old.obiettivi,old.teoria,old.pratica,old.sequenza_lezioni,
    old.durata_ore,old.verifiche) then
  raise exception 'Creare una nuova versione del programma';
 end if;
 return new;
end; $$;
create trigger audit_programmi after insert or update or delete on public.programmi_didattici
for each row execute function public.registra_operazione();
create trigger audit_versioni after insert or update or delete on public.versioni_programmi
for each row execute function public.registra_operazione();


-- Migliorie di integrità: la capienza di un'edizione non può essere abbassata
-- sotto il numero di iscritti già confermati.
create or replace function public.verifica_riduzione_capienza()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.massimo_partecipanti < (
  select count(*) from public.iscrizioni_corsi where edizione_id=new.id and stato='iscritto'
 ) then raise exception 'La capienza non può essere inferiore agli iscritti confermati'; end if;
 return new;
end; $$;
create trigger controllo_riduzione_capienza before update of massimo_partecipanti on public.edizioni_corsi
for each row execute function public.verifica_riduzione_capienza();

-- Stato di un'attrezzatura allineato alle assegnazioni effettive.
create or replace function public.aggiorna_stato_attrezzatura_assegnata()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_codice uuid;
begin
 if tg_op='UPDATE' and old.attrezzatura_id is distinct from new.attrezzatura_id then
  update public.attrezzature set stato='disponibile'
   where id=old.attrezzatura_id and stato='assegnata' and not exists (
    select 1 from public.assegnazioni_attrezzature x
    where x.attrezzatura_id=old.attrezzatura_id and x.restituita_il is null);
 end if;
 v_codice:=case when tg_op='DELETE' then old.attrezzatura_id else new.attrezzatura_id end;
 update public.attrezzature
 set stato=case when exists(
   select 1 from public.assegnazioni_attrezzature x
   where x.attrezzatura_id=v_codice and x.restituita_il is null
 ) then 'assegnata'
 else 'disponibile' end
 where id=v_codice and stato in ('disponibile','assegnata');
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;
create trigger sincronizza_stato_assegnazione after insert or update or delete on public.assegnazioni_attrezzature
for each row execute function public.aggiorna_stato_attrezzatura_assegnata();

-- Il docente vede solo se lo stato documentale dell'allievo iscritto è valido,
-- senza poter leggere i documenti o le note sanitarie.
create or replace function public.idoneita_allievi_corso(p_edizione uuid)
returns table (persona_id uuid, idoneita_valida boolean, scadenza date)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.is_instructor() or not public.insegna_edizione(p_edizione) then
  raise exception 'Non autorizzato';
 end if;
 return query select i.persona_id,
  coalesce((select c.idoneita_verificata and c.scade_il>=current_date
    from public.certificati_medici c where c.persona_id=i.persona_id
    order by c.scade_il desc limit 1),false),
  (select max(c.scade_il) from public.certificati_medici c where c.persona_id=i.persona_id)
 from public.iscrizioni_corsi i
 where i.edizione_id=p_edizione and i.stato='iscritto';
end; $$;
revoke all on function public.idoneita_allievi_corso(uuid) from public,anon;
grant execute on function public.idoneita_allievi_corso(uuid) to authenticated;

-- La segreteria riceve un avviso in-app quando arriva una domanda.
create or replace function public.avvisa_nuova_richiesta()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_utente uuid; v_changed boolean;
begin
 if tg_op='INSERT' then v_changed:=true; else v_changed:=old.stato is distinct from new.stato; end if;
 if new.stato='inviata' and v_changed then
  for v_utente in select distinct utente_id from public.ruoli_utente
    where ruolo in ('amministratore','segreteria') loop
   insert into public.notifiche(utente_id,tipo,riferimento,titolo,messaggio)
   values(v_utente,'nuova_domanda',new.id::text||':'||coalesce(new.inviata_il::text,now()::text),
    'Nuova domanda di adesione','Una nuova domanda richiede la verifica della segreteria.')
   on conflict (utente_id,tipo,riferimento) do nothing;
  end loop;
 end if;
 return new;
end; $$;
create trigger avviso_domanda_inviata after insert or update of stato on public.richieste
for each row execute function public.avvisa_nuova_richiesta();


-- Non è ammessa l'assegnazione di attrezzature già fuori servizio o in manutenzione.
create or replace function public.controlla_consegna_attrezzatura()
returns trigger language plpgsql set search_path = '' as $$
declare v_stato text;
begin
 if new.restituita_il is not null then return new; end if;
 select stato into v_stato from public.attrezzature where id=new.attrezzatura_id for update;
 if v_stato is null or v_stato in ('in_manutenzione','fuori_servizio') then
  raise exception 'Attrezzatura non consegnabile';
 end if;
 return new;
end; $$;
create trigger controlla_consegna before insert or update of attrezzatura_id,restituita_il
on public.assegnazioni_attrezzature for each row execute function public.controlla_consegna_attrezzatura();
