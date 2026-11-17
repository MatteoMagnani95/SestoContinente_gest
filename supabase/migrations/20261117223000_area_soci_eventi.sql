-- 0014: area soci e prenotazioni. Nessuna rimozione di dati esistenti.
BEGIN;
CREATE OR REPLACE FUNCTION public.area_soci_persona_attiva(p_persona uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.adesioni a JOIN public.stagioni s ON s.id=a.stagione_id
 JOIN public.quote_associative q ON q.persona_id=a.persona_id AND q.stagione_id=a.stagione_id
 WHERE a.persona_id=p_persona AND a.stato='attiva' AND s.attiva
 AND (now() AT TIME ZONE 'Europe/Rome')::date BETWEEN s.dal AND s.al
 AND q.importo_dovuto <= COALESCE((SELECT sum(p.importo) FROM public.pagamenti p WHERE p.quota_id=q.id AND p.persona_id=q.persona_id),0));
$$;
REVOKE ALL ON FUNCTION public.area_soci_persona_attiva(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.area_soci_miei_profili()
RETURNS TABLE(persona_id uuid,nome text,cognome text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.id,p.nome,p.cognome FROM public.collegamenti_persone c JOIN public.persone p ON p.id=c.persona_id
 WHERE c.utente_id=auth.uid() AND c.relazione='titolare' AND public.area_soci_persona_attiva(p.id) ORDER BY p.cognome,p.nome,p.id;
$$;
CREATE OR REPLACE FUNCTION public.area_soci_accesso() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.area_soci_miei_profili()); $$;
REVOKE ALL ON FUNCTION public.area_soci_miei_profili(),public.area_soci_accesso() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.area_soci_miei_profili(),public.area_soci_accesso() TO authenticated;
CREATE TABLE public.eventi_soci (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), responsabile_id uuid NOT NULL REFERENCES auth.users(id),
 titolo text NOT NULL CHECK(length(btrim(titolo)) BETWEEN 1 AND 160), destinazione text NOT NULL CHECK(length(btrim(destinazione)) BETWEEN 1 AND 200),
 descrizione text NOT NULL CHECK(length(btrim(descrizione)) BETWEEN 1 AND 5000),
 dal date NOT NULL, al date NOT NULL CHECK(al>=dal), costo numeric(12,2) NOT NULL CHECK(costo>=0),
 posti integer NOT NULL CHECK(posti BETWEEN 1 AND 1000), stato text NOT NULL DEFAULT 'aperto' CHECK(stato IN ('aperto','chiuso','annullato')),
 creato_il timestamptz NOT NULL DEFAULT now(), revisione_prenotazioni bigint NOT NULL DEFAULT 0
);
CREATE TABLE public.eventi_soci_iscrizioni (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), evento_id uuid NOT NULL REFERENCES public.eventi_soci(id) ON DELETE RESTRICT,
 persona_id uuid NOT NULL REFERENCES public.persone(id) ON DELETE RESTRICT,
 utente_id uuid NOT NULL REFERENCES auth.users(id), stato text NOT NULL CHECK(stato IN ('in_attesa','approvata','respinta','ritirata','annullata')),
 richiesta_il timestamptz NOT NULL DEFAULT clock_timestamp(), decisione_il timestamptz, deciso_da uuid REFERENCES auth.users(id)
);
CREATE UNIQUE INDEX eventi_soci_una_prenotazione ON public.eventi_soci_iscrizioni(evento_id,persona_id) WHERE stato IN ('in_attesa','approvata');
CREATE INDEX eventi_soci_coda ON public.eventi_soci_iscrizioni(evento_id,richiesta_il,id);
ALTER TABLE public.eventi_soci ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventi_soci_iscrizioni ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.eventi_soci,public.eventi_soci_iscrizioni FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.eventi_soci,public.eventi_soci_iscrizioni TO authenticated;
CREATE OR REPLACE FUNCTION public.area_soci_gestisce_evento(p_evento uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (public.is_staff() OR (public.is_instructor() AND EXISTS(SELECT 1 FROM public.eventi_soci e WHERE e.id=p_evento AND e.responsabile_id=auth.uid())));
$$;
REVOKE ALL ON FUNCTION public.area_soci_gestisce_evento(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.area_soci_gestisce_evento(uuid) TO authenticated;
CREATE POLICY eventi_soci_lettura ON public.eventi_soci FOR SELECT TO authenticated USING(public.area_soci_accesso() OR public.area_soci_gestisce_evento(id));
CREATE POLICY eventi_soci_iscrizioni_lettura ON public.eventi_soci_iscrizioni FOR SELECT TO authenticated USING(public.area_soci_gestisce_evento(evento_id) OR (public.area_soci_accesso() AND utente_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.area_soci_posti(p_evento uuid) RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_posti integer;
BEGIN
 IF NOT (public.area_soci_accesso() OR public.area_soci_gestisce_evento(p_evento)) THEN RAISE EXCEPTION 'Accesso negato' USING ERRCODE='42501'; END IF;
 SELECT e.posti-(SELECT count(*)::integer FROM public.eventi_soci_iscrizioni i WHERE i.evento_id=e.id AND i.stato IN ('in_attesa','approvata')) INTO v_posti FROM public.eventi_soci e WHERE e.id=p_evento;
 RETURN v_posti;
END; $$;
CREATE OR REPLACE FUNCTION public.area_soci_salva_evento(p_id uuid,p_titolo text,p_destinazione text,p_descrizione text,p_dal date,p_al date,p_costo numeric,p_posti integer,p_stato text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_evento public.eventi_soci%ROWTYPE; v_id uuid; v_occupati integer;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.is_staff() OR public.is_instructor()) THEN RAISE EXCEPTION 'Accesso negato' USING ERRCODE='42501'; END IF;
 IF p_stato NOT IN ('aperto','chiuso','annullato') THEN RAISE EXCEPTION 'Stato non valido' USING ERRCODE='P3415'; END IF;
 IF p_id IS NULL THEN
  IF p_stato<>'aperto' OR p_dal<(now() AT TIME ZONE 'Europe/Rome')::date THEN RAISE EXCEPTION 'Data o stato non valido' USING ERRCODE='P3415'; END IF;
  INSERT INTO public.eventi_soci(responsabile_id,titolo,destinazione,descrizione,dal,al,costo,posti,stato) VALUES(auth.uid(),btrim(p_titolo),btrim(p_destinazione),btrim(p_descrizione),p_dal,p_al,p_costo,p_posti,p_stato) RETURNING id INTO v_id;
  RETURN v_id;
 END IF;
 SELECT * INTO v_evento FROM public.eventi_soci WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT public.area_soci_gestisce_evento(p_id) THEN RAISE EXCEPTION 'Accesso negato' USING ERRCODE='42501'; END IF;
 IF v_evento.stato='annullato' THEN RAISE EXCEPTION 'Evento annullato' USING ERRCODE='P3415'; END IF;
 SELECT count(*) INTO v_occupati FROM public.eventi_soci_iscrizioni WHERE evento_id=p_id AND stato IN ('in_attesa','approvata');
 IF p_posti<v_occupati THEN RAISE EXCEPTION 'Capienza inferiore alle prenotazioni' USING ERRCODE='P3416'; END IF;
 UPDATE public.eventi_soci SET titolo=btrim(p_titolo),destinazione=btrim(p_destinazione),descrizione=btrim(p_descrizione),dal=p_dal,al=p_al,costo=p_costo,posti=p_posti,stato=p_stato WHERE id=p_id;
 IF p_stato='annullato' THEN UPDATE public.eventi_soci_iscrizioni SET stato='annullata',decisione_il=clock_timestamp(),deciso_da=auth.uid() WHERE evento_id=p_id AND stato IN ('in_attesa','approvata'); END IF;
 RETURN p_id;
END; $$;
-- Le richieste in attesa occupano un posto. Lock della stessa riga per tutte le mutazioni.
CREATE OR REPLACE FUNCTION public.area_soci_iscrivi(p_evento uuid,p_persona uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.eventi_soci%ROWTYPE; v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.area_soci_miei_profili() p WHERE p.persona_id=p_persona) THEN RAISE EXCEPTION 'Quota o adesione non attiva' USING ERRCODE='42501'; END IF;
 SELECT * INTO e FROM public.eventi_soci WHERE id=p_evento FOR UPDATE;
 IF NOT FOUND OR e.stato<>'aperto' OR e.dal<(now() AT TIME ZONE 'Europe/Rome')::date THEN RAISE EXCEPTION 'Evento non aperto' USING ERRCODE='P3415'; END IF;
 IF NOT public.area_soci_persona_attiva(p_persona) THEN RAISE EXCEPTION 'Quota o adesione non attiva' USING ERRCODE='42501'; END IF;
 SELECT id INTO v_id FROM public.eventi_soci_iscrizioni WHERE evento_id=p_evento AND persona_id=p_persona AND stato IN ('in_attesa','approvata');
 IF FOUND THEN RETURN v_id; END IF;
 IF (SELECT count(*) FROM public.eventi_soci_iscrizioni WHERE evento_id=p_evento AND stato IN ('in_attesa','approvata'))>=e.posti THEN RAISE EXCEPTION 'Posti esauriti' USING ERRCODE='P3416'; END IF;
 INSERT INTO public.eventi_soci_iscrizioni(evento_id,persona_id,utente_id,stato) VALUES(p_evento,p_persona,auth.uid(),'in_attesa') RETURNING id INTO v_id;
 -- Scrittura della riga lockata: forza anche la serializzazione delle transazioni con snapshot ripetibile.
 UPDATE public.eventi_soci SET revisione_prenotazioni=revisione_prenotazioni+1 WHERE id=p_evento;
 RETURN v_id;
END; $$;
CREATE OR REPLACE FUNCTION public.area_soci_decidi(p_evento uuid,p_iscrizione uuid,p_esito text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.eventi_soci%ROWTYPE; i public.eventi_soci_iscrizioni%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.area_soci_gestisce_evento(p_evento) OR (p_esito='ritirata' AND EXISTS(SELECT 1 FROM public.eventi_soci_iscrizioni r WHERE r.id=p_iscrizione AND r.evento_id=p_evento AND r.utente_id=auth.uid()))) THEN RAISE EXCEPTION 'Accesso negato' USING ERRCODE='42501'; END IF;
 SELECT * INTO e FROM public.eventi_soci WHERE id=p_evento FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento non disponibile' USING ERRCODE='P3415'; END IF;
 SELECT * INTO i FROM public.eventi_soci_iscrizioni WHERE id=p_iscrizione AND evento_id=p_evento FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Iscrizione non disponibile' USING ERRCODE='P3415'; END IF;
 IF p_esito='ritirata' THEN
  IF auth.uid() IS NULL OR i.utente_id<>auth.uid() OR i.stato NOT IN ('in_attesa','approvata') OR e.stato='annullato' OR e.dal<(now() AT TIME ZONE 'Europe/Rome')::date THEN RAISE EXCEPTION 'Ritiro non consentito' USING ERRCODE='42501'; END IF;
 ELSE
  IF NOT public.area_soci_gestisce_evento(p_evento) OR p_esito NOT IN ('approvata','respinta','annullata') OR e.stato='annullato' OR e.dal<(now() AT TIME ZONE 'Europe/Rome')::date OR (p_esito IN ('approvata','respinta') AND i.stato<>'in_attesa') OR (p_esito='annullata' AND i.stato NOT IN ('in_attesa','approvata')) THEN RAISE EXCEPTION 'Decisione non consentita' USING ERRCODE='42501'; END IF;
  IF p_esito='approvata' AND NOT public.area_soci_persona_attiva(i.persona_id) THEN RAISE EXCEPTION 'Quota o adesione non attiva' USING ERRCODE='42501'; END IF;
 END IF;
 UPDATE public.eventi_soci_iscrizioni SET stato=p_esito,decisione_il=clock_timestamp(),deciso_da=auth.uid() WHERE id=p_iscrizione;
 UPDATE public.eventi_soci SET revisione_prenotazioni=revisione_prenotazioni+1 WHERE id=p_evento;
END; $$;
CREATE OR REPLACE FUNCTION public.area_soci_partecipanti(p_evento uuid) RETURNS TABLE(id uuid,persona_id uuid,nome text,cognome text,stato text,richiesta_il timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.area_soci_gestisce_evento(p_evento) THEN RAISE EXCEPTION 'Accesso negato' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT i.id,i.persona_id,p.nome,p.cognome,i.stato,i.richiesta_il FROM public.eventi_soci_iscrizioni i JOIN public.persone p ON p.id=i.persona_id WHERE i.evento_id=p_evento ORDER BY p.cognome,p.nome,i.richiesta_il,i.id;
END; $$;
REVOKE ALL ON FUNCTION public.area_soci_posti(uuid),public.area_soci_salva_evento(uuid,text,text,text,date,date,numeric,integer,text),public.area_soci_iscrivi(uuid,uuid),public.area_soci_decidi(uuid,uuid,text),public.area_soci_partecipanti(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.area_soci_posti(uuid),public.area_soci_salva_evento(uuid,text,text,text,date,date,numeric,integer,text),public.area_soci_iscrivi(uuid,uuid),public.area_soci_decidi(uuid,uuid,text),public.area_soci_partecipanti(uuid) TO authenticated;
-- I documenti associativi pubblicati ai soci non sono accessibili tramite link o storage ai soci non attivi.
CREATE POLICY documenti_soci_attivi ON public.documenti AS RESTRICTIVE FOR SELECT TO authenticated USING (NOT (ambito='associazione' AND visibilita='soci') OR public.is_staff() OR public.area_soci_accesso());
CREATE POLICY documenti_soci_accesso ON public.documenti FOR SELECT TO authenticated USING (ambito='associazione' AND visibilita='soci' AND public.area_soci_accesso());
CREATE POLICY documenti_soci_pubblica_admin ON public.documenti AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (ambito='associazione' AND visibilita='soci') OR (public.is_admin() AND utente_id IS NULL AND persona_id IS NULL AND edizione_id IS NULL AND programma_versione_id IS NULL));
CREATE POLICY documenti_soci_modifica_admin ON public.documenti AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT (ambito='associazione' AND visibilita='soci') OR public.is_admin()) WITH CHECK (NOT (ambito='associazione' AND visibilita='soci') OR (public.is_admin() AND utente_id IS NULL AND persona_id IS NULL AND edizione_id IS NULL AND programma_versione_id IS NULL));
COMMIT;
