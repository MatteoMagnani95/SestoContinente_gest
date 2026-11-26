begin;

-- Chiavi naturali. I duplicati precedenti alla migrazione rimangono consultabili.
create function public.nome_corso_normalizzato(text) returns text
language sql immutable strict parallel safe set search_path='' as $$
 select lower(btrim(regexp_replace($1,'[[:space:]]+',' ','g')))
$$;
alter table public.corsi add column duplicato_storico boolean not null default false;
alter table public.edizioni_corsi add column duplicato_storico boolean not null default false,
 add column direttore_id uuid references public.persone(id);
with ranked as (select id,row_number() over(partition by tipo,coalesce(livello,0),public.nome_corso_normalizzato(nome) order by creato_il,id) n from public.corsi)
update public.corsi c set duplicato_storico=true from ranked r where c.id=r.id and r.n>1;
with ranked as (select id,row_number() over(partition by corso_id,stagione_id,inizio,fine,public.nome_corso_normalizzato(nome) order by creato_il,id) n from public.edizioni_corsi)
update public.edizioni_corsi e set duplicato_storico=true from ranked r where e.id=r.id and r.n>1;
create unique index catalogo_identita on public.corsi(tipo,coalesce(livello,0),public.nome_corso_normalizzato(nome)) where not duplicato_storico;
create unique index edizione_identita on public.edizioni_corsi(corso_id,stagione_id,inizio,fine,public.nome_corso_normalizzato(nome)) where not duplicato_storico;

create function public.controlla_identita_corso() returns trigger language plpgsql set search_path='' as $$
declare altro uuid;
begin
 if tg_op='UPDATE' then
  new.duplicato_storico:=old.duplicato_storico;
  if tg_table_name='corsi' then
   if (new.tipo,new.livello,public.nome_corso_normalizzato(new.nome)) is not distinct from
      (old.tipo,old.livello,public.nome_corso_normalizzato(old.nome)) then return new; end if;
  elsif (new.corso_id,new.stagione_id,new.inizio,new.fine,public.nome_corso_normalizzato(new.nome)) is not distinct from
        (old.corso_id,old.stagione_id,old.inizio,old.fine,public.nome_corso_normalizzato(old.nome)) then return new; end if;
 end if;
 new.duplicato_storico:=false;
 if tg_table_name='corsi' then
  select id into altro from public.corsi where id<>new.id and tipo=new.tipo and livello is not distinct from new.livello
   and public.nome_corso_normalizzato(nome)=public.nome_corso_normalizzato(new.nome) order by duplicato_storico,id limit 1;
 else
  select id into altro from public.edizioni_corsi where id<>new.id and corso_id=new.corso_id and stagione_id=new.stagione_id and inizio=new.inizio and fine=new.fine
   and public.nome_corso_normalizzato(nome)=public.nome_corso_normalizzato(new.nome) order by duplicato_storico,id limit 1;
 end if;
 if altro is not null then raise exception 'Questo corso esiste già' using errcode='P3419',detail=altro::text; end if;
 return new;
end $$;
create trigger identita_catalogo before insert or update on public.corsi for each row execute function public.controlla_identita_corso();
create trigger identita_edizione before insert or update on public.edizioni_corsi for each row execute function public.controlla_identita_corso();

create function public.verifica_direttore() returns trigger language plpgsql security definer set search_path='' as $$
declare direttore uuid;
begin
 if tg_table_name='edizioni_corsi' then
  if new.direttore_id is null and (tg_op='INSERT' or old.direttore_id is not null) then raise exception 'Seleziona il direttore del corso' using errcode='P3420'; end if;
  if exists(select 1 from public.iscrizioni_corsi where edizione_id=new.id and persona_id=new.direttore_id and stato in ('iscritto','in_attesa','concluso')) then raise exception 'La persona scelta è già allieva di questa edizione' using errcode='P3421'; end if;
 elsif new.stato in ('iscritto','in_attesa','concluso') then
  select direttore_id into direttore from public.edizioni_corsi where id=new.edizione_id for update;
  if direttore=new.persona_id then raise exception 'Il direttore non può essere allievo dello stesso corso' using errcode='P3421'; end if;
 end if;
 return new;
