-- Sesto Continente v12 · Eseguire DOPO 0007 (in una transazione distinta).
-- Non cancella record storici, ma aggiorna canale e data versamento dei pagamenti esistenti.
-- Non eseguire senza un backup ripristinabile. Testare possibilmente su un clone.
begin;

-- MOD 01-06, 09-13: schema incrementale.
alter table public.persone
 add column if not exists provincia_nascita varchar(2),
 add column if not exists stato_nascita varchar(15),
 add column if not exists provincia_residenza varchar(2),
 add column if not exists stato_residenza varchar(15),
 add column if not exists sesso_cf char(1) check(sesso_cf in ('M','F')),
 add column if not exists codice_catastale_nascita varchar(4),
 add column if not exists cf_omocodia_verificata boolean not null default false,
 add column if not exists cf_override_motivo varchar(500);
alter table public.persone add constraint provincia_nascita_maiuscola check(provincia_nascita is null or provincia_nascita=upper(provincia_nascita));
alter table public.persone add constraint provincia_residenza_maiuscola check(provincia_residenza is null or provincia_residenza=upper(provincia_residenza));
alter table public.richieste
 add column if not exists flag_statuto boolean not null default false,
 add column if not exists flag_privacy boolean not null default false,
 add column if not exists flag_immagini boolean not null default false,
 add column if not exists versione_statuto text,
 add column if not exists versione_privacy text,
 add column if not exists data_accettazione timestamptz;
alter table public.edizioni_corsi add column if not exists costo_corso numeric(12,2) check(costo_corso >= 0);
alter table public.pagamenti add column if not exists canale_pagamento text check(canale_pagamento in ('Bonifico Bancario','Cassa','POS'));
alter table public.pagamenti add column if not exists data_versamento date;
-- Mantiene i dati preesistenti (versamenti definitivi sono append-only).
update public.pagamenti set data_versamento=data_pagamento where data_versamento is null;
update public.pagamenti set canale_pagamento=case metodo when 'bonifico' then 'Bonifico Bancario' when 'pos' then 'POS' else 'Cassa' end where canale_pagamento is null;
-- Compatibilità vecchie azioni con vincoli NOT NULL per i nuovi inserimenti.
create or replace function public.sincronizza_versamento_v12() returns trigger language plpgsql set search_path='' as $$
begin
 if new.canale_pagamento is null then
  new.canale_pagamento:=case new.metodo when 'bonifico' then 'Bonifico Bancario' when 'pos' then 'POS' else 'Cassa' end;
 end if;
 if new.data_versamento is null then new.data_versamento:=new.data_pagamento; end if;
 if new.data_versamento is distinct from new.data_pagamento then raise exception 'Data versamento non coerente con data pagamento'; end if;
 return new;
end $$;
drop trigger if exists sinc_versamento_v12 on public.pagamenti;
create trigger sinc_versamento_v12 before insert on public.pagamenti for each row execute function public.sincronizza_versamento_v12();

create table if not exists public.listino_corsi(
 id uuid primary key default gen_random_uuid(), importo numeric(12,2) not null unique check(importo>=0),
 creato_il timestamptz not null default now());
alter table public.listino_corsi enable row level security;
create policy listino_corsi_staff_read on public.listino_corsi for select to authenticated using(public.is_staff());
insert into public.listino_corsi(importo) select distinct costo_corso from public.edizioni_corsi where costo_corso is not null on conflict do nothing;
create or replace function public.memorizza_prezzo_corso() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.costo_corso is not null then insert into public.listino_corsi(importo) values(new.costo_corso) on conflict do nothing; end if; return new; end $$;
drop trigger if exists memorizza_prezzo_corso_v12 on public.edizioni_corsi;
create trigger memorizza_prezzo_corso_v12 after insert or update of costo_corso on public.edizioni_corsi for each row execute function public.memorizza_prezzo_corso();

