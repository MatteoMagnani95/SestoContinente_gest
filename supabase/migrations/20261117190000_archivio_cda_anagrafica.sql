-- 0011: archivio CdA e dati di nascita; nessun reset, nessuna modifica dei documenti definitivi.
BEGIN;
CREATE TABLE IF NOT EXISTS public.cda_versioni_bozze(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 verbale_id uuid NOT NULL REFERENCES public.cda_verbali(id) ON DELETE RESTRICT,
 data_consiglio date NOT NULL,
 oggetto text NOT NULL,
 tipo text NOT NULL,
 percorso_docx text NOT NULL,
 archiviata_il timestamptz NOT NULL DEFAULT now(),
 archiviata_da uuid REFERENCES auth.users(id),
 UNIQUE(verbale_id,percorso_docx)
);
ALTER TABLE public.cda_versioni_bozze ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cda_versioni_bozze_read ON public.cda_versioni_bozze;
CREATE POLICY cda_versioni_bozze_read ON public.cda_versioni_bozze FOR SELECT TO authenticated
 USING(public.is_staff() OR public.is_board());
REVOKE ALL ON TABLE public.cda_versioni_bozze FROM public,anon,authenticated;
GRANT SELECT ON TABLE public.cda_versioni_bozze TO authenticated;
CREATE OR REPLACE FUNCTION public.modifica_bozza_cda(
 p_verbale uuid,p_docx_precedente text,p_data date,p_oggetto text,p_tipo text,p_docx text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.cda_verbali%ROWTYPE;
BEGIN
 IF NOT public.is_staff() THEN RAISE EXCEPTION 'Solo staff'; END IF;
 SELECT * INTO v FROM public.cda_verbali WHERE id=p_verbale FOR UPDATE;
 IF NOT FOUND OR v.stato<>'bozza' OR v.percorso_docx IS DISTINCT FROM p_docx_precedente THEN
  RAISE EXCEPTION 'Bozza non modificabile o modificata da un altro utente';
 END IF;
 IF p_data IS NULL OR p_oggetto IS NULL OR length(btrim(p_oggetto)) NOT BETWEEN 1 AND 500
 OR p_tipo IS NULL OR p_tipo NOT IN ('Approvazione Adesioni Soci','Gestione Ordinaria / Altro','Misto')
 OR p_docx IS NULL OR split_part(p_docx,'/',1)<>p_verbale::text
 OR split_part(p_docx,'/',2) !~ '^revisione-[0-9a-f-]{36}\.docx$' OR split_part(p_docx,'/',3)<>''
 OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='sesto-cda' AND name=p_docx)
 OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='sesto-cda' AND name=regexp_replace(p_docx,'\.docx$','.anteprima.pdf')) THEN
  RAISE EXCEPTION 'Dati o documenti non validi';
 END IF;
 INSERT INTO public.cda_versioni_bozze(verbale_id,data_consiglio,oggetto,tipo,percorso_docx,archiviata_da)
 VALUES(v.id,v.data_consiglio,v.oggetto,v.tipo,v.percorso_docx,auth.uid()) ON CONFLICT(verbale_id,percorso_docx) DO NOTHING;
 UPDATE public.cda_verbali SET data_consiglio=p_data,oggetto=btrim(p_oggetto),tipo=p_tipo,percorso_docx=p_docx WHERE id=p_verbale;
END $$;
REVOKE ALL ON FUNCTION public.modifica_bozza_cda(uuid,text,date,text,text,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.modifica_bozza_cda(uuid,text,date,text,text,text) TO authenticated;

-- Estende i dati anagrafici delle domande SENZA attribuire retroattivamente dati o consensi.
ALTER TABLE public.persone ALTER COLUMN stato_nascita TYPE varchar(100);
ALTER TABLE public.richieste
 ADD COLUMN IF NOT EXISTS provincia_nascita varchar(2),
 ADD COLUMN IF NOT EXISTS stato_nascita varchar(100),
 ADD COLUMN IF NOT EXISTS sesso_cf char(1),
 ADD COLUMN IF NOT EXISTS codice_catastale_nascita varchar(4);

-- Wrapper: conserva le verifiche v12 sui consensi, funzioni di adesione e transizioni.
CREATE OR REPLACE FUNCTION public.salva_domanda_v13(
 p_nome text,p_cognome text,p_data_nascita date,p_luogo_nascita text,
 p_codice_fiscale text,p_indirizzo text,p_cap text,p_comune text,p_telefono text,
 p_nome_tutore text,p_cognome_tutore text,p_parentela_tutore text,
 p_flag_statuto boolean,p_flag_privacy boolean,p_flag_immagini boolean,
 p_versione_statuto text,p_versione_privacy text,p_invia boolean,
 p_provincia_nascita text,p_stato_nascita text,p_sesso_cf text,p_codice_catastale_nascita text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR nullif(btrim(p_stato_nascita),'') IS NULL OR length(p_stato_nascita)>100
 OR (p_provincia_nascita IS NOT NULL AND p_provincia_nascita !~ '^[A-Z]{2}$')
 OR (p_sesso_cf IS NOT NULL AND p_sesso_cf NOT IN ('M','F'))
 OR (p_codice_catastale_nascita IS NOT NULL AND p_codice_catastale_nascita !~ '^[A-Z][0-9]{3}$')
 OR (nullif(btrim(p_codice_fiscale),'') IS NOT NULL AND (p_sesso_cf IS NULL OR p_codice_catastale_nascita IS NULL))
 THEN RAISE EXCEPTION 'Dati di nascita non validi'; END IF;
 v_id:=public.salva_domanda_v12(p_nome,p_cognome,p_data_nascita,p_luogo_nascita,
 p_codice_fiscale,p_indirizzo,p_cap,p_comune,p_telefono,p_nome_tutore,p_cognome_tutore,p_parentela_tutore,
 p_flag_statuto,p_flag_privacy,p_flag_immagini,p_versione_statuto,p_versione_privacy,p_invia);
 UPDATE public.richieste SET provincia_nascita=p_provincia_nascita,stato_nascita=btrim(p_stato_nascita),
 sesso_cf=p_sesso_cf,codice_catastale_nascita=p_codice_catastale_nascita
 WHERE id=v_id AND utente_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Domanda non disponibile'; END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.salva_domanda_v13(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.salva_domanda_v13(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text) TO authenticated;

-- Il nuovo socio eredita i dati forniti nella pratica soltanto alla prima approvazione.
-- Non modifica le pratiche storiche e non contrassegna l'omocodia come verificata.
CREATE OR REPLACE FUNCTION public.trasferisci_nascita_domanda_v13() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.stato IS DISTINCT FROM NEW.stato AND NEW.stato='approvata' AND NEW.persona_id IS NOT NULL
 AND NEW.stato_nascita IS NOT NULL THEN
  UPDATE public.persone SET provincia_nascita=NEW.provincia_nascita,stato_nascita=NEW.stato_nascita,
  sesso_cf=NEW.sesso_cf,codice_catastale_nascita=NEW.codice_catastale_nascita WHERE id=NEW.persona_id;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trasferisci_nascita_domanda_v13() FROM public,anon,authenticated;
DROP TRIGGER IF EXISTS trasferisci_nascita_domanda_v13 ON public.richieste;
CREATE TRIGGER trasferisci_nascita_domanda_v13 AFTER UPDATE OF stato ON public.richieste
 FOR EACH ROW EXECUTE FUNCTION public.trasferisci_nascita_domanda_v13();
COMMIT;