end $$;
create trigger direttore_edizione before insert or update of direttore_id on public.edizioni_corsi for each row execute function public.verifica_direttore();
create trigger direttore_allievo before insert or update of edizione_id,persona_id,stato on public.iscrizioni_corsi for each row execute function public.verifica_direttore();

alter table public.brevetti_allievi add column edizione_id uuid references public.edizioni_corsi(id),
 add column rilasciato_da_id uuid references public.persone(id), add column rilasciato_da_nome text;
create function public.firma_brevetto() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  select p.id,concat_ws(' ',p.nome,p.cognome) into new.rilasciato_da_id,new.rilasciato_da_nome
  from public.edizioni_corsi e join public.persone p on p.id=e.direttore_id where e.id=new.edizione_id for share of e,p;
  if not found or not exists(select 1 from public.iscrizioni_corsi where edizione_id=new.edizione_id and persona_id=new.persona_id and stato in ('iscritto','concluso')) then
   raise exception 'Seleziona un corso con direttore frequentato dall’allievo' using errcode='P3422'; end if;
 elsif (new.edizione_id,new.persona_id) is distinct from (old.edizione_id,old.persona_id) then raise exception 'Brevetto già rilasciato' using errcode='P3422';
 else new.rilasciato_da_nome:=old.rilasciato_da_nome; new.rilasciato_da_id:=old.rilasciato_da_id; end if;
 return new;
end $$;
create trigger firma_brevetto before insert or update on public.brevetti_allievi for each row execute function public.firma_brevetto();
create or replace view public.gest_elenco_brevetti_allievi with(security_invoker=true) as
 select t.id,t.persona_id,t.titolo,t.ente,t.numero_brevetto,t.ottenuto_il,t.scade_il,t.note,p.cognome as sort_cognome,p.nome as sort_nome,t.edizione_id,t.rilasciato_da_nome
 from public.brevetti_allievi t left join public.persone p on p.id=t.persona_id;


-- Dichiarazioni per account e fotografia delle scelte nella richiesta.
create table public.scelte_iscrizione(
 id bigint generated always as identity primary key, utente_id uuid not null references auth.users(id) on delete cascade,
 tipo text not null check(tipo in ('privacy','immagini')), scelta boolean not null, versione text not null check(length(versione) between 1 and 200),
 registrata_il timestamptz not null default now()
);
alter table public.scelte_iscrizione enable row level security;
revoke all on public.scelte_iscrizione from public,anon,authenticated;
grant select on public.scelte_iscrizione to authenticated;
create policy scelte_lettura on public.scelte_iscrizione for select to authenticated using(public.is_staff() or (utente_id=auth.uid() and public.account_corrente_abilitato()));
create index scelte_recenti on public.scelte_iscrizione(utente_id,tipo,id desc);
create function public.scelte_alla_registrazione() returns trigger language plpgsql security definer set search_path='' as $$
declare m jsonb:=new.raw_user_meta_data;
begin
 if m->>'presa_visione'='si' and length(m->>'versione_privacy') between 1 and 200 then
  insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione) values(new.id,'privacy',true,m->>'versione_privacy');
  if m->>'immagini' in ('si','no') and length(m->>'versione_immagini') between 1 and 200 then
   insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione) values(new.id,'immagini',m->>'immagini'='si',m->>'versione_immagini');
  end if;
 end if;
 return new;
end $$;
create trigger scelte_registrazione after insert on auth.users for each row execute function public.scelte_alla_registrazione();
alter table public.richieste add column immagini_scelta boolean,add column immagini_versione text,add column immagini_il timestamptz,
 add column emergenza_nome text,add column emergenza_telefono text;