-- Inviare solo dopo accettazione esplicita delle due dichiarazioni obbligatorie.
-- Compatibilita delle pratiche storiche gia approvate al momento dell'installazione.
-- I consensi nuovi sono SEMPRE obbligatori alle nuove presentazioni e ai cambi di stato.
-- Una pratica pre-v12 gia nello stato inviata/in_verifica/approvata puo
-- essere aggiornata senza dichiarazioni retroattive SOLO quando rimangono
-- invariati stato, flag e versioni delle informative.
create or replace function public.verifica_dichiarazioni_domanda_v12()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.stato in ('inviata','in_verifica','approvata')
     and (new.flag_statuto is not true or new.flag_privacy is not true
          or nullif(btrim(new.versione_statuto),'') is null
          or nullif(btrim(new.versione_privacy),'') is null
          or new.versione_statuto = 'DA_CONFIGURARE'
          or new.versione_privacy = 'DA_CONFIGURARE') then
    if tg_op = 'INSERT' then
      raise exception 'Dichiarazioni Statuto / informativa obbligatorie prima dell’invio';
    end if;
    -- UPDATE: consentita solo la manutenzione di pratiche storiche gia
    -- presentate, a condizione di non modificare gli elementi di consenso
    -- e di non effettuare una transizione di stato.
    if old.stato is distinct from new.stato
       or old.flag_statuto is distinct from new.flag_statuto
       or old.flag_privacy is distinct from new.flag_privacy
       or old.versione_statuto is distinct from new.versione_statuto
       or old.versione_privacy is distinct from new.versione_privacy then
      raise exception 'Dichiarazioni Statuto / informativa obbligatorie prima dell’invio';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists dichiarazioni_obbligatorie_v12 on public.richieste;
create trigger dichiarazioni_obbligatorie_v12 before insert or update on public.richieste
 for each row execute function public.verifica_dichiarazioni_domanda_v12();
create or replace function public.salva_domanda_v12(
 p_nome text,p_cognome text,p_data_nascita date,p_luogo_nascita text,
 p_codice_fiscale text,p_indirizzo text,p_cap text,p_comune text,p_telefono text,
 p_nome_tutore text,p_cognome_tutore text,p_parentela_tutore text,
 p_flag_statuto boolean,p_flag_privacy boolean,p_flag_immagini boolean,
 p_versione_statuto text,p_versione_privacy text,p_invia boolean)
 returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if (p_flag_statuto is not true or p_flag_privacy is not true or
 length(coalesce(p_versione_statuto,''))<1 or length(coalesce(p_versione_privacy,''))<1 or
 p_versione_statuto='DA_CONFIGURARE' or p_versione_privacy='DA_CONFIGURARE')
 then raise exception 'Informative obbligatorie mancanti o non configurate'; end if;
 v_id:=public.salva_domanda(p_nome,p_cognome,p_data_nascita,p_luogo_nascita,
 p_codice_fiscale,p_indirizzo,p_cap,p_comune,p_telefono,p_nome_tutore,p_cognome_tutore,
 p_parentela_tutore,coalesce(p_flag_statuto,false) and coalesce(p_flag_privacy,false),false);
 update public.richieste set flag_statuto=coalesce(p_flag_statuto,false),flag_privacy=coalesce(p_flag_privacy,false),
 flag_immagini=coalesce(p_flag_immagini,false),versione_statuto=p_versione_statuto,
 versione_privacy=p_versione_privacy,data_accettazione=case when p_flag_statuto and p_flag_privacy then now() else null end
 where id=v_id and utente_id=auth.uid();
 if p_invia then
  perform public.salva_domanda(p_nome,p_cognome,p_data_nascita,p_luogo_nascita,p_codice_fiscale,
  p_indirizzo,p_cap,p_comune,p_telefono,p_nome_tutore,p_cognome_tutore,p_parentela_tutore,true,true);
 end if;
 return v_id;
end $$;
revoke all on function public.salva_domanda_v12(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean) from public,anon;
grant execute on function public.salva_domanda_v12(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean) to authenticated;

-- MOD 32-35: filtraggio RLS e proiezione minima istruttori.
create or replace function public.is_board() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ruoli_utente where utente_id=auth.uid() and ruolo='consigliere_cda'::public.ruolo_app);
$$;
create or replace function public.allievi_del_mio_corso()
 returns table(edizione_id uuid, persona_id uuid, nome text, cognome text, email text, telefono text, certificato_valido boolean)
 language sql stable security definer set search_path='' as $$
 select distinct i.edizione_id,p.id,p.nome,p.cognome,p.email,p.telefono,
  exists(select 1 from public.certificati_medici c where c.persona_id=p.id and c.idoneita_verificata=true and c.scade_il>=current_date)
 from public.iscrizioni_corsi i join public.persone p on p.id=i.persona_id
 where i.stato in ('iscritto','concluso') and public.is_instructor() and
       public.insegna_edizione(i.edizione_id)
