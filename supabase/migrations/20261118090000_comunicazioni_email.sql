-- 0018: mailing list dinamica per edizione; non copia recapiti e non modifica dati storici.
BEGIN;
CREATE OR REPLACE FUNCTION public.mailing_list_corso(p_edizione uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_course public.edizioni_corsi%ROWTYPE;
BEGIN
 IF NOT public.account_corrente_abilitato() OR NOT (
   public.is_staff() OR (public.is_instructor() AND EXISTS(
     SELECT 1 FROM public.assegnazioni_istruttori a
     JOIN public.collegamenti_persone cp ON cp.persona_id=a.persona_id
     WHERE a.edizione_id=p_edizione AND a.ruolo='responsabile'
       AND cp.relazione='titolare' AND cp.utente_id=auth.uid()
   ))
 ) THEN RAISE EXCEPTION 'Non autorizzato alla mailing list di questo corso' USING ERRCODE='42501'; END IF;
 SELECT e.* INTO v_course FROM public.edizioni_corsi e WHERE e.id=p_edizione;
 IF NOT FOUND THEN RAISE EXCEPTION 'Corso non trovato' USING ERRCODE='P0002'; END IF;
 RETURN jsonb_build_object('nome',v_course.nome,'stato',v_course.stato,'iscritti',
   COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'nome',p.nome,'cognome',p.cognome,'email',p.email) ORDER BY p.cognome,p.nome,p.id)
     FROM public.iscrizioni_corsi i JOIN public.persone p ON p.id=i.persona_id
     WHERE i.edizione_id=p_edizione AND i.stato='iscritto'), '[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.mailing_list_corso(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mailing_list_corso(uuid) TO authenticated;
-- Conserva le regole esistenti e aggiunge un tipo di promemoria configurabile.
INSERT INTO public.impostazioni_promemoria(tipo) VALUES ('quota_corso') ON CONFLICT(tipo) DO NOTHING;
CREATE OR REPLACE FUNCTION public.genera_promemoria()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer:=0; v_record record; v_user uuid; v_days int; v_arr int[];
begin
 if coalesce(auth.role(),'') <> 'service_role' and not public.is_admin() then raise exception 'Accesso negato'; end if;
 for v_record in
  select 'certificato_medico'::text as tipo,c.id as id,c.persona_id as persona_id,c.scade_il as scadenza,
    'Verifica documenti'::text as titolo,'Controlla le scadenze nella tua area personale.'::text as messaggio
  from public.certificati_medici c where c.scade_il>=current_date and c.scade_il<=current_date+interval '30 days'
  union all
  select 'quota_associativa',q.id,q.persona_id,q.scadenza,'Scadenza quota','Controlla la tua posizione associativa.'
  from public.saldi_quote q where q.residuo>0 and q.scadenza between current_date and current_date+30
  union all
  select 'quota_corso',q.id,q.persona_id,q.scadenza,'Scadenza quota corso','Controlla il saldo del tuo corso nell’area personale.'
  from public.saldi_corsi q where q.residuo>0 and q.scadenza between current_date and current_date+30
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
REVOKE ALL ON FUNCTION public.genera_promemoria() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.genera_promemoria() TO service_role;
COMMIT;
