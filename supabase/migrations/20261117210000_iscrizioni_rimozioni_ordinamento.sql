-- 0013 - solo modifiche strutturali, nessuna cancellazione in fase di migrazione.
BEGIN;
-- Un socio iscrivibile ha adesione attiva e almeno una tessera attiva e valida.
CREATE OR REPLACE VIEW public.gest_soci_iscrivibili WITH (security_invoker=true) AS
 SELECT a.persona_id,a.stagione_id,p.cognome,p.nome
 FROM public.adesioni a JOIN public.persone p ON p.id=a.persona_id
 WHERE a.stato='attiva' AND EXISTS (
  SELECT 1 FROM public.tesseramenti t WHERE t.adesione_id=a.id AND t.stato='attiva'
  AND t.scade_il >= (now() AT TIME ZONE 'Europe/Rome')::date
  AND (t.emessa_il IS NULL OR t.emessa_il <= (now() AT TIME ZONE 'Europe/Rome')::date));
REVOKE ALL ON public.gest_soci_iscrivibili FROM PUBLIC, anon;
GRANT SELECT ON public.gest_soci_iscrivibili TO authenticated;
CREATE OR REPLACE FUNCTION public.valida_nuova_iscrizione_guidata()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_stagione uuid; v_stato text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.stato IS NOT DISTINCT FROM OLD.stato AND NEW.persona_id IS NOT DISTINCT FROM OLD.persona_id AND NEW.edizione_id IS NOT DISTINCT FROM OLD.edizione_id THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.persona_id IS DISTINCT FROM OLD.persona_id OR NEW.edizione_id IS DISTINCT FROM OLD.edizione_id THEN
   RAISE EXCEPTION 'Non è possibile riassegnare una iscrizione' USING ERRCODE='P3413';
  END IF;
  IF OLD.stato='concluso' AND NEW.stato<>'concluso' THEN RAISE EXCEPTION 'Iscrizione conclusa' USING ERRCODE='P3413'; END IF;
 END IF;
 IF TG_OP='INSERT' AND (NEW.stato NOT IN ('in_attesa','iscritto') OR (NEW.stato='in_attesa' AND public.is_staff() AND NOT public.owns_person(NEW.persona_id))) THEN RAISE EXCEPTION 'Stato iniziale non valido' USING ERRCODE='P3413'; END IF;
 IF NEW.stato IN ('in_attesa','iscritto') THEN
  SELECT e.stagione_id,e.stato INTO v_stagione,v_stato FROM public.edizioni_corsi e WHERE e.id=NEW.edizione_id;
  IF NOT FOUND OR v_stato NOT IN ('programmato','attivo') THEN RAISE EXCEPTION 'Edizione non aperta' USING ERRCODE='P3413'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.gest_soci_iscrivibili s WHERE s.persona_id=NEW.persona_id AND s.stagione_id=v_stagione) THEN
   RAISE EXCEPTION 'Adesione attiva e tessera valida nella stagione obbligatorie' USING ERRCODE='P3413';
  END IF;
 END IF;
 RETURN NEW;
END; $$;
-- Il trigger esistente 0004 continua a chiamare la funzione aggiornata.
CREATE OR REPLACE VIEW public.gest_elenco_adesioni WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.adesioni t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_adesioni FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_adesioni TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_iscrizioni_corsi WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.iscrizioni_corsi t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_iscrizioni_corsi FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_iscrizioni_corsi TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_assegnazioni_istruttori WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.assegnazioni_istruttori t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_assegnazioni_istruttori FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_assegnazioni_istruttori TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_qualifiche_istruttori WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.qualifiche_istruttori t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_qualifiche_istruttori FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_qualifiche_istruttori TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_brevetti_allievi WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.brevetti_allievi t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_brevetti_allievi FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_brevetti_allievi TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_certificati_medici WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.certificati_medici t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_certificati_medici FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_certificati_medici TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_presenze WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.presenze t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_presenze FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_presenze TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_assegnazioni_attrezzature WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.assegnazioni_attrezzature t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_assegnazioni_attrezzature FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_assegnazioni_attrezzature TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_quote_associative WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.quote_associative t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_quote_associative FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_quote_associative TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_saldi_quote WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.saldi_quote t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_saldi_quote FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_saldi_quote TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_saldi_corsi WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.saldi_corsi t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_saldi_corsi FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_saldi_corsi TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_tesseramenti WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.tesseramenti t JOIN public.adesioni a ON a.id=t.adesione_id JOIN public.persone p ON p.id=a.persona_id;
REVOKE ALL ON public.gest_elenco_tesseramenti FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_tesseramenti TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_addebiti_corsi WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.addebiti_corsi t JOIN public.iscrizioni_corsi i ON i.id=t.iscrizione_id JOIN public.persone p ON p.id=i.persona_id;
REVOKE ALL ON public.gest_elenco_addebiti_corsi FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_addebiti_corsi TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_pagamenti WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.pagamenti t JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_pagamenti FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_pagamenti TO authenticated;
CREATE OR REPLACE VIEW public.gest_elenco_documenti WITH (security_invoker=true) AS SELECT t.*,p.cognome AS sort_cognome,p.nome AS sort_nome FROM public.documenti t LEFT JOIN public.persone p ON p.id=t.persona_id;
REVOKE ALL ON public.gest_elenco_documenti FROM PUBLIC, anon;
GRANT SELECT ON public.gest_elenco_documenti TO authenticated;
-- Le bozze CdA rimosse restano archiviate e non possono essere votate o modificate.
ALTER TABLE public.cda_verbali ADD COLUMN IF NOT EXISTS rimosso_il timestamptz;
ALTER TABLE public.cda_verbali ADD COLUMN IF NOT EXISTS rimosso_da uuid REFERENCES auth.users(id);
CREATE OR REPLACE FUNCTION public.proteggi_bozza_cda_rimossa()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF OLD.rimosso_il IS NOT NULL THEN RAISE EXCEPTION 'Bozza rimossa, non modificabile' USING ERRCODE='P3414'; END IF;
 IF NEW.rimosso_il IS NOT NULL AND (OLD.stato<>'bozza' OR NEW.stato<>'bozza') THEN RAISE EXCEPTION 'Solo bozze rimovibili' USING ERRCODE='P3414'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS proteggi_bozza_cda_rimossa ON public.cda_verbali;