$$;
revoke all on function public.allievi_del_mio_corso() from public,anon;
grant execute on function public.allievi_del_mio_corso() to authenticated;
-- Un istruttore non ottiene accesso SQL diretto all'anagrafica degli allievi.
-- Esclusa la lettura globale degli inventari assegnati a persone.

-- MOD 15-20, 29-31: organi sociali, quorum congelato e delibere atomiche.
create table if not exists public.cda_componenti(
 id uuid primary key default gen_random_uuid(),persona_id uuid not null references public.persone(id),
 carica text not null check(carica in ('Presidente','Vice Presidente','Segretaria','Tesoriere','Consigliere')),
 dal date not null, al date not null,
 created_at timestamptz not null default now(),check(al=(dal+interval '4 years')::date)
);
create unique index if not exists cda_componenti_unici on public.cda_componenti(persona_id,dal);
create table if not exists public.cda_verbali(
 id uuid primary key default gen_random_uuid(),data_consiglio date not null,oggetto text not null,
 tipo text not null check(tipo in ('Approvazione Adesioni Soci','Gestione Ordinaria / Altro','Misto')),
 stato text not null default 'bozza' check(stato in ('bozza','in_approvazione','approvato')),
 percorso_docx text not null,mime_docx text not null default 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 percorso_pdf text,creato_da uuid not null references auth.users(id),
 creato_il timestamptz not null default now(),approvato_il timestamptz,
 constraint immutabilita_pdf check(stato<>'approvato' or (percorso_pdf is not null and approvato_il is not null))
);
create table if not exists public.cda_votanti(
 verbale_id uuid not null references public.cda_verbali(id) on delete restrict,
 utente_id uuid not null references auth.users(id),
 persona_id uuid not null references public.persone(id),
 primary key(verbale_id,utente_id)
);
create table if not exists public.cda_voti(
 verbale_id uuid not null,utente_id uuid not null,
 votato_il timestamptz not null default now(),
 primary key(verbale_id,utente_id),
 foreign key(verbale_id,utente_id) references public.cda_votanti(verbale_id,utente_id)
);
create table if not exists public.cda_adesioni(
 verbale_id uuid not null references public.cda_verbali(id) on delete restrict,
 adesione_id uuid not null unique references public.adesioni(id) on delete restrict,
 primary key(verbale_id,adesione_id)
);
alter table public.adesioni add column if not exists verbale_cda_id uuid references public.cda_verbali(id);
-- La variazione dello stato socio a "attiva" richiede una delibera approvata;
-- gli stati storici esistenti rimangono intatti.
create or replace function public.adesione_attiva_solo_con_delibera()
 returns trigger language plpgsql set search_path='' as $$
begin
 if new.stato='attiva' and (old.stato<>'attiva' or new.verbale_cda_id is distinct from old.verbale_cda_id) and
  not exists(select 1 from public.cda_verbali v where v.id=new.verbale_cda_id and
  v.stato='approvato' and v.tipo in ('Approvazione Adesioni Soci','Misto'))
 then raise exception 'Attivazione senza delibera CdA approvata'; end if;
 return new;
end $$;
-- Trigger creato DOPO le tabelle CdA, più avanti in questa stessa migrazione.
drop trigger if exists attivazione_solo_delibera_v12 on public.adesioni;
create trigger attivazione_solo_delibera_v12 before update of stato,verbale_cda_id on public.adesioni
 for each row execute function public.adesione_attiva_solo_con_delibera();

alter table public.cda_componenti enable row level security;
alter table public.cda_verbali enable row level security;
alter table public.cda_votanti enable row level security;
alter table public.cda_voti enable row level security;
alter table public.cda_adesioni enable row level security;
create policy cda_componenti_read on public.cda_componenti for select to authenticated using(public.is_staff() or public.is_board());
create policy cda_componenti_write on public.cda_componenti for insert to authenticated with check(public.is_staff());
create policy cda_componenti_update on public.cda_componenti for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy cda_verbali_read on public.cda_verbali for select to authenticated using(public.is_staff() or public.is_board());
create policy cda_verbali_insert on public.cda_verbali for insert to authenticated with check(public.is_staff() and creato_da=auth.uid());
create policy cda_votanti_read on public.cda_votanti for select to authenticated using(public.is_staff() or (utente_id=auth.uid() and public.is_board()));
create policy cda_voti_read on public.cda_voti for select to authenticated using(public.is_staff() or (utente_id=auth.uid() and public.is_board()));
create policy cda_adesioni_read on public.cda_adesioni for select to authenticated using(public.is_staff() or public.is_board());
-- Non esistono policy direct INSERT/UPDATE sui voti, adesioni e verbali: solo RPC controllate.

