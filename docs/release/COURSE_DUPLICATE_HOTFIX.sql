-- Targeted repair: empty cancelled editions only. No historical or performance migration replay.
CREATE OR REPLACE FUNCTION public.proteggi_responsabile_corso() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_stato text;
BEGIN
 IF OLD.ruolo='responsabile' THEN
  SELECT stato INTO v_stato FROM public.edizioni_corsi WHERE id=OLD.edizione_id FOR UPDATE;
  IF v_stato IS DISTINCT FROM 'annullato'
   OR EXISTS(SELECT 1 FROM public.iscrizioni_corsi WHERE edizione_id=OLD.edizione_id)
   OR EXISTS(SELECT 1 FROM public.lezioni WHERE edizione_id=OLD.edizione_id)
   OR EXISTS(SELECT 1 FROM public.brevetti_allievi WHERE edizione_id=OLD.edizione_id)
   OR EXISTS(SELECT 1 FROM public.documenti WHERE edizione_id=OLD.edizione_id)
   OR EXISTS(SELECT 1 FROM public.assegnazioni_attrezzature WHERE edizione_id=OLD.edizione_id)
  THEN RAISE EXCEPTION 'Sostituire il responsabile, non rimuoverlo' USING ERRCODE='P3414'; END IF;
 END IF;
 RETURN OLD;
END $$;

CREATE FUNCTION public.elimina_edizione_annullata_vuota(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_stato text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_staff(),false) THEN
  RAISE EXCEPTION 'Permessi insufficienti' USING ERRCODE='42501';
 END IF;
 SELECT stato INTO v_stato FROM public.edizioni_corsi WHERE id=p_id FOR UPDATE;
 IF v_stato IS DISTINCT FROM 'annullato' THEN
  RAISE EXCEPTION 'Solo edizioni annullate' USING ERRCODE='P3414';
 END IF;
 IF EXISTS(SELECT 1 FROM public.iscrizioni_corsi WHERE edizione_id=p_id)
 OR EXISTS(SELECT 1 FROM public.lezioni WHERE edizione_id=p_id)
 OR EXISTS(SELECT 1 FROM public.brevetti_allievi WHERE edizione_id=p_id)
 OR EXISTS(SELECT 1 FROM public.documenti WHERE edizione_id=p_id)
 OR EXISTS(SELECT 1 FROM public.assegnazioni_attrezzature WHERE edizione_id=p_id)
 THEN RAISE EXCEPTION 'Record con dati collegati' USING ERRCODE='P3414'; END IF;
 -- Remove only empty cancelled edition's assignments. Existing FK-aware
 -- routine checks any additional incoming references; a failure rolls back all.
 DELETE FROM public.assegnazioni_istruttori WHERE edizione_id=p_id;
 PERFORM public.rimuovi_record_gestionale('edizioni_corsi',p_id);
END $$;
REVOKE ALL ON FUNCTION public.elimina_edizione_annullata_vuota(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.elimina_edizione_annullata_vuota(uuid) TO authenticated;
