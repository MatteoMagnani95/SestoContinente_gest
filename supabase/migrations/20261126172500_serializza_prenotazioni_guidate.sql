-- Serializza le scritture sulle corsie; EXCLUDE resta il controllo definitivo.
-- Ordine: lock della lezione (se esistente), poi chiavi corsie ordinate.
-- Non modifica dati storici, permessi, firme RPC o policy RLS.
begin;
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
end; $$;

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
end; $$;

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
end; $$;

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
end; $$;
commit;
