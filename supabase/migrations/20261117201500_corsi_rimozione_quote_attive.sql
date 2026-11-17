-- Incrementale, nessun dato viene cancellato da questa migrazione.
BEGIN;
-- I vincoli FK esistenti senza ON DELETE CASCADE proteggono lo storico.
GRANT DELETE ON public.corsi, public.edizioni_corsi TO authenticated;
DROP POLICY IF EXISTS corsi_delete_staff ON public.corsi;
CREATE POLICY corsi_delete_staff ON public.corsi FOR DELETE TO authenticated
 USING ((SELECT public.is_staff()));
DROP POLICY IF EXISTS edizioni_delete_staff ON public.edizioni_corsi;
CREATE POLICY edizioni_delete_staff ON public.edizioni_corsi FOR DELETE TO authenticated
 USING ((SELECT public.is_staff()));
-- Impedisce nuovi addebiti per iscrizioni non confermate o corsi/stagioni inattivi.
-- Consente di correggere un importo storico senza cambiare l'iscrizione collegata.
CREATE OR REPLACE FUNCTION public.verifica_iscrizione_quota_attiva()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NEW.iscrizione_id IS DISTINCT FROM OLD.iscrizione_id THEN
   RAISE EXCEPTION 'Impossibile riassegnare una quota esistente' USING ERRCODE='P3412';
  END IF;
  RETURN NEW;
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.iscrizioni_corsi i
   JOIN public.edizioni_corsi e ON e.id=i.edizione_id
   JOIN public.stagioni s ON s.id=e.stagione_id
   WHERE i.id=NEW.iscrizione_id AND i.stato='iscritto' AND e.stato='attivo' AND s.attiva IS TRUE
 ) THEN
  RAISE EXCEPTION 'Iscrizione non confermata a corso e stagione attivi' USING ERRCODE='P3412';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS verifica_iscrizione_quota_attiva ON public.addebiti_corsi;
CREATE TRIGGER verifica_iscrizione_quota_attiva BEFORE INSERT OR UPDATE OF iscrizione_id
 ON public.addebiti_corsi FOR EACH ROW EXECUTE FUNCTION public.verifica_iscrizione_quota_attiva();
COMMIT;
