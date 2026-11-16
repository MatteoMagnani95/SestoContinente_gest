-- SESTO CONTINENTE · Fase 3.3
-- Richiede migrazioni 0001..0004. Eseguire una volta su copia di test.
-- Non elimina persone, iscrizioni, lezioni, pagamenti o registrazioni economiche.
begin;

alter table public.lezioni add column if not exists annullata_il timestamptz;
create index if not exists lezioni_attive_inizio_idx on public.lezioni(inizio, fine) where annullata_il is null;
create index if not exists prenotazioni_attive_intervallo_idx on public.prenotazioni_corsie(inizio,fine) where stato='confermata';

-- Rafforza il trigger precedente: non permette prenotazioni attive su lezioni cancellate.
create or replace function public.valida_prenotazione_corsia()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_pool uuid; v_start timestamptz; v_end timestamptz; v_annullata timestamptz; v_lane_pool uuid;
begin
 select piscina_id,inizio,fine,annullata_il into v_pool,v_start,v_end,v_annullata
 from public.lezioni where id=new.lezione_id;
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

-- Una transazione: disattiva le vecchie prenotazioni, aggiorna la lezione e
-- riattiva/crea quelle nuove. La constraint EXCLUDE antisovrapposizione
-- della 0002 resta il controllo definitivo (anche in presenza di concorrenza).
create function public.modifica_lezione_e_corsie(
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
 select l.id,l.annullata_il,e.inizio as data_inizio,e.fine as data_fine,e.stato
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
end; $$;
revoke all on function public.modifica_lezione_e_corsie(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text,text) from public,anon;
grant execute on function public.modifica_lezione_e_corsie(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text,text) to authenticated;

-- Annullamento logico: non elimina storico e presenze. L'operazione fallisce
-- se la lezione ha già presenze registrate, per tutelare l'integrità didattica.
create function public.annulla_lezione_guidata(p_lezione uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
 if not (select public.is_staff()) then raise exception 'Operazione non autorizzata'; end if;
 select id into v_id from public.lezioni where id=p_lezione and annullata_il is null for update;
 if v_id is null then raise exception 'Lezione inesistente o già annullata'; end if;
 if exists(select 1 from public.presenze where lezione_id=p_lezione) then
  raise exception 'Non si annullano lezioni con presenze registrate';
 end if;
 update public.prenotazioni_corsie set stato='annullata'
 where lezione_id=p_lezione and stato='confermata';
 update public.lezioni set annullata_il=now() where id=p_lezione;
end; $$;
revoke all on function public.annulla_lezione_guidata(uuid) from public,anon;
grant execute on function public.annulla_lezione_guidata(uuid) to authenticated;

-- Non permettere presenze su lezioni annullate anche usando l'API direttamente.
create or replace function public.verifica_presenza()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if not exists(
  select 1 from public.lezioni l
  join public.iscrizioni_corsi i on i.edizione_id=l.edizione_id
  where l.id=new.lezione_id and l.annullata_il is null
  and i.persona_id=new.persona_id and i.stato in ('iscritto','concluso')
 ) then raise exception 'Iscrizione o lezione non valida per la presenza'; end if;
 return new;
end; $$;

-- Una cancellazione notifica i soci iscritti e gli istruttori collegati al corso.
-- Il riferimento fisso per lezione impedisce doppie notifiche dello stesso annullamento.
create function public.avvisa_annullamento_lezione()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
 if old.annullata_il is null and new.annullata_il is not null then
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
   values(v_user,'calendario',new.id::text||':annullata',
    'Lezione annullata','Una lezione del tuo corso è stata annullata. Controlla il calendario aggiornato.')
   on conflict(utente_id,tipo,riferimento) do nothing;
  end loop;
 end if;
 return new;
end; $$;
create trigger avvisa_annullamento_lezione_trigger after update of annullata_il on public.lezioni
for each row execute function public.avvisa_annullamento_lezione();

-- Resoconto amministrativo esatto, calcolato da SQL senza limit/offset.
-- SECURITY INVOKER mantiene le RLS sui movimenti; ruolo admin verificato.
create function public.riepilogo_contabile_periodo(p_dal date,p_al date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
 if not (select public.is_admin()) then raise exception 'Solo amministratore'; end if;
 if p_dal is null or p_al is null or p_al<p_dal or p_al>p_dal+interval '5 years' then
  raise exception 'Intervallo non valido (massimo cinque anni)';
 end if;
 with selected as (
  select tipo,categoria,importo,data_movimento
  from public.movimenti_economici where data_movimento between p_dal and p_al
 ), totals as (
  select coalesce(sum(importo) filter(where tipo='entrata'),0) as entrate,
         coalesce(sum(importo) filter(where tipo='uscita'),0) as uscite,
         count(*) as registrazioni from selected
 ), categories as (
  select tipo,categoria,sum(importo) as totale,count(*) as movimenti
  from selected group by tipo,categoria
 ), months as (
  select to_char(data_movimento,'YYYY-MM') as mese,
  coalesce(sum(importo) filter(where tipo='entrata'),0) as entrate,
  coalesce(sum(importo) filter(where tipo='uscita'),0) as uscite
  from selected group by 1
 )
 select jsonb_build_object('entrate',t.entrate,'uscite',t.uscite,'saldo',t.entrate-t.uscite,
  'registrazioni',t.registrazioni,
  'categorie',coalesce((select jsonb_agg(jsonb_build_object('tipo',c.tipo,'categoria',c.categoria,
   'totale',c.totale,'movimenti',c.movimenti) order by c.tipo,c.categoria) from categories c),'[]'::jsonb),
  'mesi',coalesce((select jsonb_agg(jsonb_build_object('mese',m.mese,'entrate',m.entrate,
   'uscite',m.uscite,'saldo',m.entrate-m.uscite) order by m.mese) from months m),'[]'::jsonb))
 into v_result from totals t;
 return v_result;
end; $$;
revoke all on function public.riepilogo_contabile_periodo(date,date) from public,anon;
grant execute on function public.riepilogo_contabile_periodo(date,date) to authenticated;

comment on function public.riepilogo_contabile_periodo(date,date) is
 'Totali, categorie e mesi, senza campionamento; accesso solo amministratore.';
commit;