-- Il consenso storico resta consultabile con la sua finalità originale nelle richieste.
create table public.contatti_emergenza(
 persona_id uuid primary key references public.persone(id) on delete cascade,
 nominativo text not null check(length(btrim(nominativo)) between 2 and 160),
 telefono text not null check(telefono ~ '^[+0-9() ./-]{5,32}$' and length(regexp_replace(telefono,'[^0-9]','','g'))>=5)
);
alter table public.contatti_emergenza enable row level security;
revoke all on public.contatti_emergenza from public,anon,authenticated;
grant select,insert,update on public.contatti_emergenza to authenticated;
create policy contatti_lettura on public.contatti_emergenza for select to authenticated using(public.is_staff() or public.owns_person(persona_id));
create policy contatti_ins on public.contatti_emergenza for insert to authenticated with check(public.is_staff() or public.owns_person(persona_id));
create policy contatti_upd on public.contatti_emergenza for update to authenticated using(public.is_staff() or public.owns_person(persona_id)) with check(public.is_staff() or public.owns_person(persona_id));
create function public.trasferisci_contatto() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.stato='approvata' and old.stato is distinct from new.stato and new.persona_id is not null and new.emergenza_nome is not null then
  insert into public.contatti_emergenza values(new.persona_id,new.emergenza_nome,new.emergenza_telefono) on conflict(persona_id) do update set nominativo=excluded.nominativo,telefono=excluded.telefono;
 end if; return new;
end $$;
create trigger contatto_approvato after update on public.richieste for each row execute function public.trasferisci_contatto();

create function public.scegli_immagini(p_scelta boolean,p_versione text) returns void language plpgsql security definer set search_path='' as $$
declare precedente public.scelte_iscrizione%rowtype;
begin
 if not public.account_corrente_abilitato() or p_scelta is null or nullif(btrim(p_versione),'') is null then raise exception 'Scelta non valida'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,19));
 select * into precedente from public.scelte_iscrizione where utente_id=auth.uid() and tipo='immagini' order by id desc limit 1;
 if (precedente.scelta,precedente.versione) is distinct from (p_scelta,p_versione) then
  insert into public.scelte_iscrizione(utente_id,tipo,scelta,versione) values(auth.uid(),'immagini',p_scelta,p_versione);
 end if;
end $$;
create function public.salva_domanda_v19(
 p_nome text,p_cognome text,p_data_nascita date,p_luogo_nascita text,p_codice_fiscale text,p_indirizzo text,p_cap text,p_comune text,p_telefono text,
 p_nome_tutore text,p_cognome_tutore text,p_parentela_tutore text,p_flag_statuto boolean,p_flag_privacy boolean,p_flag_immagini boolean,
 p_versione_statuto text,p_versione_privacy text,p_invia boolean,p_provincia_nascita text,p_stato_nascita text,p_sesso_cf text,
 p_versione_immagini text,p_emergenza_nome text,p_emergenza_telefono text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid; scelta public.scelte_iscrizione%rowtype;
begin
 if not public.account_corrente_abilitato() or nullif(btrim(p_stato_nascita),'') is null or length(p_stato_nascita)>100
 or (p_provincia_nascita is not null and p_provincia_nascita !~ '^[A-Z]{2}$') or (p_sesso_cf is not null and p_sesso_cf not in ('M','F'))
 or ((coalesce(btrim(p_emergenza_nome),'')<>'' or coalesce(btrim(p_emergenza_telefono),'')<>'') and
 (length(btrim(coalesce(p_emergenza_nome,''))) not between 2 and 160 or coalesce(p_emergenza_telefono,'') !~ '^[+0-9() ./-]{5,32}$'
 or length(regexp_replace(p_emergenza_telefono,'[^0-9]','','g'))<5)) then raise exception 'Controlla i dati e il contatto di emergenza' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,19));
 if p_flag_immagini is not null then perform public.scegli_immagini(p_flag_immagini,p_versione_immagini); end if;
 select * into scelta from public.scelte_iscrizione where utente_id=auth.uid() and tipo='immagini' and versione=p_versione_immagini order by id desc limit 1;
 v:=public.salva_domanda_v12(p_nome,p_cognome,p_data_nascita,p_luogo_nascita,p_codice_fiscale,p_indirizzo,p_cap,p_comune,p_telefono,p_nome_tutore,p_cognome_tutore,p_parentela_tutore,
 p_flag_statuto,p_flag_privacy,coalesce(scelta.scelta,false),p_versione_statuto,p_versione_privacy,p_invia);
 update public.richieste set provincia_nascita=p_provincia_nascita,stato_nascita=p_stato_nascita,sesso_cf=p_sesso_cf,emergenza_nome=nullif(btrim(p_emergenza_nome),''),emergenza_telefono=nullif(btrim(p_emergenza_telefono),''),
 immagini_scelta=scelta.scelta,immagini_versione=scelta.versione,immagini_il=scelta.registrata_il where id=v;
 return v;
