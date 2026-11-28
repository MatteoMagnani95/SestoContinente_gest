-- 3.1: two additive read-only staff RPCs; activation remains restricted to isolated QA.
CREATE FUNCTION public.sc_perf_courses_page(p_season text,p_terms text[],p_status text,p_discipline text,p_level integer,p_order text,p_page integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE chosen uuid; result jsonb;
BEGIN
 IF NOT COALESCE(public.is_staff(),false) THEN RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 OR p_order IS NULL OR p_order NOT IN ('nome','nome_desc','inizio','fine') OR p_status IS NULL OR p_status NOT IN ('','programmato','attivo','concluso','annullato') OR p_discipline IS NULL OR p_discipline NOT IN ('','ARA','APNEA','NUOTO_LIBERO') OR (p_level IS NOT NULL AND p_level NOT BETWEEN 1 AND 5) OR cardinality(coalesce(p_terms,ARRAY[]::text[]))>6 OR EXISTS(SELECT 1 FROM unnest(p_terms) AS t(term) WHERE term IS NULL OR length(term)>80 OR strpos(term,'%')>0 OR strpos(term,'_')>0 OR strpos(term,chr(92))>0) THEN
  RAISE EXCEPTION 'Filtro non valido' USING ERRCODE='22023';
 END IF;
 SELECT id INTO chosen FROM public.stagioni WHERE id::text=p_season;
 WITH matching AS MATERIALIZED (
  SELECT e.id,e.nome,e.corso_id,e.stagione_id,e.inizio,e.fine,e.stato,e.massimo_partecipanti,e.direttore_id,jsonb_build_object('nome',c.nome,'tipo',c.tipo,'livello',c.livello) AS corsi
  FROM public.edizioni_corsi e JOIN public.corsi c ON c.id=e.corso_id
  WHERE (chosen IS NULL OR e.stagione_id=chosen)
    AND (p_status='' OR e.stato=p_status)
    AND (p_discipline='' OR c.tipo=p_discipline)
    AND (p_level IS NULL OR c.livello=p_level)
    AND NOT EXISTS(SELECT 1 FROM unnest(p_terms) t(term) WHERE e.nome NOT ILIKE '%'||term||'%')
 ), page_rows AS MATERIALIZED (
  SELECT * FROM matching ORDER BY CASE WHEN p_order='nome' THEN nome END ASC,CASE WHEN p_order='nome_desc' THEN nome END DESC,CASE WHEN p_order='inizio' THEN inizio END DESC,CASE WHEN p_order='fine' THEN fine END DESC,id LIMIT 25 OFFSET (p_page-1)*25
 ), counts AS (
  SELECT i.edizione_id,count(*) AS n FROM public.iscrizioni_corsi i JOIN page_rows r ON r.id=i.edizione_id WHERE i.stato='iscritto' GROUP BY i.edizione_id
 )
 SELECT jsonb_build_object(
  'seasons',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.dal DESC,s.id),'[]'::jsonb) FROM (SELECT id,nome,attiva,dal FROM public.stagioni) s),
  'chosen',coalesce(chosen::text,''),'count',(SELECT count(*) FROM matching),
  'rows',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY CASE WHEN p_order='nome' THEN nome END ASC,CASE WHEN p_order='nome_desc' THEN nome END DESC,CASE WHEN p_order='inizio' THEN inizio END DESC,CASE WHEN p_order='fine' THEN fine END DESC,id),'[]'::jsonb) FROM page_rows r),
  'counts',(SELECT coalesce(jsonb_object_agg(edizione_id,n),'{}'::jsonb) FROM counts),
  'directors',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.id),'[]'::jsonb) FROM (SELECT id,nome,cognome FROM public.persone WHERE id IN (SELECT direttore_id FROM page_rows)) d),
  'staff',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.sort_cognome,a.sort_nome,a.id),'[]'::jsonb) FROM (SELECT id,edizione_id,ruolo,sort_nome,sort_cognome FROM public.gest_elenco_assegnazioni_istruttori WHERE edizione_id IN (SELECT id FROM page_rows)) a),
  'historicalCatalog',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',nome) ORDER BY id),'[]'::jsonb) FROM public.corsi WHERE duplicato_storico),
  'historicalEditions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',nome) ORDER BY id),'[]'::jsonb) FROM public.edizioni_corsi WHERE duplicato_storico)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_courses_page(text,text[],text,text,integer,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_courses_page(text,text[],text,text,integer,text,integer) TO authenticated;

CREATE FUNCTION public.sc_perf_calendar(p_from timestamptz,p_to timestamptz,p_cancelled boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT COALESCE(public.is_staff(),false) THEN RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_cancelled IS NULL OR p_to<=p_from OR p_to-p_from>interval '43 days' THEN RAISE EXCEPTION 'Periodo non valido' USING ERRCODE='22023'; END IF;
 WITH lessons AS MATERIALIZED (
  SELECT id,titolo,edizione_id,inizio,fine,piscina_id,annullata_il FROM public.lezioni
  WHERE inizio<p_to AND fine>p_from AND (p_cancelled OR annullata_il IS NULL)
 ), bookings AS MATERIALIZED (
  SELECT id,lezione_id,corsia_id,inizio,fine,stato FROM public.prenotazioni_corsie
  WHERE stato='confermata' AND inizio<p_to AND fine>p_from
 )
 SELECT jsonb_build_object(
  'pools',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.nome,p.id),'[]'::jsonb) FROM (SELECT id,nome,indirizzo,orari_disponibili,limitazioni FROM public.piscine) p),
  'lanes',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.numero,c.id),'[]'::jsonb) FROM (SELECT id,numero,piscina_id,note FROM public.corsie) c),
  'lessons',(SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.inizio,l.id),'[]'::jsonb) FROM lessons l),
  'bookings',(SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.inizio,b.id),'[]'::jsonb) FROM bookings b),
  'editions',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.nome,e.id),'[]'::jsonb) FROM (SELECT id,nome,stato,inizio,fine FROM public.edizioni_corsi) e),
  'extraLessons',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'titolo',titolo) ORDER BY id),'[]'::jsonb) FROM public.lezioni WHERE id IN (SELECT lezione_id FROM bookings EXCEPT SELECT id FROM lessons))
 ) INTO result;
 -- Never truncate: caller can use the existing paginated fallback on a very large payload.
 IF pg_column_size(result)>2097152 THEN RAISE EXCEPTION 'Calendario troppo esteso per snapshot' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_calendar(timestamptz,timestamptz,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_calendar(timestamptz,timestamptz,boolean) TO authenticated;