CREATE TRIGGER proteggi_bozza_cda_rimossa BEFORE UPDATE ON public.cda_verbali FOR EACH ROW EXECUTE FUNCTION public.proteggi_bozza_cda_rimossa();
-- RPC con whitelist, permessi e verifica anche dei riferimenti ON DELETE CASCADE.
-- Non espone dati collegati al chiamante; nessuna cancellazione automatica di altri record.
CREATE OR REPLACE FUNCTION public.rimuovi_record_gestionale(p_tabella text,p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target oid; fk record; linked boolean; found_id uuid; affected integer;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_staff(),false) THEN RAISE EXCEPTION 'Permessi insufficienti' USING ERRCODE='42501'; END IF;
 IF p_tabella IS NULL OR p_id IS NULL OR p_tabella NOT IN ('persone','adesioni','tesseramenti','stagioni','corsi','edizioni_corsi','iscrizioni_corsi','assegnazioni_istruttori','qualifiche_istruttori','brevetti_allievi','certificati_medici','programmi_didattici','versioni_programmi','piscine','corsie','lezioni','prenotazioni_corsie','presenze','attrezzature','revisioni_attrezzature','assegnazioni_attrezzature','quote_associative','addebiti_corsi','movimenti_economici','comunicazioni','impostazioni_promemoria','richieste','cda_componenti','moduli_didattici','cda_verbali') THEN RAISE EXCEPTION 'Tabella non ammessa' USING ERRCODE='42501'; END IF;
 IF p_tabella IN ('stagioni','movimenti_economici','impostazioni_promemoria') AND NOT coalesce(public.is_admin(),false) THEN RAISE EXCEPTION 'Permessi insufficienti' USING ERRCODE='42501'; END IF;
 target:=to_regclass(format('public.%I',p_tabella));
 EXECUTE format('SELECT id FROM public.%I WHERE id=$1 FOR UPDATE',p_tabella) INTO found_id USING p_id;
 IF found_id IS NULL THEN RAISE EXCEPTION 'Record non trovato' USING ERRCODE='P3414'; END IF;
 IF p_tabella='cda_verbali' THEN
  UPDATE public.cda_verbali SET rimosso_il=now(),rimosso_da=auth.uid() WHERE id=p_id AND stato='bozza' AND rimosso_il IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo bozze non rimosse' USING ERRCODE='P3414'; END IF;
  RETURN;
 END IF;
 IF p_tabella='cda_componenti' AND EXISTS(SELECT 1 FROM public.cda_componenti c JOIN public.cda_votanti x ON x.persona_id=c.persona_id JOIN public.cda_verbali v ON v.id=x.verbale_id WHERE c.id=p_id AND v.data_consiglio BETWEEN c.dal AND c.al) THEN RAISE EXCEPTION 'Mandato collegato a votazioni' USING ERRCODE='P3414'; END IF;
 IF p_tabella='assegnazioni_attrezzature' AND EXISTS(SELECT 1 FROM public.assegnazioni_attrezzature WHERE id=p_id AND restituita_il IS NULL) THEN RAISE EXCEPTION 'Prestito ancora aperto' USING ERRCODE='P3414'; END IF;
 IF p_tabella='movimenti_economici' AND EXISTS(SELECT 1 FROM public.movimenti_economici WHERE id=p_id AND pagamento_id IS NOT NULL) THEN RAISE EXCEPTION 'Movimento contabilizzato da pagamento' USING ERRCODE='P3414'; END IF;
 IF p_tabella='richieste' AND EXISTS(SELECT 1 FROM public.richieste WHERE id=p_id AND stato='approvata') THEN RAISE EXCEPTION 'Domanda approvata' USING ERRCODE='P3414'; END IF;
 IF p_tabella='versioni_programmi' AND EXISTS(SELECT 1 FROM public.versioni_programmi WHERE id=p_id AND stato IN ('approvato','archiviato')) THEN RAISE EXCEPTION 'Versione storica protetta' USING ERRCODE='P3414'; END IF;
 IF p_tabella='iscrizioni_corsi' AND EXISTS(SELECT 1 FROM public.iscrizioni_corsi i JOIN public.lezioni l ON l.edizione_id=i.edizione_id JOIN public.presenze x ON x.lezione_id=l.id AND x.persona_id=i.persona_id WHERE i.id=p_id) THEN RAISE EXCEPTION 'Presenze collegate' USING ERRCODE='P3414'; END IF;
 IF p_tabella='adesioni' AND EXISTS(SELECT 1 FROM public.adesioni a WHERE a.id=p_id AND (EXISTS(SELECT 1 FROM public.iscrizioni_corsi i JOIN public.edizioni_corsi e ON e.id=i.edizione_id WHERE i.persona_id=a.persona_id AND e.stagione_id=a.stagione_id) OR EXISTS(SELECT 1 FROM public.quote_associative q WHERE q.persona_id=a.persona_id AND q.stagione_id=a.stagione_id))) THEN RAISE EXCEPTION 'Iscrizioni o quote collegate' USING ERRCODE='P3414'; END IF;
 IF p_tabella='tesseramenti' AND EXISTS(SELECT 1 FROM public.tesseramenti t JOIN public.adesioni a ON a.id=t.adesione_id JOIN public.iscrizioni_corsi i ON i.persona_id=a.persona_id JOIN public.edizioni_corsi e ON e.id=i.edizione_id AND e.stagione_id=a.stagione_id WHERE t.id=p_id AND i.stato IN ('in_attesa','iscritto')) THEN RAISE EXCEPTION 'Iscrizioni attive collegate' USING ERRCODE='P3414'; END IF;
 -- Tutte le FK entranti, anche composte, verificate tramite join con la riga bloccata.
 FOR fk IN SELECT c.conrelid::regclass AS child, string_agg(format('x.%I = y.%I',ca.attname,pa.attname),' AND ' ORDER BY k.ord) AS pred
  FROM pg_catalog.pg_constraint c
  CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY AS k(child_key,parent_key,ord)
  JOIN pg_catalog.pg_attribute ca ON ca.attrelid=c.conrelid AND ca.attnum=k.child_key
  JOIN pg_catalog.pg_attribute pa ON pa.attrelid=c.confrelid AND pa.attnum=k.parent_key
  WHERE c.contype='f' AND c.confrelid=target GROUP BY c.oid,c.conrelid
 LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s x JOIN public.%I y ON %s WHERE y.id=$1)',fk.child,p_tabella,fk.pred) INTO linked USING p_id;
  IF linked THEN RAISE EXCEPTION 'Record con dati collegati' USING ERRCODE='P3414'; END IF;
 END LOOP;
 EXECUTE format('DELETE FROM public.%I WHERE id=$1',p_tabella) USING p_id;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'Rimozione non confermata' USING ERRCODE='P3414'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.rimuovi_record_gestionale(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rimuovi_record_gestionale(text,uuid) TO authenticated;
-- Revoca puntuale di un ruolo (non elimina l'account), solo amministratori.
CREATE OR REPLACE FUNCTION public.rimuovi_ruolo_gestionale(p_utente uuid,p_ruolo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_admin(),false) THEN RAISE EXCEPTION 'Permessi insufficienti' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(7300413);
 IF p_utente IS NULL OR p_ruolo IS NULL OR p_ruolo NOT IN ('amministratore','segreteria','istruttore','socio','tutore','consigliere_cda') THEN RAISE EXCEPTION 'Ruolo non valido' USING ERRCODE='P3414'; END IF;
 IF p_ruolo='amministratore' AND (p_utente=auth.uid() OR (SELECT count(*) FROM public.ruoli_utente WHERE ruolo='amministratore')<=1) THEN RAISE EXCEPTION 'Amministratore protetto' USING ERRCODE='P3414'; END IF;
 -- Una seduta già aperta non deve perdere un votante necessario al quorum.
 IF p_ruolo='consigliere_cda' AND EXISTS(SELECT 1 FROM public.cda_votanti a JOIN public.cda_verbali v ON v.id=a.verbale_id WHERE a.utente_id=p_utente AND v.stato='in_approvazione') THEN RAISE EXCEPTION 'Votazione in corso' USING ERRCODE='P3414'; END IF;
 DELETE FROM public.ruoli_utente WHERE utente_id=p_utente AND ruolo::text=p_ruolo;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ruolo non trovato' USING ERRCODE='P3414'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.rimuovi_ruolo_gestionale(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rimuovi_ruolo_gestionale(uuid,text) TO authenticated;
COMMIT;