end $$;
-- Le vecchie RPC restano interne per le transizioni già implementate.
revoke execute on function public.salva_domanda(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean),
 public.salva_domanda_v12(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean),
 public.salva_domanda_v13(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text)
 from public,anon,authenticated;


alter table public.certificati_medici add column esito_verifica text check(esito_verifica in ('valido','non_valido','in_attesa'));
create function public.controlla_certificato() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.documento_id is not null and (tg_op='INSERT' or (old.documento_id,old.persona_id) is distinct from (new.documento_id,new.persona_id)) then
  if not exists(select 1 from public.documenti d where d.id=new.documento_id and d.persona_id=new.persona_id and d.ambito='personale'
   and d.visibilita='proprietario' and d.categoria='Certificato medico' and d.mime in ('application/pdf','image/jpeg')
   and exists(select 1 from storage.objects o where o.bucket_id='sesto-documenti' and o.name=d.percorso_storage)) then raise exception 'Documento del titolare non disponibile' using errcode='23514'; end if;
  new.esito_verifica:='in_attesa'; new.idoneita_verificata:=false;
 elsif new.documento_id is null then new.esito_verifica:='non_valido'; new.idoneita_verificata:=false;
 elsif new.esito_verifica is not null then new.idoneita_verificata:=new.esito_verifica='valido';
 end if;
 return new;
end $$;
create trigger verifica_documento_medico before insert or update on public.certificati_medici for each row execute function public.controlla_certificato();
create view public.stato_certificati with(security_invoker=true) as
 select c.*,p.cognome as sort_cognome,p.nome as sort_nome,
 case when c.documento_id is null then 'mancante'
 when c.scade_il<(now() at time zone 'Europe/Rome')::date then 'scaduto'
 when c.esito_verifica='non_valido' then 'non_valido' when c.idoneita_verificata then 'valido'
 else 'in_attesa' end as stato_certificato
 from public.certificati_medici c left join public.persone p on p.id=c.persona_id;
grant select on public.stato_certificati to authenticated;
create view public.allievi_senza_certificato with(security_invoker=true) as
 select p.id,p.nome,p.cognome from public.persone p where public.is_staff() and
 exists(select 1 from public.iscrizioni_corsi i where i.persona_id=p.id and i.stato in ('in_attesa','iscritto','concluso'))
 and not exists(select 1 from public.certificati_medici c where c.persona_id=p.id);
grant select on public.allievi_senza_certificato to authenticated;