create or replace function public.prepara_verbale_cda(p_verbale uuid,p_adesioni uuid[] default array[]::uuid[])
 returns void language plpgsql security definer set search_path='' as $$
declare v public.cda_verbali%rowtype; n int; v_selected int;
begin
 if not public.is_staff() then raise exception 'Solo staff'; end if;
 select * into v from public.cda_verbali where id=p_verbale for update;
 if not found or v.stato<>'bozza' then raise exception 'Verbale non modificabile'; end if;
 if coalesce(array_length(p_adesioni,1),0)>0 and v.tipo='Gestione Ordinaria / Altro' then raise exception 'Tipo verbale incompatibile'; end if;
 insert into public.cda_votanti(verbale_id,utente_id,persona_id)
 select v.id,cp.utente_id,c.persona_id from public.cda_componenti c
 join public.collegamenti_persone cp on cp.persona_id=c.persona_id and cp.relazione='titolare'
 join public.ruoli_utente r on r.utente_id=cp.utente_id and r.ruolo='consigliere_cda'::public.ruolo_app
 where c.dal<=v.data_consiglio and c.al>=v.data_consiglio;
 get diagnostics n=row_count;
 if n=0 then raise exception 'Nessun consigliere autenticato per la seduta'; end if;
 if exists(select 1 from public.cda_componenti c where c.dal<=v.data_consiglio and c.al>=v.data_consiglio
 and not exists(select 1 from public.cda_votanti x where x.verbale_id=v.id and x.persona_id=c.persona_id))
 then raise exception 'Un consigliere in carica non ha un account collegato'; end if;
 if coalesce(array_length(p_adesioni,1),0)>0 then
  select count(*) into v_selected from public.adesioni where id=any(p_adesioni) and stato='da_perfezionare';
  if v_selected<>cardinality(p_adesioni) or v_selected<> (select count(distinct x) from unnest(p_adesioni) x) then raise exception 'Adesioni non valide o duplicate'; end if;
  insert into public.cda_adesioni(verbale_id,adesione_id) select v.id,unnest(p_adesioni);
 end if;
 update public.cda_verbali set stato='in_approvazione' where id=v.id;
end $$;
create or replace function public.vota_verbale_cda(p_verbale uuid)
 returns boolean language plpgsql security definer set search_path='' as $$
declare v public.cda_verbali%rowtype;
begin
 if not public.is_board() then raise exception 'Solo consigliere'; end if;
 select * into v from public.cda_verbali where id=p_verbale for update;
 if not found or v.stato<>'in_approvazione' then raise exception 'Verbale non votabile'; end if;
 if not exists(select 1 from public.cda_votanti where verbale_id=v.id and utente_id=auth.uid()) then raise exception 'Non parte del quorum'; end if;
 insert into public.cda_voti(verbale_id,utente_id) values(v.id,auth.uid()) on conflict do nothing;
 return (select count(*) from public.cda_voti where verbale_id=v.id)=(select count(*) from public.cda_votanti where verbale_id=v.id);
end $$;
create or replace function public.finalizza_verbale_cda(p_verbale uuid,p_percorso_pdf text)
 returns void language plpgsql security definer set search_path='' as $$
declare v public.cda_verbali%rowtype;
begin
 if not (public.is_staff() or public.is_board()) then raise exception 'Non autorizzato'; end if;
 select * into v from public.cda_verbali where id=p_verbale for update;
 if not found or v.stato<>'in_approvazione' or p_percorso_pdf is null or
 p_percorso_pdf<>v.id::text||'/definitivo.pdf' or
 not exists(select 1 from storage.objects where bucket_id='sesto-cda' and name=p_percorso_pdf) or
 (select count(*) from public.cda_voti where verbale_id=v.id)<>
 (select count(*) from public.cda_votanti where verbale_id=v.id)
 then raise exception 'Quorum / documento non valido'; end if;
 update public.cda_verbali set stato='approvato',approvato_il=now(),percorso_pdf=p_percorso_pdf where id=v.id;
 update public.adesioni set stato='attiva',data_approvazione=now(),verbale_cda_id=v.id
 where id in(select adesione_id from public.cda_adesioni where verbale_id=v.id) and stato='da_perfezionare';
 if (select count(*) from public.cda_adesioni where verbale_id=v.id)<>
 (select count(*) from public.adesioni where verbale_cda_id=v.id) then raise exception 'Adesioni non approvabili'; end if;
