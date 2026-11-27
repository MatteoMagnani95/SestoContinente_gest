-- EXPERIMENT ONLY: executed inside a rolled-back transaction on disposable CI.
-- Not a migration. No production installation or application dependency.
CREATE FUNCTION public.sc_perf_dashboard(p_now timestamptz,p_today date,p_cutoff date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE season_count bigint; season_id uuid; season_name text; result jsonb;
BEGIN
 IF NOT COALESCE(public.is_staff(),false) THEN
  RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501';
 END IF;
 SELECT count(*),min(id::text)::uuid,min(nome) INTO season_count,season_id,season_name FROM public.stagioni WHERE attiva;
 IF season_count<>1 THEN season_id:=NULL; season_name:=NULL; END IF;
 SELECT jsonb_build_object(
  'season',CASE WHEN season_id IS NULL THEN NULL ELSE jsonb_build_object('id',season_id,'nome',season_name) END,
  'requests',(SELECT count(*) FROM public.richieste WHERE stato IN ('inviata','in_verifica','integrazione_richiesta')),
  'courses',(SELECT count(*) FROM public.edizioni_corsi WHERE stato='attivo'),
  'enrollments',(SELECT count(*) FROM public.iscrizioni_corsi WHERE stato='iscritto'),
  'revisions',(SELECT count(*) FROM public.attrezzature WHERE prossima_revisione BETWEEN p_today AND p_cutoff),
  'certificates',(SELECT count(*) FROM public.stato_certificati WHERE stato_certificato='valido' AND scade_il BETWEEN p_today AND p_cutoff),
  'events',jsonb_build_object('count',(SELECT count(*) FROM public.eventi_soci WHERE dal>=p_today AND stato<>'annullato'),
   'data',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.dal,e.id),'[]'::jsonb) FROM
    (SELECT id,titolo,dal,al,stato FROM public.eventi_soci WHERE dal>=p_today AND stato<>'annullato' ORDER BY dal,id LIMIT 5) e)),
  'lessons',jsonb_build_object('count',(SELECT count(*) FROM public.lezioni WHERE annullata_il IS NULL AND inizio>=p_now),
   'data',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.inizio,l.id),'[]'::jsonb) FROM
    (SELECT id,titolo,inizio,fine FROM public.lezioni WHERE annullata_il IS NULL AND inizio>=p_now ORDER BY inizio,id LIMIT 8) l)),
  'admin',public.is_admin(),
  'adhesions',CASE WHEN season_id IS NOT NULL THEN (SELECT count(*) FROM public.adesioni WHERE stagione_id=season_id AND stato='attiva') END,
  'pendingAdhesions',CASE WHEN season_id IS NOT NULL THEN (SELECT count(*) FROM public.adesioni WHERE stagione_id=season_id AND stato='da_perfezionare') END,
  'quotes',CASE WHEN season_id IS NOT NULL THEN (SELECT count(*) FROM public.saldi_quote WHERE stagione_id=season_id AND residuo>0) END
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_dashboard(timestamptz,date,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_dashboard(timestamptz,date,date) TO authenticated;

CREATE FUNCTION public.sc_perf_soci_counts(p_season uuid,p_terms text[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT COALESCE(public.is_staff(),false) THEN
  RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501';
 END IF;
 IF cardinality(coalesce(p_terms,ARRAY[]::text[]))>6 OR EXISTS(
  SELECT 1 FROM unnest(p_terms) AS t(term)
  WHERE term IS NULL OR length(term)>80 OR strpos(term,'%')>0 OR strpos(term,'_')>0 OR strpos(term,chr(92))>0
 ) THEN RAISE EXCEPTION 'Filtro non valido' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('total',count(*),
  'attiva',count(*) FILTER(WHERE s.stato='attiva'),
  'da_perfezionare',count(*) FILTER(WHERE s.stato='da_perfezionare'),
  'sospesa',count(*) FILTER(WHERE s.stato='sospesa'),
  'cessata',count(*) FILTER(WHERE s.stato='cessata'))
 INTO result FROM public.schede_soci s
 WHERE (p_season IS NULL OR s.stagione_id=p_season)
 AND NOT EXISTS(SELECT 1 FROM unnest(p_terms) AS t(term)
  WHERE NOT(coalesce(s.nome,'') ILIKE '%'||term||'%' OR coalesce(s.cognome,'') ILIKE '%'||term||'%' OR coalesce(s.codice_fiscale,'') ILIKE '%'||term||'%'));
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_soci_counts(uuid,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_soci_counts(uuid,text[]) TO authenticated;
