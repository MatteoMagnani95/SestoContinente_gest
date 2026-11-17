-- 0015: gestione amministrativa di account e dati; nessuna cancellazione durante l'installazione.
BEGIN;
CREATE OR REPLACE FUNCTION public.account_corrente_abilitato() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now()));
$$;
REVOKE ALL ON FUNCTION public.account_corrente_abilitato() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_corrente_abilitato() TO authenticated;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.account_corrente_abilitato() AND EXISTS(SELECT 1 FROM public.ruoli_utente WHERE utente_id=auth.uid() AND ruolo='amministratore');
$$;
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.account_corrente_abilitato() AND EXISTS(SELECT 1 FROM public.ruoli_utente WHERE utente_id=auth.uid() AND ruolo IN ('amministratore','segreteria'));
$$;
CREATE OR REPLACE FUNCTION public.is_instructor() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.account_corrente_abilitato() AND EXISTS(SELECT 1 FROM public.ruoli_utente WHERE utente_id=auth.uid() AND ruolo='istruttore');
$$;
CREATE OR REPLACE FUNCTION public.is_board() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.account_corrente_abilitato() AND EXISTS(SELECT 1 FROM public.ruoli_utente WHERE utente_id=auth.uid() AND ruolo='consigliere_cda');
$$;
CREATE OR REPLACE FUNCTION public.owns_person(p_persona uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.account_corrente_abilitato() AND EXISTS(SELECT 1 FROM public.collegamenti_persone WHERE persona_id=p_persona AND utente_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.area_soci_miei_profili() RETURNS TABLE(persona_id uuid,nome text,cognome text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p.id,p.nome,p.cognome FROM public.collegamenti_persone c JOIN public.persone p ON p.id=c.persona_id
 WHERE c.utente_id=auth.uid() AND c.relazione='titolare' AND public.account_corrente_abilitato() AND public.area_soci_persona_attiva(p.id) ORDER BY p.cognome,p.nome,p.id;
$$;
CREATE OR REPLACE FUNCTION public.insegna_edizione(p_edizione uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.account_corrente_abilitato() AND EXISTS(SELECT 1 FROM public.assegnazioni_istruttori a JOIN public.collegamenti_persone cp ON cp.persona_id=a.persona_id WHERE cp.utente_id=auth.uid() AND a.edizione_id=p_edizione);
$$;
CREATE OR REPLACE FUNCTION public.iscritto_edizione(p_edizione uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.account_corrente_abilitato() AND EXISTS(SELECT 1 FROM public.iscrizioni_corsi i JOIN public.collegamenti_persone cp ON cp.persona_id=i.persona_id WHERE cp.utente_id=auth.uid() AND i.edizione_id=p_edizione AND i.stato IN ('iscritto','concluso'));
$$;
-- Blocca anche scritture tramite vecchie RPC SECURITY DEFINER con JWT non ancora scaduti.
CREATE OR REPLACE FUNCTION public.verifica_account_scrittura_0015() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND NOT public.account_corrente_abilitato() THEN RAISE EXCEPTION 'Account non abilitato' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.verifica_account_scrittura_0015() FROM PUBLIC,anon,authenticated;
-- RLS restrittiva: non estende i permessi esistenti. Mantiene le policy specifiche per ruolo.
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT n.nspname,c.relname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN ('r','p') AND c.relrowsecurity AND ((n.nspname='public' AND c.relname IN ('stagioni','ruoli_utente','richieste','persone','collegamenti_persone','relazioni_tutori','adesioni','eventi_pratica','programmi_didattici','versioni_programmi','corsi','edizioni_corsi','iscrizioni_corsi','qualifiche_istruttori','assegnazioni_istruttori','brevetti_allievi','certificati_medici','piscine','corsie','lezioni','prenotazioni_corsie','presenze','attrezzature','revisioni_attrezzature','assegnazioni_attrezzature','quote_associative','addebiti_corsi','pagamenti','movimenti_economici','documenti','comunicazioni','notifiche','impostazioni_promemoria','registro_operazioni','tesseramenti','listino_corsi','cda_componenti','cda_verbali','cda_votanti','cda_voti','cda_adesioni','moduli_didattici','lezione_moduli','importazioni_batch','importazioni_righe','provenienza_accettazioni_storiche','cda_versioni_bozze','eventi_soci','eventi_soci_iscrizioni')) OR (n.nspname='storage' AND c.relname='objects')) LOOP
  EXECUTE format('DROP POLICY IF EXISTS account_abilitato_0015 ON %I.%I',t.nspname,t.relname);
  EXECUTE format('CREATE POLICY account_abilitato_0015 ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.account_corrente_abilitato())) WITH CHECK ((SELECT public.account_corrente_abilitato()))',t.nspname,t.relname);
  IF t.nspname='public' THEN
   EXECUTE format('CREATE TRIGGER verifica_account_scrittura_0015 BEFORE INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.verifica_account_scrittura_0015()',t.nspname,t.relname);
  END IF;
 END LOOP;
END; $$;
-- Restituisce solo metadati amministrativi. Mai hash, token o fattori di autenticazione.
CREATE OR REPLACE FUNCTION public.admin_elenco_account(p_q text DEFAULT '',p_offset integer DEFAULT 0,p_limit integer DEFAULT 50,p_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid,email text,nome text,cognome text,ruoli text[],creato_il timestamptz,confermato_il timestamptz,ultimo_accesso timestamptz,bloccato_fino timestamptz,rimosso_il timestamptz,totale bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo amministratori' USING ERRCODE='42501'; END IF;
 RETURN QUERY WITH base AS (
 SELECT u.id,u.email::text,coalesce(p.nome,r.nome) AS nome,coalesce(p.cognome,r.cognome) AS cognome,
 ARRAY(SELECT a.ruolo::text FROM public.ruoli_utente a WHERE a.utente_id=u.id ORDER BY a.ruolo::text) AS ruoli,
 u.created_at,u.email_confirmed_at,u.last_sign_in_at,u.banned_until,u.deleted_at
 FROM auth.users u
 LEFT JOIN LATERAL (SELECT x.nome,x.cognome FROM public.collegamenti_persone c JOIN public.persone x ON x.id=c.persona_id WHERE c.utente_id=u.id ORDER BY (c.relazione='titolare') DESC,x.cognome,x.nome,x.id LIMIT 1) p ON true
 LEFT JOIN public.richieste r ON r.utente_id=u.id
 WHERE p_id IS NULL OR u.id=p_id
 ) SELECT b.id,b.email,b.nome,b.cognome,b.ruoli,b.created_at,b.email_confirmed_at,b.last_sign_in_at,b.banned_until,b.deleted_at,count(*) OVER()
 FROM base b WHERE coalesce(p_q,'')='' OR strpos(lower(concat_ws(' ',b.cognome,b.nome,b.email,b.id::text)),lower(left(p_q,150)))>0
 ORDER BY lower(b.cognome) NULLS LAST,lower(b.nome) NULLS LAST,lower(b.email) NULLS LAST,b.id
 OFFSET greatest(coalesce(p_offset,0),0) LIMIT least(greatest(coalesce(p_limit,50),1),100);
END; $$;
-- Conta i riferimenti reali: comprende FK CASCADE, SET NULL e chiavi composte.
CREATE OR REPLACE FUNCTION public.admin_fk_dipendenze(p_schema text,p_tabella text,p_id uuid)
RETURNS TABLE(tabella text,vincolo text,numero bigint) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE target oid; fk record; n bigint;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo amministratori' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR NOT ((p_schema='auth' AND p_tabella='users') OR (p_schema='public' AND p_tabella IN ('persone','adesioni','tesseramenti','stagioni','corsi','edizioni_corsi','iscrizioni_corsi','assegnazioni_istruttori','qualifiche_istruttori','brevetti_allievi','certificati_medici','programmi_didattici','versioni_programmi','piscine','corsie','lezioni','prenotazioni_corsie','presenze','attrezzature','revisioni_attrezzature','assegnazioni_attrezzature','quote_associative','addebiti_corsi','pagamenti','movimenti_economici','comunicazioni','impostazioni_promemoria','richieste','cda_componenti','moduli_didattici','cda_verbali','documenti','eventi_soci','eventi_soci_iscrizioni','listino_corsi','notifiche'))) THEN RAISE EXCEPTION 'Tabella non ammessa' USING ERRCODE='42501'; END IF;
 target:=to_regclass(format('%I.%I',p_schema,p_tabella));
 FOR fk IN SELECT ns.nspname AS child_schema,cl.relname AS child_table,c.conname,string_agg(format('x.%I=y.%I',ca.attname,pa.attname),' AND ' ORDER BY k.ord) AS pred
 FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class cl ON cl.oid=c.conrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=cl.relnamespace
 CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY AS k(child_key,parent_key,ord)
 JOIN pg_catalog.pg_attribute ca ON ca.attrelid=c.conrelid AND ca.attnum=k.child_key JOIN pg_catalog.pg_attribute pa ON pa.attrelid=c.confrelid AND pa.attnum=k.parent_key
 WHERE c.contype='f' AND c.confrelid=target AND ns.nspname='public' GROUP BY ns.nspname,cl.relname,c.conname,c.oid LOOP
  EXECUTE format('SELECT count(*) FROM %I.%I x JOIN %I.%I y ON %s WHERE y.id=$1',fk.child_schema,fk.child_table,p_schema,p_tabella,fk.pred) INTO n USING p_id;
  IF n>0 THEN tabella:=fk.child_table;vincolo:=fk.conname;numero:=n;RETURN NEXT; END IF;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.admin_elenco_account(text,integer,integer,uuid),public.admin_fk_dipendenze(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_elenco_account(text,integer,integer,uuid),public.admin_fk_dipendenze(text,text,uuid) TO authenticated;
-- Protegge anche la cancellazione effettuata dal pannello Auth, non solo il pulsante del sito.
-- Il ruolo di amministratore deve essere revocato da un altro amministratore attivo prima del blocco/rimozione.
CREATE OR REPLACE FUNCTION public.proteggi_account_amministrativi() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE fk record; linked boolean;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NOT coalesce((NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) OR (NEW.banned_until>now() AND (OLD.banned_until IS NULL OR OLD.banned_until<=now())),false) THEN RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(7300413);
 IF EXISTS(SELECT 1 FROM public.ruoli_utente WHERE utente_id=OLD.id AND ruolo='amministratore') THEN RAISE EXCEPTION 'Revocare prima il ruolo amministratore' USING ERRCODE='P3414'; END IF;
 IF EXISTS(SELECT 1 FROM public.cda_votanti a JOIN public.cda_verbali v ON v.id=a.verbale_id WHERE a.utente_id=OLD.id AND v.stato='in_approvazione') THEN RAISE EXCEPTION 'Votazione CdA in corso' USING ERRCODE='P3414'; END IF;
 IF TG_OP='UPDATE' THEN RETURN NEW; END IF;
 -- Non cancellare pratiche, documenti, voti o altri dati storici implicitamente.
 FOR fk IN SELECT ns.nspname AS child_schema,cl.relname AS child_table,string_agg(format('x.%I=y.%I',ca.attname,pa.attname),' AND ' ORDER BY k.ord) AS pred
 FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_class cl ON cl.oid=c.conrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=cl.relnamespace
 CROSS JOIN LATERAL unnest(c.conkey,c.confkey) WITH ORDINALITY AS k(child_key,parent_key,ord)
 JOIN pg_catalog.pg_attribute ca ON ca.attrelid=c.conrelid AND ca.attnum=k.child_key JOIN pg_catalog.pg_attribute pa ON pa.attrelid=c.confrelid AND pa.attnum=k.parent_key
 WHERE c.contype='f' AND c.confrelid='auth.users'::regclass AND ns.nspname='public' AND cl.relname NOT IN ('ruoli_utente','collegamenti_persone') GROUP BY ns.nspname,cl.relname,c.oid LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I x JOIN auth.users y ON %s WHERE y.id=$1)',fk.child_schema,fk.child_table,fk.pred) INTO linked USING OLD.id;
  IF linked THEN RAISE EXCEPTION 'Account con dati storici collegati: usare rimozione conservativa' USING ERRCODE='P3414'; END IF;
 END LOOP;
 RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION public.proteggi_account_amministrativi() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS proteggi_account_amministrativi_0015 ON auth.users;
CREATE TRIGGER proteggi_account_amministrativi_0015 BEFORE DELETE OR UPDATE OF banned_until,deleted_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.proteggi_account_amministrativi();
CREATE OR REPLACE FUNCTION public.proteggi_ruolo_admin_0015() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(7300413);
 IF TG_OP<>'INSERT' THEN
  IF OLD.ruolo='amministratore' AND (TG_OP='DELETE' OR NEW.ruolo IS DISTINCT FROM OLD.ruolo OR NEW.utente_id IS DISTINCT FROM OLD.utente_id) THEN
   IF OLD.utente_id=auth.uid() OR NOT EXISTS(SELECT 1 FROM public.ruoli_utente r JOIN auth.users u ON u.id=r.utente_id WHERE r.ruolo='amministratore' AND r.utente_id<>OLD.utente_id AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())) THEN RAISE EXCEPTION 'Amministratore protetto' USING ERRCODE='P3414'; END IF;
  END IF;
 END IF;
 IF TG_OP<>'DELETE' THEN
  IF NEW.ruolo='amministratore' AND NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=NEW.utente_id AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now()) AND u.email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Account amministratore non abilitato' USING ERRCODE='P3414'; END IF;
  RETURN NEW;
 END IF;
 RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION public.proteggi_ruolo_admin_0015() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS proteggi_ruolo_admin_0015 ON public.ruoli_utente;
CREATE TRIGGER proteggi_ruolo_admin_0015 BEFORE INSERT OR UPDATE OR DELETE ON public.ruoli_utente FOR EACH ROW EXECUTE FUNCTION public.proteggi_ruolo_admin_0015();
CREATE OR REPLACE FUNCTION public.assegna_ruolo_email(p_email text,p_ruolo public.ruolo_app) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_target uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo amministratore' USING ERRCODE='42501'; END IF;
 SELECT id INTO v_target FROM auth.users WHERE lower(email)=lower(btrim(p_email)) AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL;
 IF v_target IS NULL THEN RAISE EXCEPTION 'Account non trovato o non verificato'; END IF;
 INSERT INTO public.ruoli_utente(utente_id,ruolo) VALUES(v_target,p_ruolo) ON CONFLICT DO NOTHING;
END; $$;
CREATE OR REPLACE FUNCTION public.collega_account_a_persona(p_email text,p_persona uuid,p_relazione text DEFAULT 'titolare') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_account uuid;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo amministratore' USING ERRCODE='42501'; END IF;
 IF p_relazione NOT IN ('titolare','tutore') THEN RAISE EXCEPTION 'Relazione non valida'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.persone WHERE id=p_persona) THEN RAISE EXCEPTION 'Persona non trovata'; END IF;
 SELECT id INTO v_account FROM auth.users WHERE lower(email)=lower(btrim(p_email)) AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL;
 IF v_account IS NULL THEN RAISE EXCEPTION 'Account inesistente o non verificato'; END IF;
 INSERT INTO public.collegamenti_persone(utente_id,persona_id,relazione) VALUES(v_account,p_persona,p_relazione) ON CONFLICT(utente_id,persona_id) DO UPDATE SET relazione=excluded.relazione;
END; $$;
-- Registro degli interventi sugli account (niente password o token).
CREATE OR REPLACE FUNCTION public.admin_registra_intervento_account(p_id uuid,p_operazione text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() OR p_id IS NULL OR p_operazione NOT IN ('CREATE','UPDATE','DISABLE','ENABLE','SOFT_DELETE','DELETE','RESET_PASSWORD') THEN RAISE EXCEPTION 'Operazione non consentita' USING ERRCODE='42501'; END IF;
 INSERT INTO public.registro_operazioni(utente_id,tabella,operazione,record_id) VALUES(auth.uid(),'auth.users',p_operazione,p_id);
END; $$;
REVOKE ALL ON FUNCTION public.admin_registra_intervento_account(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_registra_intervento_account(uuid,text) TO authenticated;
-- Record aggiuntivi amministrabili; non attribuisce nuovi permessi a segreteria o istruttori.
CREATE POLICY listino_admin_insert_0015 ON public.listino_corsi FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY listino_admin_update_0015 ON public.listino_corsi FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY listino_admin_delete_0015 ON public.listino_corsi FOR DELETE TO authenticated USING(public.is_admin());
CREATE POLICY notifiche_admin_update_0015 ON public.notifiche FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY notifiche_admin_delete_0015 ON public.notifiche FOR DELETE TO authenticated USING(public.is_admin());
CREATE POLICY collegamenti_admin_delete_0015 ON public.collegamenti_persone FOR DELETE TO authenticated USING(public.is_admin());
CREATE POLICY relazioni_admin_insert_0015 ON public.relazioni_tutori FOR INSERT TO authenticated WITH CHECK(public.is_admin());
CREATE POLICY relazioni_admin_update_0015 ON public.relazioni_tutori FOR UPDATE TO authenticated USING(public.is_admin()) WITH CHECK(public.is_admin());
CREATE POLICY relazioni_admin_delete_0015 ON public.relazioni_tutori FOR DELETE TO authenticated USING(public.is_admin());
-- Le proiezioni non concedono accesso alle tabelle auth; filtro admin aggiuntivo.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.listino_corsi,public.relazioni_tutori TO authenticated;
GRANT SELECT,UPDATE,DELETE ON public.notifiche TO authenticated;
GRANT DELETE ON public.collegamenti_persone TO authenticated;
CREATE VIEW public.gest_elenco_relazioni_tutori WITH (security_invoker=true) AS
 SELECT r.*,m.cognome AS sort_cognome,m.nome AS sort_nome,t.cognome AS tutore_cognome,t.nome AS tutore_nome FROM public.relazioni_tutori r JOIN public.persone m ON m.id=r.minore_id JOIN public.persone t ON t.id=r.tutore_id WHERE public.is_admin();
CREATE VIEW public.gest_elenco_notifiche_admin WITH (security_invoker=true) AS
 SELECT n.*,coalesce(p.cognome,r.cognome) AS sort_cognome,coalesce(p.nome,r.nome) AS sort_nome,p.email FROM public.notifiche n
 LEFT JOIN LATERAL(SELECT x.cognome,x.nome,x.email FROM public.collegamenti_persone c JOIN public.persone x ON x.id=c.persona_id WHERE c.utente_id=n.utente_id ORDER BY (c.relazione='titolare') DESC,x.cognome,x.nome,x.id LIMIT 1) p ON true
 LEFT JOIN public.richieste r ON r.utente_id=n.utente_id WHERE public.is_admin();
REVOKE ALL ON public.gest_elenco_relazioni_tutori,public.gest_elenco_notifiche_admin FROM PUBLIC,anon;
GRANT SELECT ON public.gest_elenco_relazioni_tutori,public.gest_elenco_notifiche_admin TO authenticated;
-- Rimozione di eventi e singole iscrizioni: stesso lock delle RPC di prenotazione, nessuna cascata.
CREATE OR REPLACE FUNCTION public.admin_rimuovi_evento(p_evento uuid,p_iscrizione uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo amministratori' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.eventi_soci WHERE id=p_evento FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Evento non trovato' USING ERRCODE='P3414'; END IF;
 IF p_iscrizione IS NULL THEN
  IF EXISTS(SELECT 1 FROM public.eventi_soci_iscrizioni WHERE evento_id=p_evento) THEN RAISE EXCEPTION 'Iscrizioni collegate' USING ERRCODE='P3414'; END IF;
  DELETE FROM public.eventi_soci WHERE id=p_evento;
  INSERT INTO public.registro_operazioni(utente_id,tabella,operazione,record_id) VALUES(auth.uid(),'eventi_soci','DELETE',p_evento);
 ELSE
  DELETE FROM public.eventi_soci_iscrizioni WHERE evento_id=p_evento AND id=p_iscrizione;
  IF NOT FOUND THEN RAISE EXCEPTION 'Iscrizione non trovata' USING ERRCODE='P3414'; END IF;
  UPDATE public.eventi_soci SET revisione_prenotazioni=revisione_prenotazioni+1 WHERE id=p_evento;
  INSERT INTO public.registro_operazioni(utente_id,tabella,operazione,record_id) VALUES(auth.uid(),'eventi_soci_iscrizioni','DELETE',p_iscrizione);
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.admin_rimuovi_evento(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_rimuovi_evento(uuid,uuid) TO authenticated;
-- Rettifica di un incasso registrato per errore (non un rimborso reale): conserva copia immutabile,
-- rimuove movimento collegato e incasso nella stessa transazione; le viste ricalcolano i saldi.
CREATE TABLE public.rettifiche_incassi (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pagamento_id uuid NOT NULL UNIQUE,
 pagamento_originale jsonb NOT NULL, movimento_originale jsonb NOT NULL,
 motivo text NOT NULL CHECK(length(btrim(motivo)) BETWEEN 5 AND 1000),
 amministratore_id uuid NOT NULL, rettificato_il timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rettifiche_incassi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rettifiche_incassi FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.rettifiche_incassi TO authenticated;
CREATE POLICY rettifiche_incassi_admin_read ON public.rettifiche_incassi FOR SELECT TO authenticated USING(public.is_admin());
CREATE OR REPLACE FUNCTION public.admin_rettifica_incasso(p_id uuid,p_motivo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.pagamenti%ROWTYPE; m public.movimenti_economici%ROWTYPE;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo amministratori' USING ERRCODE='42501'; END IF;
 IF p_motivo IS NULL OR length(btrim(p_motivo)) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'Motivazione obbligatoria' USING ERRCODE='P3414'; END IF;
 SELECT * INTO p FROM public.pagamenti WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento non trovato' USING ERRCODE='P3414'; END IF;
 IF p.quota_id IS NOT NULL THEN PERFORM 1 FROM public.quote_associative WHERE id=p.quota_id FOR UPDATE;
 ELSE PERFORM 1 FROM public.addebiti_corsi WHERE id=p.addebito_corso_id FOR UPDATE; END IF;
 SELECT * INTO p FROM public.pagamenti WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pagamento non trovato' USING ERRCODE='P3414'; END IF;
 SELECT * INTO m FROM public.movimenti_economici WHERE pagamento_id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Movimento contabile mancante: intervento manuale necessario' USING ERRCODE='P3414'; END IF;
 INSERT INTO public.rettifiche_incassi(pagamento_id,pagamento_originale,movimento_originale,motivo,amministratore_id) VALUES(p_id,to_jsonb(p),to_jsonb(m),btrim(p_motivo),auth.uid());
 DELETE FROM public.movimenti_economici WHERE id=m.id;
 DELETE FROM public.pagamenti WHERE id=p_id;
 INSERT INTO public.registro_operazioni(utente_id,tabella,operazione,record_id) VALUES(auth.uid(),'pagamenti','RETTIFICA',p_id);
END; $$;
REVOKE ALL ON FUNCTION public.admin_rettifica_incasso(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_rettifica_incasso(uuid,text) TO authenticated;
-- Impedisce di reinserire per errore una richiesta idempotente relativa a un incasso rettificato.
CREATE OR REPLACE FUNCTION public.proteggi_incasso_rettificato() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.idempotency_key IS NOT NULL AND EXISTS(SELECT 1 FROM public.rettifiche_incassi r WHERE r.pagamento_originale->>'idempotency_key'=NEW.idempotency_key::text) THEN RAISE EXCEPTION 'Richiesta già rettificata' USING ERRCODE='P3402'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.proteggi_incasso_rettificato() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER proteggi_incasso_rettificato BEFORE INSERT ON public.pagamenti FOR EACH ROW EXECUTE FUNCTION public.proteggi_incasso_rettificato();
COMMIT;