end $$;
revoke all on function public.prepara_verbale_cda(uuid,uuid[]),public.vota_verbale_cda(uuid),public.finalizza_verbale_cda(uuid,text) from public,anon;
grant execute on function public.prepara_verbale_cda(uuid,uuid[]),public.vota_verbale_cda(uuid),public.finalizza_verbale_cda(uuid,text) to authenticated;

create or replace function public.cda_anagrafiche_membri()
 returns table(persona_id uuid,nome text,cognome text,carica text,dal date,al date)
 language sql stable security definer set search_path='' as $$
 select p.id,p.nome,p.cognome,c.carica,c.dal,c.al from public.cda_componenti c join public.persone p on p.id=c.persona_id
 where public.is_staff() or public.is_board();
$$;
revoke all on function public.cda_anagrafiche_membri() from public,anon;
grant execute on function public.cda_anagrafiche_membri() to authenticated;

create or replace function public.cda_progressi()
 returns table(verbale_id uuid,totali bigint,approvati bigint)
 language sql stable security definer set search_path='' as $$
 select v.id,(select count(*) from public.cda_votanti a where a.verbale_id=v.id),
 (select count(*) from public.cda_voti q where q.verbale_id=v.id)
 from public.cda_verbali v where public.is_staff() or public.is_board();
$$;
revoke all on function public.cda_progressi() from public,anon;
grant execute on function public.cda_progressi() to authenticated;
-- MOD 21-25: catalogo moduli e composizione lezioni.
create table if not exists public.moduli_didattici(
 id uuid primary key default gen_random_uuid(),pre_id varchar(6) not null unique,
 tipo text not null check(tipo in ('Piscina','Teoria')),
 codice text not null,titolo text not null,descrizione text not null,
 creato_il timestamptz not null default now()
);
create table if not exists public.lezione_moduli(
 lezione_id uuid not null references public.lezioni(id) on delete restrict,
 modulo_id uuid not null references public.moduli_didattici(id) on delete restrict,
 ordine integer not null check(ordine>=1),
 primary key(lezione_id,modulo_id),unique(lezione_id,ordine)
);
alter table public.moduli_didattici enable row level security;
alter table public.lezione_moduli enable row level security;
create policy moduli_read on public.moduli_didattici for select to authenticated using(true);
create policy moduli_staff_write on public.moduli_didattici for insert to authenticated with check(public.is_staff());
create policy moduli_staff_update on public.moduli_didattici for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy lezione_moduli_read on public.lezione_moduli for select to authenticated using(public.is_staff() or
 exists(select 1 from public.lezioni l where l.id=lezione_id and (public.insegna_edizione(l.edizione_id) or public.iscritto_edizione(l.edizione_id))));
create or replace function public.imposta_moduli_lezione(p_lezione uuid,p_moduli uuid[])
 returns void language plpgsql security definer set search_path='' as $$
declare v uuid; i int:=0;
begin
 if not public.is_staff() then raise exception 'Solo staff'; end if;
 if not exists(select 1 from public.lezioni where id=p_lezione and annullata_il is null) then raise exception 'Lezione non trovata'; end if;
 if cardinality(p_moduli)>50 or cardinality(p_moduli)<>(select count(distinct x) from unnest(p_moduli) x) then raise exception 'Moduli duplicati o eccessivi'; end if;
 delete from public.lezione_moduli where lezione_id=p_lezione;
 foreach v in array p_moduli loop i:=i+1;insert into public.lezione_moduli(lezione_id,modulo_id,ordine) values(p_lezione,v,i);end loop;
end $$;
revoke all on function public.imposta_moduli_lezione(uuid,uuid[]) from public,anon;
grant execute on function public.imposta_moduli_lezione(uuid,uuid[]) to authenticated;

