# Sesto Continente — aggiornamento Home, anagrafica e archivio CdA (0011)

## 1. Supabase (prima del deploy dell'applicazione)

Verificare di avere un backup ripristinabile del database `main`. Le migrazioni 0001–0010 non devono essere rieseguite. Nel SQL Editor di `main`, verificare lo storico:

```sql
SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version;
```

Se le dieci migrazioni sono presenti e 0011 è assente, eseguire integralmente, in una sola query, il nuovo file `supabase/migrations/20261117190000_archivio_cda_anagrafica.sql`. Se compare un errore, fermarsi. Nessun reset.

Dopo Success, eseguire questa query di sola lettura:

```sql
SELECT to_regclass('public.cda_versioni_bozze') IS NOT NULL AS archivio_versioni,
       to_regprocedure('public.modifica_bozza_cda(uuid,text,date,text,text,text)') IS NOT NULL AS modifica_bozza,
       to_regprocedure('public.salva_domanda_v13(text,text,date,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,boolean,text,text,text,text)') IS NOT NULL AS nuova_domanda,
       (SELECT count(*)=4 FROM information_schema.columns WHERE table_schema='public' AND table_name='richieste' AND column_name IN ('provincia_nascita','stato_nascita','sesso_cf','codice_catastale_nascita')) AS campi_nascita,
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.richieste'::regclass AND tgname='trasferisci_nascita_domanda_v13' AND NOT tgisinternal) AS trigger_nascita,
       EXISTS (SELECT 1 FROM storage.buckets WHERE id='sesto-cda' AND public=false) AS bucket_privato;
```

Se tutti i risultati sono true e lo script è stato eseguito senza errori, registrare la migrazione già applicata (non eseguire di nuovo lo script):

```sql
INSERT INTO supabase_migrations.schema_migrations(version,name)
VALUES ('20261117190000','archivio_cda_anagrafica')
ON CONFLICT(version) DO NOTHING;
SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version;
```

Lo storico deve avere 11 versioni. La registrazione manuale non sostituisce il collaudo delle funzioni e delle RLS.

## 2. GitHub Desktop e Vercel

Partire dalla versione `main` aggiornata (Fetch/Pull origin). Creare un branch `fix/home-cf-archivio-cda`. Estrarre lo ZIP PATCH e copiare i file nella radice locale del repository, mantenendo le cartelle relative e sostituendo i file corrispondenti. Non cancellare gli altri file; non inserire lo ZIP nel repository. Commit, Push origin/Publish branch, creare una pull request. Verificare il deploy Vercel e controllare i log. Non fare merge se la build fallisce. Non richiede Node o PowerShell sul PC dell'utente.

Vercel installerà le nuove dipendenze fissate in package.json; il comando prebuild controlla anche l'effettivo archivio Belfiore e due comuni campione. La Preview Vercel potrebbe usare `main` se così configurata: in tale caso non effettuare modifiche di prova sui dati reali. Per test di scrittura usare un ambiente separato o dati fittizi espressamente autorizzati.

## 3. Collaudo

- Verificare Home da ogni pagina, con i diversi ruoli; ritorno al pannello del proprio ruolo.
- Anagrafica: Comune e provincia di nascita o Stato estero; utilizzare un CF ufficiale noto, verificare la segnalazione di CF non coerente, l'assenza del pulsante di generazione, il codice Belfiore derivato e un solo Annulla. Controllare salvataggio dei recapiti di una persona storica con dati incompleti. Testare la nuova domanda di adesione e l'approvazione soltanto con pratiche fittizie autorizzate.
- CdA: aprire Archivio documenti, cercare, filtrare, vedere/scaricare Word e PDF disponibili. Su una bozza autorizzata: modificare i metadati, sostituire il Word, controllare lo storico delle revisioni. Verificare che una votazione già aperta o un verbale definitivo non possano essere modificati. Controllare l'accesso al PDF con un consigliere e il rifiuto con un socio non autorizzato.
- Le bozze sono distinguibili dal definitivo. Per i Word storici privi di anteprima, si genera l'anteprima al momento della richiesta. I PDF sono ricavati dal testo Word e non replicano necessariamente impaginazione, tabelle e immagini originali.
- Non generiamo un CF ufficiale: il controllo è di coerenza, inclusa omocodia, non di attribuzione presso l'Anagrafe tributaria. Comuni storici/omonimi non risolvibili vengono segnalati; nessun codice inventato. I dati anagrafici non sono inviati a servizi di calcolo esterni.

## 4. Verifiche effettuate

54/54 test statici/unitari (inclusi lookup con libreria simulata), 80 sorgenti e 134 import locali verificati. Non sono stati eseguiti la build Next.js completa, il lookup con il pacchetto Belfiore effettivamente installato o test sul database di produzione: il registro NPM non era raggiungibile nell'ambiente di lavoro e non c'era accesso al database. Il prebuild Vercel include un test reale Belfiore; se fallisce, fermarsi e verificare i log. I file SQL 0001–0010 sono invariati. La migrazione 0011 non è stata eseguita sul database.
