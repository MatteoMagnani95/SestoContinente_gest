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

-- Finance proof: aggregate all filtered rows, never just the visible page.
CREATE FUNCTION public.sc_perf_incassi_totals(p_tab text,p_season uuid,p_status text,p_person uuid,p_debt uuid,p_dal date,p_al date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT COALESCE(public.is_staff(),false) THEN
  RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501';
 END IF;
 IF p_tab IS NULL OR p_tab NOT IN ('quota','corso') OR p_status IS NULL OR p_status NOT IN ('tutte','residuo','non_pagata','parziale','pagata') OR p_season IS NULL OR p_dal>p_al THEN
  RAISE EXCEPTION 'Filtro non valido' USING ERRCODE='22023';
 END IF;
 WITH balances AS (
  SELECT id,persona_id,stagione_id,stato,scadenza,importo_dovuto,versato,residuo FROM public.gest_elenco_saldi_quote WHERE p_tab='quota'
  UNION ALL
  SELECT id,persona_id,stagione_id,stato,scadenza,importo_dovuto,versato,residuo FROM public.gest_elenco_saldi_corsi WHERE p_tab='corso'
 ), selected AS (
  SELECT * FROM balances b
  WHERE b.stagione_id=p_season
   AND (p_status='tutte' OR (p_status='residuo' AND b.residuo>0) OR b.stato::text=p_status)
   AND (p_person IS NULL OR b.persona_id=p_person)
   AND (p_debt IS NULL OR b.id=p_debt)
   AND (p_dal IS NULL OR b.scadenza>=p_dal)
   AND (p_al IS NULL OR b.scadenza<=p_al)
 )
 SELECT jsonb_build_object('due',coalesce(sum(round(importo_dovuto::numeric*100)),0)/100,
  'paid',coalesce(sum(round(versato::numeric*100)),0)/100,
  'residue',coalesce(sum(round(residuo::numeric*100)),0)/100,
  'settled',count(*) FILTER(WHERE round(residuo::numeric*100)=0),
  'open',count(*) FILTER(WHERE round(residuo::numeric*100)<>0))
 INTO result FROM selected;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_incassi_totals(text,uuid,text,uuid,uuid,date,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_incassi_totals(text,uuid,text,uuid,uuid,date,date) TO authenticated;

-- Own-account snapshot only. No caller-supplied user id; no elevated rights.
CREATE FUNCTION public.sc_perf_navigation()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); enabled boolean; result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501'; END IF;
 enabled:=coalesce(public.account_corrente_abilitato(),false);
 IF NOT enabled THEN RETURN jsonb_build_object('enabled',false); END IF;
 WITH owners AS (
  SELECT persona_id FROM public.collegamenti_persone WHERE utente_id=uid AND relazione='titolare' LIMIT 2
 ), req AS (SELECT stato FROM public.richieste WHERE utente_id=uid)
 SELECT jsonb_build_object(
  'enabled',true,
  'roles',(SELECT coalesce(jsonb_agg(ruolo::text ORDER BY ruolo::text),'[]'::jsonb) FROM public.ruoli_utente WHERE utente_id=uid),
  'member',coalesce(public.area_soci_accesso(),false),
  'personal',(SELECT count(*)<=1 FROM req) AND ((SELECT EXISTS(SELECT 1 FROM req WHERE stato='approvata')) OR EXISTS(SELECT 1 FROM public.collegamenti_persone WHERE utente_id=uid)),
  'unread',(SELECT count(*) FROM public.notifiche WHERE utente_id=uid AND letta_il IS NULL),
  'owner',CASE WHEN (SELECT count(*) FROM owners)=1 THEN (SELECT jsonb_build_object('nome',p.nome,'cognome',p.cognome) FROM public.persone p JOIN owners o ON o.persona_id=p.id) END
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_navigation() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_navigation() TO authenticated;


-- Inventory proof: compute complete KPI counts, filter, then return one page.
CREATE FUNCTION public.sc_perf_inventory(p_today date,p_cutoff date,p_query text,p_category text,p_state text,p_revision text,p_page integer,p_edit uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT COALESCE(public.is_staff(),false) THEN RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501'; END IF;
 IF p_today IS NULL OR p_cutoff IS NULL OR p_cutoff<p_today OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR length(coalesce(p_query,''))>80 THEN RAISE EXCEPTION 'Filtro non valido' USING ERRCODE='22023'; END IF;
 WITH all_items AS MATERIALIZED (
  SELECT a.*,EXISTS(SELECT 1 FROM public.assegnazioni_attrezzature l WHERE l.attrezzatura_id=a.id AND l.restituita_il IS NULL) AS has_loan
  FROM public.attrezzature a
 ), derived AS MATERIALIZED (
  SELECT a.*,
   CASE WHEN has_loan THEN CASE WHEN stato IN ('in_manutenzione','fuori_servizio') THEN stato ELSE 'assegnata' END WHEN stato='assegnata' THEN 'incongruente' ELSE stato END AS display_state,
   CASE WHEN prossima_revisione IS NULL THEN 'non_acquisita' WHEN prossima_revisione<p_today THEN 'scaduta' WHEN prossima_revisione<=p_cutoff THEN 'in_scadenza' ELSE 'registrata' END AS revision_state
  FROM all_items a
 ), filtered AS MATERIALIZED (
  SELECT a.* FROM derived a
  WHERE (coalesce(p_query,'')='' OR EXISTS(SELECT 1 FROM unnest(ARRAY[a.codice,a.categoria,a.marca,a.modello,a.matricola]) v WHERE strpos(lower(v COLLATE pg_catalog."it-x-icu"),lower(p_query COLLATE pg_catalog."it-x-icu"))>0))
   AND (coalesce(p_category,'')='' OR categoria=p_category)
   AND (coalesce(p_state,'')='' OR display_state=p_state)
   AND (coalesce(p_revision,'')='' OR revision_state=p_revision)
 ), direct AS (SELECT * FROM derived WHERE id=p_edit),
 selected AS (
  SELECT * FROM direct
  UNION ALL
  SELECT * FROM (SELECT * FROM filtered ORDER BY codice,id LIMIT 30 OFFSET (p_page-1)*30) a WHERE NOT EXISTS(SELECT 1 FROM direct)
 ), upcoming AS (
  SELECT * FROM derived WHERE revision_state IN ('scaduta','in_scadenza') ORDER BY prossima_revisione,codice COLLATE pg_catalog."it-x-icu",id LIMIT 6
 )
 SELECT jsonb_build_object(
  'count',(SELECT count(*) FROM filtered),
  'direct',EXISTS(SELECT 1 FROM direct),
  'categories',(SELECT coalesce(jsonb_agg(categoria ORDER BY categoria COLLATE pg_catalog."it-x-icu"),'[]'::jsonb) FROM (SELECT DISTINCT categoria FROM derived) c),
  'metrics',(SELECT jsonb_build_object('available',count(*) FILTER(WHERE display_state='disponibile'),'loaned',count(*) FILTER(WHERE has_loan),'maintenance',count(*) FILTER(WHERE stato='in_manutenzione'),'out',count(*) FILTER(WHERE stato='fuori_servizio'),'due',count(*) FILTER(WHERE revision_state='in_scadenza'),'total',count(*)) FROM derived),
  'rows',(SELECT coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('locked',EXISTS(SELECT 1 FROM public.revisioni_attrezzature r WHERE r.attrezzatura_id=s.id)) ORDER BY s.codice,s.id),'[]'::jsonb) FROM selected s),
  'upcomingCount',(SELECT count(*) FROM derived WHERE revision_state IN ('scaduta','in_scadenza')),
  'upcoming',(SELECT coalesce(jsonb_agg(to_jsonb(u) ORDER BY u.prossima_revisione,u.codice COLLATE pg_catalog."it-x-icu",u.id),'[]'::jsonb) FROM upcoming u)
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_inventory(date,date,text,text,text,text,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_inventory(date,date,text,text,text,text,integer,uuid) TO authenticated;

-- First search prototype for staff-only person selectors. Selected ID is retained separately.
CREATE FUNCTION public.sc_perf_person_options(p_query text,p_page integer,p_selected uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb; term text;
BEGIN
 IF NOT COALESCE(public.is_staff(),false) THEN RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR length(coalesce(p_query,''))>120 THEN RAISE EXCEPTION 'Filtro non valido' USING ERRCODE='22023'; END IF;
 term:=lower(regexp_replace(normalize(btrim(coalesce(p_query,'')),NFD),U&'[\0300-\036f]','','g') COLLATE pg_catalog."it-x-icu");
 WITH matches AS MATERIALIZED (
  SELECT id,nome,cognome FROM public.persone
  WHERE strpos(lower(regexp_replace(normalize(cognome||' '||nome,NFD),U&'[\0300-\036f]','','g') COLLATE pg_catalog."it-x-icu"),term)>0 OR term=''
 ), page AS (SELECT * FROM matches ORDER BY cognome,nome,id LIMIT 50 OFFSET (p_page-1)*50)
 SELECT jsonb_build_object('count',(SELECT count(*) FROM matches),
  'options',(SELECT coalesce(jsonb_agg(jsonb_build_object('value',id,'label',cognome||' '||nome) ORDER BY cognome,nome,id),'[]'::jsonb) FROM page),
  'selected',(SELECT jsonb_build_object('value',id,'label',cognome||' '||nome) FROM public.persone WHERE id=p_selected))
 INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_person_options(text,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_person_options(text,integer,uuid) TO authenticated;


-- Single fresh, consistent member list snapshot, with exactly the original filter semantics.
CREATE FUNCTION public.sc_perf_soci_page(p_season text,p_terms text[],p_status text,p_order text,p_page integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE chosen uuid; season_options jsonb; result jsonb;
BEGIN
 IF NOT COALESCE(public.is_staff(),false) THEN RAISE EXCEPTION 'Accesso non autorizzato' USING ERRCODE='42501'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 10000 OR p_order IS NULL OR p_order NOT IN ('asc','desc') OR p_status IS NULL OR p_status NOT IN ('','attiva','da_perfezionare','sospesa','cessata') OR cardinality(coalesce(p_terms,ARRAY[]::text[]))>6 OR EXISTS(SELECT 1 FROM unnest(p_terms) AS t(term) WHERE term IS NULL OR length(term)>80 OR strpos(term,'%')>0 OR strpos(term,'_')>0 OR strpos(term,chr(92))>0) THEN
  RAISE EXCEPTION 'Filtro non valido' USING ERRCODE='22023';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'nome',nome,'attiva',attiva) ORDER BY dal DESC,id),'[]'::jsonb) INTO season_options FROM public.stagioni;
 SELECT id INTO chosen FROM public.stagioni WHERE id::text=p_season;
 IF chosen IS NULL AND p_season IS DISTINCT FROM 'tutte' THEN SELECT id INTO chosen FROM public.stagioni WHERE attiva ORDER BY dal DESC,id LIMIT 1; END IF;
 WITH matching AS MATERIALIZED (
  SELECT adesione_id,persona_id,stagione_id,stagione,stato,nome,cognome,codice_fiscale,email,telefono FROM public.schede_soci s
  WHERE (chosen IS NULL OR s.stagione_id=chosen)
  AND NOT EXISTS(SELECT 1 FROM unnest(p_terms) AS t(term) WHERE NOT(coalesce(s.nome,'') ILIKE '%'||term||'%' OR coalesce(s.cognome,'') ILIKE '%'||term||'%' OR coalesce(s.codice_fiscale,'') ILIKE '%'||term||'%'))
 ), selected AS MATERIALIZED (
  SELECT * FROM matching WHERE p_status='' OR stato::text=p_status
 ), page_rows AS (
  SELECT * FROM selected ORDER BY CASE WHEN p_order='asc' THEN cognome END ASC,CASE WHEN p_order='desc' THEN cognome END DESC,CASE WHEN p_order='asc' THEN nome END ASC,CASE WHEN p_order='desc' THEN nome END DESC,adesione_id LIMIT 25 OFFSET (p_page-1)*25
 )
 SELECT jsonb_build_object('seasons',season_options,'chosen',coalesce(chosen::text,'tutte'),
 'count',(SELECT count(*) FROM selected),
 'counts',(SELECT jsonb_build_object('total',count(*),'attiva',count(*) FILTER(WHERE stato='attiva'),'da_perfezionare',count(*) FILTER(WHERE stato='da_perfezionare'),'sospesa',count(*) FILTER(WHERE stato='sospesa'),'cessata',count(*) FILTER(WHERE stato='cessata')) FROM matching),
 'rows',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY CASE WHEN p_order='asc' THEN cognome END ASC,CASE WHEN p_order='desc' THEN cognome END DESC,CASE WHEN p_order='asc' THEN nome END ASC,CASE WHEN p_order='desc' THEN nome END DESC,adesione_id),'[]'::jsonb) FROM page_rows r))
 INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sc_perf_soci_page(text,text[],text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sc_perf_soci_page(text,text[],text,text,integer) TO authenticated;