-- MOD 26-28: staging rigorosamente riservato alla segreteria.
create table if not exists public.importazioni_batch(
 id uuid primary key default gen_random_uuid(),tipo text not null check(tipo in ('soci','corsi')),
 creato_da uuid not null references auth.users(id),creato_il timestamptz not null default now(),
 stato text not null default 'anteprima' check(stato in ('anteprima','importato')),
 base_documentale_verificata boolean not null default false
);
create table if not exists public.importazioni_righe(
 id uuid primary key default gen_random_uuid(),batch_id uuid not null references public.importazioni_batch(id) on delete cascade,
 numero integer not null,dati jsonb not null,errori jsonb not null default '[]'::jsonb,
 importato_id uuid,unique(batch_id,numero)
);
alter table public.importazioni_batch enable row level security;
alter table public.importazioni_righe enable row level security;
create policy import_batch_staff_read on public.importazioni_batch for select to authenticated using(public.is_staff());
create policy import_batch_staff_insert on public.importazioni_batch for insert to authenticated with check(public.is_staff() and creato_da=auth.uid());
create policy import_righe_staff_read on public.importazioni_righe for select to authenticated using(public.is_staff());
create policy import_righe_staff_insert on public.importazioni_righe for insert to authenticated with check(public.is_staff() and exists(select 1 from public.importazioni_batch b where b.id=batch_id and b.creato_da=auth.uid() and b.stato='anteprima'));
create table if not exists public.provenienza_accettazioni_storiche(
 persona_id uuid primary key references public.persone(id),statuto_accettato boolean not null default false,
 informativa_ricevuta boolean not null default false,
 fonte text not null,verifica_documentale boolean not null default false,
 importato_il timestamptz not null default now()
);
alter table public.provenienza_accettazioni_storiche enable row level security;
create policy accettazioni_storiche_staff on public.provenienza_accettazioni_storiche for select to authenticated using(public.is_staff());

create or replace function public.cf_storici_esistenti(p_cf text[])
 returns table(codice_fiscale text) language sql stable security definer set search_path='' as $$
 select distinct upper(p.codice_fiscale) from public.persone p where public.is_staff() and upper(p.codice_fiscale)=any(p_cf);
$$;
revoke all on function public.cf_storici_esistenti(text[]) from public,anon;
grant execute on function public.cf_storici_esistenti(text[]) to authenticated;
create or replace function public.conferma_importazione(p_batch uuid)
 returns integer language plpgsql security definer set search_path='' as $$
declare b public.importazioni_batch%rowtype;r public.importazioni_righe%rowtype; p uuid;e uuid;n int:=0;oldp uuid;v text;
begin
 if not public.is_staff() then raise exception 'Non autorizzato'; end if;
 select * into b from public.importazioni_batch where id=p_batch for update;
 if not found or b.stato<>'anteprima' then raise exception 'Importazione non disponibile'; end if;
 if exists(select 1 from public.importazioni_righe where batch_id=p_batch and jsonb_array_length(errori)>0)
 then raise exception 'Correggere prima le righe in quarantena'; end if;
 if not exists(select 1 from public.importazioni_righe where batch_id=p_batch) then raise exception 'File vuoto'; end if;
 for r in select * from public.importazioni_righe where batch_id=p_batch order by numero loop
  v:=upper(btrim(r.dati->>'codice_fiscale'));
  if v is null or v !~ '^[A-Z0-9]{16}$' then raise exception 'Codice fiscale non valido'; end if;
  if b.tipo='soci' then
   if not b.base_documentale_verificata then raise exception 'Base documentale delle dichiarazioni storiche non attestata'; end if;
   if exists(select 1 from public.persone where upper(codice_fiscale)=v) then raise exception 'Codice fiscale già presente'; end if;
   insert into public.persone(nome,cognome,codice_fiscale,data_nascita,luogo_nascita,email,telefono,
       provincia_nascita,stato_nascita,provincia_residenza,stato_residenza)
   values(r.dati->>'nome',r.dati->>'cognome',v,nullif(r.dati->>'data_nascita','')::date,
     nullif(r.dati->>'luogo_nascita',''),nullif(r.dati->>'email',''),nullif(r.dati->>'telefono',''),
     nullif(upper(r.dati->>'provincia_nascita'),''),nullif(r.dati->>'stato_nascita',''),
     nullif(upper(r.dati->>'provincia_residenza'),''),nullif(r.dati->>'stato_residenza','')) returning id into p;
   insert into public.provenienza_accettazioni_storiche(persona_id,statuto_accettato,informativa_ricevuta,fonte,verifica_documentale)
   values(p,true,true,'importazione_storica_access',true);
  else
   select id into p from public.persone where upper(codice_fiscale)=v;
   if p is null then raise exception 'Allievo assente in anagrafica'; end if;
   e:=(r.dati->>'edizione_id')::uuid;
   if not exists(select 1 from public.edizioni_corsi where id=e) then raise exception 'Edizione non esistente'; end if;
   if exists(select 1 from public.iscrizioni_corsi where edizione_id=e and persona_id=p) then raise exception 'Iscrizione già esistente'; end if;
   insert into public.iscrizioni_corsi(edizione_id,persona_id,stato,note)
   values(e,p,'concluso','Importazione storico corsi') returning id into oldp;
   if nullif(r.dati->>'brevetto','') is not null then
    insert into public.brevetti_allievi(persona_id,titolo,ottenuto_il) values(p,r.dati->>'brevetto',nullif(r.dati->>'data_brevetto','')::date);
   end if;
   p:=oldp;
  end if;
  update public.importazioni_righe set importato_id=p where id=r.id;
  n:=n+1;
 end loop;
 update public.importazioni_batch set stato='importato' where id=p_batch;
 return n;
