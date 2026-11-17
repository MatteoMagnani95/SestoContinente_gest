-- 0017: correzione SQLSTATE 42702 nella cancellazione completa (0016).
-- Installazione non distruttiva: sostituisce soltanto due funzioni, non le invoca.
-- Si preservano firma, privilegi, criteri di selezione e controlli di sicurezza.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_piano_eliminazione_0016(p_utente uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_persone uuid[]; v_pratiche uuid[]; v_escluse uuid[]; v_adesioni uuid[]; v_iscrizioni uuid[]; v_quote uuid[]; v_addebiti uuid[]; v_pagamenti uuid[]; v_documenti uuid[]; v_cfs text[];
 files jsonb; conteggi jsonb:='{}'; impronta jsonb:='{}'; blocchi text[]:=ARRAY[]::text[]; r record; n bigint; righe jsonb; extra jsonb; raw_plan jsonb;
BEGIN
 IF NOT public.is_admin() OR p_utente IS NULL OR p_utente=auth.uid() THEN RAISE EXCEPTION 'Account protetto o permessi insufficienti' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.ruoli_utente WHERE utente_id=p_utente AND ruolo='amministratore') THEN RAISE EXCEPTION 'Revocare prima il ruolo amministratore' USING ERRCODE='P3414'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_utente) THEN RAISE EXCEPTION 'Account inesistente' USING ERRCODE='P3414'; END IF;
 SELECT ARRAY(SELECT id FROM public.richieste WHERE utente_id=p_utente ORDER BY id) INTO v_pratiche;
 SELECT ARRAY(SELECT id FROM public.persone p WHERE (EXISTS(SELECT 1 FROM public.collegamenti_persone c WHERE c.persona_id=p.id AND c.utente_id=p_utente AND c.relazione='titolare') OR EXISTS(SELECT 1 FROM public.richieste q WHERE q.utente_id=p_utente AND q.persona_id=p.id)) AND NOT EXISTS(SELECT 1 FROM public.collegamenti_persone c WHERE c.persona_id=p.id AND c.utente_id<>p_utente) AND NOT EXISTS(SELECT 1 FROM public.richieste q WHERE q.persona_id=p.id AND q.utente_id<>p_utente) ORDER BY id) INTO v_persone;
 SELECT ARRAY(SELECT DISTINCT persona_id FROM public.collegamenti_persone WHERE utente_id=p_utente AND NOT(persona_id=ANY(v_persone)) ORDER BY persona_id) INTO v_escluse;
 -- Evita di eliminare la pratica di un altro account o documenti appartenenti ad altri profili.
 SELECT ARRAY(SELECT id FROM public.adesioni WHERE persona_id=ANY(v_persone) ORDER BY id), ARRAY(SELECT id FROM public.iscrizioni_corsi WHERE persona_id=ANY(v_persone) ORDER BY id), ARRAY(SELECT id FROM public.quote_associative WHERE persona_id=ANY(v_persone) ORDER BY id) INTO v_adesioni,v_iscrizioni,v_quote;
 SELECT ARRAY(SELECT id FROM public.addebiti_corsi WHERE iscrizione_id=ANY(v_iscrizioni) ORDER BY id) INTO v_addebiti;
 SELECT ARRAY(SELECT id FROM public.pagamenti WHERE persona_id=ANY(v_persone) ORDER BY id) INTO v_pagamenti;
 SELECT ARRAY(SELECT id FROM public.documenti WHERE (persona_id=ANY(v_persone) OR (utente_id=p_utente AND ambito='personale' AND persona_id IS NULL)) AND (utente_id IS NULL OR utente_id=p_utente) AND ambito IN ('personale','amministrativo','didattica') AND edizione_id IS NULL AND programma_versione_id IS NULL ORDER BY id) INTO v_documenti;
 SELECT ARRAY(SELECT DISTINCT upper(btrim(cf)) FROM (SELECT codice_fiscale cf FROM public.persone WHERE id=ANY(v_persone) UNION ALL SELECT codice_fiscale FROM public.richieste WHERE id=ANY(v_pratiche) AND (persona_id IS NULL OR persona_id=ANY(v_persone))) c WHERE nullif(btrim(cf),'') IS NOT NULL ORDER BY 1) INTO v_cfs;
 IF EXISTS(SELECT 1 FROM public.cda_votanti WHERE utente_id=p_utente OR persona_id=ANY(v_persone)) THEN blocchi:=array_append(blocchi,'Votazioni CdA collegate: occorre conservare o gestire separatamente i verbali ufficiali.'); END IF;
 IF EXISTS(SELECT 1 FROM public.cda_adesioni a JOIN public.cda_verbali v ON v.id=a.verbale_id WHERE a.adesione_id=ANY(v_adesioni) AND v.stato='in_approvazione') THEN blocchi:=array_append(blocchi,'Adesione coinvolta in una votazione CdA in corso: concludere la votazione prima di eliminare.'); END IF;
 IF EXISTS(SELECT 1 FROM public.cda_verbali WHERE creato_da=p_utente OR rimosso_da=p_utente) THEN blocchi:=array_append(blocchi,'Verbali CdA creati/rimossi dall’account: archivio condiviso da gestire separatamente.'); END IF;
 IF EXISTS(SELECT 1 FROM public.assegnazioni_istruttori WHERE persona_id=ANY(v_persone) AND ruolo='responsabile') THEN blocchi:=array_append(blocchi,'L’utente è responsabile di un corso: assegnare prima un altro responsabile.'); END IF;
 IF EXISTS(SELECT 1 FROM public.certificati_medici WHERE documento_id=ANY(v_documenti) AND NOT(persona_id=ANY(v_persone))) THEN blocchi:=array_append(blocchi,'Un documento personale è collegato al certificato di un altro socio.'); END IF;
 IF EXISTS(SELECT 1 FROM public.documenti WHERE NOT(id=ANY(v_documenti)) AND (utente_id=p_utente OR caricato_da=p_utente OR persona_id=ANY(v_persone))) THEN blocchi:=array_append(blocchi,'Documenti di altri profili o condivisi: rimuovere o trasferire esplicitamente i collegamenti prima di procedere.'); END IF;
 IF EXISTS(SELECT 1 FROM public.pagamenti WHERE (quota_id=ANY(v_quote) OR addebito_corso_id=ANY(v_addebiti)) AND NOT(persona_id=ANY(v_persone))) THEN blocchi:=array_append(blocchi,'Pagamento collegato a un altro socio: verificare la coerenza dei dati.'); END IF;
 -- Non usare SQL per cancellare storage.objects: la rimozione fisica sarà effettuata tramite Storage API.
 -- Oggetti personali o orfani posseduti dall’utente nel bucket documenti; mai oggetti condivisi o CdA.
 IF EXISTS(SELECT 1 FROM storage.objects o WHERE (to_jsonb(o)->>'owner_id'=p_utente::text OR to_jsonb(o)->>'owner'=p_utente::text) AND (o.bucket_id<>'sesto-documenti' OR EXISTS(SELECT 1 FROM public.documenti d WHERE d.percorso_storage=o.name AND NOT(d.id=ANY(v_documenti))))) THEN blocchi:=array_append(blocchi,'File Storage condivisi o in altri bucket di proprietà dell’utente: trasferirli/gestirli prima di cancellare l’account.'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('bucket',s.bucket,'path',s.path) ORDER BY s.bucket,s.path),'[]'::jsonb) INTO files FROM (
  SELECT 'sesto-documenti'::text AS bucket,percorso_storage AS path FROM public.documenti WHERE id=ANY(v_documenti)
  UNION SELECT o.bucket_id,o.name FROM storage.objects o WHERE o.bucket_id='sesto-documenti' AND (to_jsonb(o)->>'owner_id'=p_utente::text OR to_jsonb(o)->>'owner'=p_utente::text OR split_part(o.name,'/',1)=p_utente::text) AND NOT EXISTS(SELECT 1 FROM public.documenti d WHERE d.percorso_storage=o.name)
 ) s;
 -- Ogni predicato proviene da una whitelist interna, nessuna tabella fornita dal client.
 FOR r IN SELECT * FROM (VALUES
('eventi_pratica','richiesta_id = ANY($3)'),
  ('eventi_soci_iscrizioni','utente_id=$1 OR persona_id=ANY($2)'),
  ('notifiche','utente_id=$1 OR (tipo=''nuova_domanda'' AND split_part(riferimento,'':'',1)=ANY(ARRAY(SELECT x::text FROM unnest($3) x)))'),
  ('movimenti_economici','pagamento_id=ANY($9)'),
  ('rettifiche_incassi','pagamento_originale->>''persona_id''=ANY(ARRAY(SELECT x::text FROM unnest($2) x)) OR pagamento_id=ANY($9)'),
  ('pagamenti','id=ANY($9)'),
  ('addebiti_corsi','id=ANY($8)'),
  ('quote_associative','id=ANY($7)'),
  ('presenze','persona_id=ANY($2)'),
  ('iscrizioni_corsi','id=ANY($6)'),
  ('assegnazioni_attrezzature','persona_id=ANY($2)'),
  ('assegnazioni_istruttori','persona_id=ANY($2)'),
  ('qualifiche_istruttori','persona_id=ANY($2)'),
  ('brevetti_allievi','persona_id=ANY($2)'),
  ('certificati_medici','persona_id=ANY($2)'),
  ('documenti','id=ANY($10)'),
  ('tesseramenti','adesione_id=ANY($5)'),
  ('cda_componenti','persona_id=ANY($2)'),
  ('cda_adesioni','adesione_id=ANY($5)'),
  ('adesioni','id=ANY($5)'),
  ('provenienza_accettazioni_storiche','persona_id=ANY($2)'),
  ('importazioni_righe','importato_id=ANY($2) OR importato_id=ANY($6) OR upper(btrim(dati->>''codice_fiscale''))=ANY($11)'),
  ('richieste','id=ANY($3)'),
  ('relazioni_tutori','minore_id=ANY($2) OR tutore_id=ANY($2)'),
  ('collegamenti_persone','utente_id=$1 OR persona_id=ANY($2)'),
  ('ruoli_utente','utente_id=$1'),
  ('persone','id=ANY($2)')
 ) AS t(tabella,predicato) LOOP
  EXECUTE format('SELECT count(*),coalesce(jsonb_agg(md5(to_jsonb(x)::text) ORDER BY md5(to_jsonb(x)::text)),''[]''::jsonb) FROM public.%I x WHERE %s',r.tabella,r.predicato)
   INTO n,righe USING p_utente,v_persone,v_pratiche,v_escluse,v_adesioni,v_iscrizioni,v_quote,v_addebiti,v_pagamenti,v_documenti,v_cfs;
  conteggi:=conteggi||jsonb_build_object(r.tabella,n);
  impronta:=impronta||jsonb_build_object(r.tabella,righe);
 END LOOP;
 SELECT jsonb_build_object('eventi_trasferiti',(SELECT count(*) FROM public.eventi_soci WHERE responsabile_id=p_utente),'riferimenti_anonimizzati',
 (SELECT count(*) FROM public.eventi_pratica WHERE attore_id=p_utente AND NOT(richiesta_id=ANY(v_pratiche)))+
 (SELECT count(*) FROM public.richieste WHERE esaminatore_id=p_utente AND NOT(id=ANY(v_pratiche)))+
 (SELECT count(*) FROM public.pagamenti WHERE registrato_da=p_utente AND NOT(id=ANY(v_pagamenti)))+
 (SELECT count(*) FROM public.comunicazioni WHERE autore_id=p_utente)+
 (SELECT count(*) FROM public.importazioni_batch WHERE creato_da=p_utente)+
 (SELECT count(*) FROM public.cda_versioni_bozze WHERE archiviata_da=p_utente)+
 (SELECT count(*) FROM public.eventi_soci_iscrizioni WHERE deciso_da=p_utente AND utente_id<>p_utente AND NOT(persona_id=ANY(v_persone)))) INTO extra;
 raw_plan:=jsonb_build_object('persona_ids',v_persone,'pratica_ids',v_pratiche,'escluse',v_escluse,'adesione_ids',v_adesioni,'iscrizione_ids',v_iscrizioni,'quota_ids',v_quote,'addebito_ids',v_addebiti,'pagamento_ids',v_pagamenti,'documento_ids',v_documenti,'cfs',v_cfs,'file',files,'conteggi',conteggi,'blocchi',blocchi,'extra',extra);
 RETURN raw_plan||jsonb_build_object('hash',md5(raw_plan::text||impronta::text));
