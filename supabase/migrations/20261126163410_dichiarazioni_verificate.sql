-- Provenienza delle nuove scelte e protezione dai moduli obsoleti.
-- Nessuna attribuzione inventata alle dichiarazioni già registrate.
begin;
alter table public.scelte_iscrizione add column origine text
 check(origine in ('registrazione','domanda','profilo'));
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
end $$;
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
end $$;
revoke all on function public.registra_scelta_verificata(boolean,text,bigint,text) from public,anon,authenticated;

create function public.scegli_immagini_verificata(p_scelta boolean,p_versione text,p_scelta_attesa bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.registra_scelta_verificata(p_scelta,p_versione,p_scelta_attesa,'profilo');
end $$;
revoke all on function public.scegli_immagini_verificata(boolean,text,bigint) from public,anon;
grant execute on function public.scegli_immagini_verificata(boolean,text,bigint) to authenticated;

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
end $$;
revoke all on function public.salva_domanda_v20(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text,text,text,bigint) from public,anon;
grant execute on function public.salva_domanda_v20(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text,text,text,bigint) to authenticated;
commit;
