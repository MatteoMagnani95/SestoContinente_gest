-- Protegge le prenotazioni parziali storiche dalla ricostruzione implicita.
-- Nessun dato esistente modificato; firma, RLS e autorizzazioni della RPC conservate.
begin;
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
end; $$;
revoke all on function public.modifica_lezione_e_corsie(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text,text) from public,anon;
grant execute on function public.modifica_lezione_e_corsie(uuid,text,timestamptz,timestamptz,uuid,uuid[],text,text,text) to authenticated;
commit;