end $$;
revoke all on function public.conferma_importazione(uuid) from public,anon;
grant execute on function public.conferma_importazione(uuid) to authenticated;

-- Il consigliere può caricare il PDF soltanto quando il quorum è completo,
-- soltanto nel percorso canonico del verbale sul quale ha votato.
create or replace function public.puo_generare_pdf_cda(p_name text)
 returns boolean language sql stable security definer set search_path='' as $$
 select public.is_board() and exists(
  select 1 from public.cda_verbali v
  join public.cda_voti mio on mio.verbale_id=v.id and mio.utente_id=auth.uid()
  where v.stato='in_approvazione' and p_name=v.id::text||'/definitivo.pdf'
  and (select count(*) from public.cda_voti x where x.verbale_id=v.id)
     =(select count(*) from public.cda_votanti x where x.verbale_id=v.id));
$$;
revoke all on function public.puo_generare_pdf_cda(text) from public,anon;
grant execute on function public.puo_generare_pdf_cda(text) to authenticated;
-- Risorse private per verbali: nessun documento CdA pubblico.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('sesto-cda','sesto-cda',false,10485760,array[
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/pdf'])
 on conflict(id) do nothing;
create policy sesto_cda_read on storage.objects for select to authenticated
 using(bucket_id='sesto-cda' and (public.is_staff() or public.is_board()));
create policy sesto_cda_insert on storage.objects for insert to authenticated
 with check(bucket_id='sesto-cda' and (public.is_staff() or (storage.extension(name)='pdf' and public.puo_generare_pdf_cda(name))));

-- Protezione da letture laterali: la lista completa degli inventari non è autorizzata agli istruttori.
drop policy if exists attrezzature_read on public.attrezzature;
create policy attrezzature_read on public.attrezzature for select to authenticated using(public.is_staff());
drop policy if exists revisioni_attrezzature_read on public.revisioni_attrezzature;
create policy revisioni_attrezzature_read on public.revisioni_attrezzature for select to authenticated using(public.is_staff());
drop policy if exists assegnazioni_attrezzature_read on public.assegnazioni_attrezzature;
create policy assegnazioni_attrezzature_read on public.assegnazioni_attrezzature for select to authenticated using(public.is_staff());
-- Il documento didattico riservato ai soli corsi assegnati.
drop policy if exists documenti_read on public.documenti;
create policy documenti_read on public.documenti for select to authenticated using(
 public.is_staff() or utente_id=auth.uid() or
 (visibilita='soci' and ((ambito='associazione' and exists(select 1 from public.ruoli_utente r where r.utente_id=auth.uid() and r.ruolo='socio'))
 or (edizione_id is not null and public.iscritto_edizione(edizione_id)))) or
 (visibilita='istruttori' and edizione_id is not null and public.insegna_edizione(edizione_id)));

commit;
-- Nota post-commit: il flag override fiscale è motivato nell'app; campi storici non validati automaticamente.