create or replace function public.registra_certificato_personale(p_persona uuid,p_documento uuid,p_rilasciato date,p_scade date)
returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid;
begin
 if not (public.owns_person(p_persona) or public.is_staff()) or p_rilasciato>current_date or p_scade<p_rilasciato then raise exception 'Dati non validi'; end if;
 perform 1 from public.documenti where id=p_documento and caricato_da=auth.uid() and persona_id=p_persona
 and split_part(percorso_storage,'/',2)='certificati'
 and exists(select 1 from storage.objects o where o.bucket_id='sesto-documenti' and o.name=documenti.percorso_storage) for update;
 if not found or exists(select 1 from public.certificati_medici where documento_id=p_documento) then raise exception 'Documento non disponibile'; end if;
 insert into public.certificati_medici(persona_id,documento_id,rilasciato_il,scade_il) values(p_persona,p_documento,p_rilasciato,p_scade) returning id into v;
 return v;
end $$;
create policy caricamento_medico_controllato on storage.objects as restrictive for insert to authenticated with check
 (bucket_id<>'sesto-documenti' or split_part(name,'/',2)<>'certificati');
-- Per i documenti medici il browser riceve i byte dalla route autenticata.
create function public.documento_sanitario(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.documenti d where d.id=p_id and d.categoria='Certificato medico')
 or exists(select 1 from public.certificati_medici c where c.documento_id=p_id)