END; $$;
REVOKE ALL ON FUNCTION public.admin_piano_eliminazione_0016(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_avvia_eliminazione_account(p_utente uuid,p_hash text,p_conferma text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb; v_persone uuid[]; v_pratiche uuid[]; v_escluse uuid[]; v_adesioni uuid[]; v_iscrizioni uuid[]; v_quote uuid[]; v_addebiti uuid[]; v_pagamenti uuid[]; v_documenti uuid[]; v_cfs text[]; r record; existing jsonb;
BEGIN
 IF NOT public.is_admin() OR p_utente IS NULL OR p_utente=auth.uid() OR p_conferma IS DISTINCT FROM 'ELIMINA DEFINITIVAMENTE' THEN RAISE EXCEPTION 'Operazione non consentita' USING ERRCODE='42501'; END IF;
 -- Evita modifiche concorrenti al piano e a ruoli; lock timeout breve per non bloccare il gestionale.
 PERFORM set_config('lock_timeout','5s',true);
 PERFORM pg_advisory_xact_lock(7300413);
 SELECT file_da_rimuovere INTO existing FROM public.eliminazioni_account_pendenti WHERE utente_id=p_utente FOR UPDATE;
 IF FOUND THEN RETURN existing; END IF;
 PERFORM 1 FROM auth.users WHERE id=p_utente FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account inesistente' USING ERRCODE='P3414'; END IF;
 -- Blocca le scritture applicative per il solo tempo della transazione, prevenendo variazioni/cascade non viste nell'anteprima.
 LOCK TABLE public.adesioni,public.addebiti_corsi,public.assegnazioni_attrezzature,public.assegnazioni_istruttori,public.brevetti_allievi,public.cda_adesioni,public.cda_componenti,public.cda_verbali,public.cda_versioni_bozze,public.cda_votanti,public.cda_voti,public.certificati_medici,public.collegamenti_persone,public.comunicazioni,public.documenti,public.eventi_pratica,public.eventi_soci,public.eventi_soci_iscrizioni,public.importazioni_batch,public.importazioni_righe,public.iscrizioni_corsi,public.movimenti_economici,public.notifiche,public.pagamenti,public.persone,public.presenze,public.provenienza_accettazioni_storiche,public.qualifiche_istruttori,public.quote_associative,public.relazioni_tutori,public.rettifiche_incassi,public.richieste,public.ruoli_utente,public.tesseramenti IN SHARE ROW EXCLUSIVE MODE;
 v:=public.admin_piano_eliminazione_0016(p_utente);
 IF p_hash IS DISTINCT FROM v->>'hash' THEN RAISE EXCEPTION 'Dati cambiati: aggiornare l’anteprima' USING ERRCODE='P3414'; END IF;
 IF jsonb_array_length(v->'blocchi')>0 THEN RAISE EXCEPTION 'Sono presenti dati condivisi o protetti: controllare l’anteprima' USING ERRCODE='P3414'; END IF;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'persona_ids') x) INTO v_persone;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'pratica_ids') x) INTO v_pratiche;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'escluse') x) INTO v_escluse;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'adesione_ids') x) INTO v_adesioni;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'iscrizione_ids') x) INTO v_iscrizioni;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'quota_ids') x) INTO v_quote;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'addebito_ids') x) INTO v_addebiti;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'pagamento_ids') x) INTO v_pagamenti;
 SELECT ARRAY(SELECT x::uuid FROM jsonb_array_elements_text(v->'documento_ids') x) INTO v_documenti;
 SELECT ARRAY(SELECT x FROM jsonb_array_elements_text(v->'cfs') x) INTO v_cfs;
 -- Mantiene eventi e comunicazioni condivisi; rimuove il legame con l'utente cancellato.
 UPDATE public.eventi_soci SET responsabile_id=auth.uid() WHERE responsabile_id=p_utente;
 UPDATE public.eventi_soci_iscrizioni SET deciso_da=NULL WHERE deciso_da=p_utente AND utente_id<>p_utente AND NOT(persona_id=ANY(v_persone));
 UPDATE public.eventi_pratica SET attore_id=NULL WHERE attore_id=p_utente AND NOT(richiesta_id=ANY(v_pratiche));
 UPDATE public.richieste SET esaminatore_id=NULL WHERE esaminatore_id=p_utente AND NOT(id=ANY(v_pratiche));
 UPDATE public.pagamenti SET registrato_da=NULL WHERE registrato_da=p_utente AND NOT(id=ANY(v_pagamenti));
 UPDATE public.comunicazioni SET autore_id=NULL WHERE autore_id=p_utente;
 UPDATE public.importazioni_batch SET creato_da=NULL WHERE creato_da=p_utente;
 UPDATE public.cda_versioni_bozze SET archiviata_da=NULL WHERE archiviata_da=p_utente;
 UPDATE public.rettifiche_incassi SET pagamento_originale=jsonb_set(pagamento_originale,'{registrato_da}','null'::jsonb) WHERE pagamento_originale->>'registrato_da'=p_utente::text;
 UPDATE public.registro_operazioni SET utente_id=NULL WHERE utente_id=p_utente;
 -- Rimuove i riferimenti identificativi diretti all’account dal registro, ma non cancella le registrazioni di operazioni su terzi.
 UPDATE public.registro_operazioni SET record_id=NULL WHERE tabella='auth.users' AND record_id=p_utente;
 -- Rimuove prima le foglie quindi le righe padre. Non disabilita trigger o RLS globalmente.
 FOR r IN SELECT * FROM (VALUES
  (1,'eventi_pratica','richiesta_id = ANY($3)'),
  (2,'eventi_soci_iscrizioni','utente_id=$1 OR persona_id=ANY($2)'),
  (3,'notifiche','utente_id=$1 OR (tipo=''nuova_domanda'' AND split_part(riferimento,'':'',1)=ANY(ARRAY(SELECT x::text FROM unnest($3) x)))'),
  (4,'movimenti_economici','pagamento_id=ANY($9)'),
  (5,'rettifiche_incassi','pagamento_originale->>''persona_id''=ANY(ARRAY(SELECT x::text FROM unnest($2) x)) OR pagamento_id=ANY($9)'),
  (6,'pagamenti','id=ANY($9)'),
  (7,'addebiti_corsi','id=ANY($8)'),
  (8,'quote_associative','id=ANY($7)'),
  (9,'presenze','persona_id=ANY($2)'),
  (10,'iscrizioni_corsi','id=ANY($6)'),
  (11,'assegnazioni_attrezzature','persona_id=ANY($2)'),
  (12,'assegnazioni_istruttori','persona_id=ANY($2)'),
  (13,'qualifiche_istruttori','persona_id=ANY($2)'),
  (14,'brevetti_allievi','persona_id=ANY($2)'),
  (15,'certificati_medici','persona_id=ANY($2)'),
  (16,'documenti','id=ANY($10)'),
  (17,'tesseramenti','adesione_id=ANY($5)'),
  (18,'cda_componenti','persona_id=ANY($2)'),
  (19,'cda_adesioni','adesione_id=ANY($5)'),
  (20,'adesioni','id=ANY($5)'),
  (21,'provenienza_accettazioni_storiche','persona_id=ANY($2)'),
  (22,'importazioni_righe','importato_id=ANY($2) OR importato_id=ANY($6) OR upper(btrim(dati->>''codice_fiscale''))=ANY($11)'),
  (23,'richieste','id=ANY($3)'),
  (24,'relazioni_tutori','minore_id=ANY($2) OR tutore_id=ANY($2)'),
  (25,'collegamenti_persone','utente_id=$1 OR persona_id=ANY($2)'),
  (26,'ruoli_utente','utente_id=$1'),
  (27,'persone','id=ANY($2)')
 ) AS t(ordine,tabella,predicato) ORDER BY ordine LOOP
  IF r.tabella='documenti' AND EXISTS (SELECT 1 FROM unnest(v_documenti) AS p(id) CROSS JOIN LATERAL public.admin_fk_dipendenze('public','documenti',p.id)) THEN RAISE EXCEPTION 'Dipendenze documentali residue: operazione annullata' USING ERRCODE='P3414'; END IF;
  IF r.tabella='persone' AND EXISTS (SELECT 1 FROM unnest(v_persone) AS p(id) CROSS JOIN LATERAL public.admin_fk_dipendenze('public','persone',p.id)) THEN RAISE EXCEPTION 'Dipendenze anagrafiche residue: operazione annullata' USING ERRCODE='P3414'; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE %s',r.tabella,r.predicato)
   USING p_utente,v_persone,v_pratiche,v_escluse,v_adesioni,v_iscrizioni,v_quote,v_addebiti,v_pagamenti,v_documenti,v_cfs;
 END LOOP;
 -- Verifica tutte le FK verso Auth, comprese quelle introdotte da altre migrazioni.
 IF EXISTS(SELECT 1 FROM public.admin_fk_dipendenze('auth','users',p_utente)) THEN RAISE EXCEPTION 'Riferimenti Auth residui: nessun dato eliminato' USING ERRCODE='P3414'; END IF;
 UPDATE auth.users SET banned_until=now()+interval '100 years' WHERE id=p_utente;
 INSERT INTO public.eliminazioni_account_pendenti(utente_id,file_da_rimuovere) VALUES(p_utente,v->'file');
 INSERT INTO public.registro_operazioni(utente_id,tabella,operazione,record_id) VALUES(auth.uid(),'auth.users','ELIMINAZIONE_COMPLETA_AVVIATA',NULL);
 RETURN v->'file';
END; $$;
REVOKE ALL ON FUNCTION public.admin_avvia_eliminazione_account(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_avvia_eliminazione_account(uuid,text,text) TO authenticated;
COMMIT;