$$;
create function public.legge_certificato(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_staff() or (public.account_corrente_abilitato() and
  (exists(select 1 from public.certificati_medici c where c.documento_id=p_id and public.owns_person(c.persona_id))
  or exists(select 1 from public.documenti d where d.id=p_id and d.utente_id=auth.uid() and public.owns_person(d.persona_id))))
$$;
create policy documento_medico_riservato on public.documenti as restrictive for select to authenticated
 using(not public.documento_sanitario(id) or public.legge_certificato(id));
create policy documento_medico_titolare on public.documenti for select to authenticated using(public.documento_sanitario(id) and public.legge_certificato(id));
create function public.percorso_sanitario(p_percorso text) returns boolean language sql stable security definer set search_path='' as $$
 select split_part(p_percorso,'/',2) in ('certificati','transito') or exists(
 select 1 from public.documenti d where d.percorso_storage=p_percorso and public.documento_sanitario(d.id))
$$;
create policy file_medico_solo_server on storage.objects as restrictive for select to authenticated
 using(bucket_id<>'sesto-documenti' or not public.percorso_sanitario(name));
-- Difende anche lo storage da un secondo metadata con un percorso arbitrario.
create policy percorsi_upload_personali on public.documenti as restrictive for insert to authenticated
 with check(split_part(percorso_storage,'/',1)=auth.uid()::text and split_part(percorso_storage,'/',2)<>'transito');
create function public.proteggi_file_medico() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if public.documento_sanitario(old.id) and (new.categoria,new.ambito,new.visibilita,new.percorso_storage,new.persona_id,new.utente_id,new.mime)
 is distinct from (old.categoria,old.ambito,old.visibilita,old.percorso_storage,old.persona_id,old.utente_id,old.mime)
 then raise exception 'Documento medico protetto'; end if;
 return new;
end $$;
create trigger file_medico_immutabile before update on public.documenti for each row execute function public.proteggi_file_medico();

-- Votazione per documento. Ogni revisione di una seduta già sottoposta ha un nuovo identificatore.
alter table public.cda_verbali add column precedente_id uuid unique references public.cda_verbali(id),
 add column adesioni_storiche uuid[],drop constraint cda_verbali_stato_check,
 add check(stato in ('bozza','in_approvazione','approvato','sostituito'));
create table public.cda_letture(verbale_id uuid,utente_id uuid,percorso_docx text not null,letta_il timestamptz not null default now(),
 primary key(verbale_id,utente_id),foreign key(verbale_id,utente_id) references public.cda_votanti(verbale_id,utente_id));
alter table public.cda_letture enable row level security;
revoke all on public.cda_letture from public,anon,authenticated;
create function public.leggi_versione_cda(p_verbale uuid,p_docx text,p_utente uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_utente is null then return; end if;
 perform 1 from public.cda_verbali where id=p_verbale and stato='in_approvazione' and percorso_docx=p_docx for share;
 if found and exists(select 1 from public.cda_votanti where verbale_id=p_verbale and utente_id=p_utente) then
  insert into public.cda_letture(verbale_id,utente_id,percorso_docx) values(p_verbale,p_utente,p_docx) on conflict do nothing;
 end if;
end $$;
revoke execute on function public.vota_verbale_cda(uuid) from public,anon,authenticated;
create or replace function public.finalizza_verbale_cda(p_verbale uuid,p_percorso_pdf text)
 returns void language plpgsql security definer set search_path='' as $$
declare v public.cda_verbali%rowtype;
begin
 if not (public.is_staff() or public.is_board()) then raise exception 'Non autorizzato'; end if;
 select * into v from public.cda_verbali where id=p_verbale for update;
 if not found or v.stato<>'in_approvazione' or p_percorso_pdf is null or
 p_percorso_pdf not in (v.id::text||'/definitivo.pdf',regexp_replace(v.percorso_docx,'[.]docx$','.deliberato.pdf')) or
 not exists(select 1 from public.cda_votanti where verbale_id=v.id) or
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
create function public.approva_versione_cda(p_verbale uuid,p_docx text) returns boolean language plpgsql security definer set search_path='' as $$
declare pronto boolean; pdf text:=regexp_replace(p_docx,'[.]docx$','.deliberato.pdf');
begin
 perform 1 from public.cda_verbali where id=p_verbale and percorso_docx=p_docx and stato='in_approvazione' for update;
 if not found or not exists(select 1 from public.cda_letture where verbale_id=p_verbale and utente_id=auth.uid() and percorso_docx=p_docx)
 then raise exception 'Apri la versione corrente prima di approvare'; end if;
 pronto:=public.vota_verbale_cda(p_verbale);
 if pronto and exists(select 1 from storage.objects where bucket_id='sesto-cda' and name=pdf) then
  perform public.finalizza_verbale_cda(p_verbale,pdf);
 end if;return pronto;
end $$;
create function public.firme_verbale(p_verbale uuid) returns table(utente_id uuid,nominativo text,votato_il timestamptz)
language sql stable security definer set search_path='' as $$
 select v.utente_id,concat_ws(' ',p.nome,p.cognome),s.votato_il from public.cda_votanti v join public.persone p on p.id=v.persona_id
 left join public.cda_voti s using(verbale_id,utente_id) where v.verbale_id=p_verbale and (public.is_staff() or public.is_board()) order by p.cognome,p.nome
$$;
create policy bozza_iniziale on public.cda_verbali as restrictive for insert to authenticated with check(stato='bozza' and precedente_id is null and approvato_il is null);
create function public.sostituisci_verbale(p_vecchio uuid,p_docx text,p_nuovo uuid) returns void language plpgsql security definer set search_path='' as $$
declare v public.cda_verbali%rowtype; ids uuid[]; path text:=p_nuovo::text||'/bozza.docx';
begin
 if not public.is_staff() then raise exception 'Solo segreteria'; end if;
 select * into v from public.cda_verbali where id=p_vecchio for update;
 if not found or v.percorso_docx<>p_docx or v.stato not in ('approvato','in_approvazione') or exists(select 1 from public.cda_verbali where precedente_id=v.id)
 or not exists(select 1 from storage.objects where bucket_id='sesto-cda' and name=path)
 or not exists(select 1 from storage.objects where bucket_id='sesto-cda' and name=p_nuovo::text||'/bozza.anteprima.pdf')
 then raise exception 'Versione non disponibile'; end if;
 insert into public.cda_verbali(id,precedente_id,data_consiglio,oggetto,tipo,percorso_docx,creato_da) values(p_nuovo,v.id,v.data_consiglio,v.oggetto,v.tipo,path,auth.uid());
 if v.stato='in_approvazione' then
  select array_agg(adesione_id) into ids from public.cda_adesioni where verbale_id=v.id;
  update public.cda_verbali set stato='sostituito',adesioni_storiche=ids where id=v.id;
  delete from public.cda_adesioni where verbale_id=v.id;
 end if;
 perform public.prepara_verbale_cda(p_nuovo,coalesce(ids,'{}'));
end $$;


alter table public.registro_operazioni add column corso_id uuid,add column socio_id uuid,add column verbale_id uuid,
 add column campi text[],add column azione text,add column autore text;
create index cronologia_corso on public.registro_operazioni(corso_id,id desc) where corso_id is not null;
create index cronologia_socio on public.registro_operazioni(socio_id,id desc) where socio_id is not null;
create index cronologia_verbale on public.registro_operazioni(verbale_id,id desc) where verbale_id is not null;
create or replace function public.registra_operazione() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 campi text[]; attore text; evento text; corso uuid; socio uuid; verbale uuid;
begin
 if tg_table_name='edizioni_corsi' then
  corso:=(r->>'id')::uuid;
  if tg_op='UPDATE' then select array_agg(k order by k) into campi from jsonb_object_keys(r) k where r->k is distinct from to_jsonb(old)->k;
   if campi is null then return new; end if;
  end if;
  evento:=case tg_op when 'UPDATE' then 'Modifica del corso' when 'DELETE' then 'Rimozione del corso' else 'Creazione del corso' end;
 elsif tg_table_name in ('iscrizioni_corsi','assegnazioni_istruttori','brevetti_allievi','certificati_medici','persone','contatti_emergenza') then
  corso:=(r->>'edizione_id')::uuid; socio:=coalesce((r->>'persona_id')::uuid,(r->>'id')::uuid);
  evento:=case tg_table_name when 'iscrizioni_corsi' then case when tg_op='DELETE' then 'Rimozione allievo' else 'Iscrizione · '||(r->>'stato') end
  when 'assegnazioni_istruttori' then 'Incarico istruttore' when 'brevetti_allievi' then case tg_op when 'INSERT' then 'Rilascio brevetto' else 'Aggiornamento brevetto' end
  when 'certificati_medici' then case when tg_op='DELETE' then 'Rimozione certificato' when tg_op='INSERT' or r->'documento_id' is distinct from to_jsonb(old)->'documento_id' then 'Registrazione certificato'
  when r->'esito_verifica' is distinct from to_jsonb(old)->'esito_verifica' then 'Verifica certificato · '||(r->>'esito_verifica') else 'Modifica certificato' end
  when 'contatti_emergenza' then 'Aggiornamento contatto di emergenza' else 'Anagrafica socio' end;
 elsif tg_table_name in ('cda_voti','cda_verbali') then
  verbale:=coalesce((r->>'verbale_id')::uuid,(r->>'id')::uuid);
  evento:=case when tg_table_name='cda_voti' then 'Approvazione individuale del verbale' else 'Verbale · '||(r->>'stato') end;
 end if;
 select coalesce((select concat_ws(' ',p.nome,p.cognome) from public.collegamenti_persone cp join public.persone p on p.id=cp.persona_id
 where cp.utente_id=u.id and cp.relazione='titolare' order by p.id limit 1),u.email) into attore from auth.users u where u.id=auth.uid();
 insert into public.registro_operazioni(utente_id,tabella,operazione,record_id,corso_id,socio_id,verbale_id,campi,azione,autore)
 values(auth.uid(),tg_table_name,tg_op,coalesce((r->>'id')::uuid,verbale,socio),corso,socio,verbale,campi,evento,attore);
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger audit_verbali_19 after insert or update on public.cda_verbali for each row execute function public.registra_operazione();
create trigger audit_firme_19 after insert on public.cda_voti for each row execute function public.registra_operazione();
create trigger audit_emergenza_19 after insert or update on public.contatti_emergenza for each row execute function public.registra_operazione();
create function public.cronologia_scheda(p_tipo text,p_id uuid) returns table(id bigint,registrata_il timestamptz,autore text,azione text,campi text[])
language sql stable security definer set search_path='' as $$
 select o.id,o.registrata_il,coalesce(o.autore,o.utente_id::text,'Autore non registrato'),
 coalesce(o.azione,case o.operazione when 'INSERT' then 'Creazione' when 'UPDATE' then 'Modifica' when 'DELETE' then 'Rimozione' else o.operazione end),o.campi
 from public.registro_operazioni o where
 (p_tipo='corso' and public.is_staff() and (o.corso_id=p_id or (o.tabella='edizioni_corsi' and o.record_id=p_id)))
 or (p_tipo='socio' and public.is_staff() and (o.socio_id=p_id or (o.tabella='persone' and o.record_id=p_id)))
 or (p_tipo='certificato' and o.tabella='certificati_medici' and o.record_id=p_id and
 exists(select 1 from public.certificati_medici c where c.id=p_id and (public.is_staff() or public.owns_person(c.persona_id))))
 or (p_tipo='verbale' and o.verbale_id=p_id and (public.is_board() or public.is_staff()))
 order by o.id desc
$$;
create function public.cerca_corso_esistente(p_tabella text,p_dati jsonb) returns uuid language plpgsql stable set search_path='' as $$
declare v uuid;
begin
 if not public.is_staff() then return null; end if;
 if p_tabella='corsi' then
 select id into v from public.corsi where tipo=p_dati->>'tipo' and livello is not distinct from (p_dati->>'livello')::smallint and public.nome_corso_normalizzato(nome)=public.nome_corso_normalizzato(p_dati->>'nome') order by duplicato_storico,id limit 1;
 elsif p_tabella='edizioni_corsi' then select id into v from public.edizioni_corsi where corso_id=(p_dati->>'corso_id')::uuid and stagione_id=(p_dati->>'stagione_id')::uuid and inizio=(p_dati->>'inizio')::date and fine=(p_dati->>'fine')::date and public.nome_corso_normalizzato(nome)=public.nome_corso_normalizzato(p_dati->>'nome') order by duplicato_storico,id limit 1;
 end if;return v;
end $$;
create function public.iscrivi_con_contatto(p_edizione uuid,p_persona uuid,p_nome text,p_telefono text,p_richiesta boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v uuid;
begin
 if p_richiesta is null or (p_richiesta and not public.owns_person(p_persona)) or (not p_richiesta and not public.is_staff()) then raise exception 'Non autorizzato' using errcode='42501'; end if;
 if coalesce(p_nome,'')<>'' or coalesce(p_telefono,'')<>'' then
  insert into public.contatti_emergenza(persona_id,nominativo,telefono) values(p_persona,btrim(p_nome),btrim(p_telefono))
  on conflict(persona_id) do update set nominativo=excluded.nominativo,telefono=excluded.telefono;
 end if;
 if p_richiesta then return public.richiedi_iscrizione_corso(p_edizione,p_persona); end if;
 insert into public.iscrizioni_corsi(edizione_id,persona_id,stato) values(p_edizione,p_persona,'iscritto') returning id into v;return v;
end $$;
-- Le RPC pubbliche rimangono accessibili solamente a sessioni autenticate.
do $$declare fn regprocedure; begin
 for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('iscrivi_con_contatto','cerca_corso_esistente','cronologia_scheda','scegli_immagini','salva_domanda_v19','documento_sanitario','percorso_sanitario','legge_certificato','approva_versione_cda','firme_verbale','sostituisci_verbale') loop
 execute format('revoke all on function %s from public,anon',fn);execute format('grant execute on function %s to authenticated',fn);
 end loop;
end $$;
revoke all on function public.leggi_versione_cda(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.leggi_versione_cda(uuid,text,uuid) to service_role;
commit;
