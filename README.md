# Sesto Continente — Gestionale Fase 2 (moduli estesi)

**Versione 0.2 — codice sorgente per Next.js 16, React 19, Supabase e Vercel.**

Questa versione parte dalla Fase 1 e conserva il flusso di registrazione e approvazione delle adesioni. La migrazione `0002_gestionale_completo.sql` **aggiunge** moduli e autorizzazioni a un database in cui `0001_fase1.sql` è già stata eseguita.

## Funzionalità presenti nel codice

- Iscrizione online, controllo email, bozza, invio, approvazione/rifiuto/integrazione, account e ruoli.
- Anagrafica unica, adesioni, tesseramenti e stagioni.
- Corsi ARA livelli 1–5, apnea, nuoto libero, edizioni stagionali, partecipanti, istruttori e qualifiche.
- Programmi didattici, versioni, lezioni, vista calendario, piscine, corsie, conflitti orari e presenze.
- Inventario attrezzature, revisioni, assegnazioni e scadenze.
- Brevetti, scadenze dei certificati, documenti privati con permessi e download protetto.
- Quote associative, addebiti corsi, pagamenti tracciati, movimenti economici, esportazioni CSV e report interni.
- Comunicazioni, notifiche in-app, promemoria programmabili (30/15/7 giorni e altri valori) ed email opzionali via Resend.
- Area socio e tutore, richiesta di iscrizione ai corsi, modifica dei propri recapiti e area istruttore.

Molte operazioni amministrative usano **moduli tabellari generici** anziché schermate dedicate. L'interfaccia è quindi ancora da rifinire in termini di usabilità e non costituisce un prodotto certificato per l'esercizio con dati reali.

## Avvio su un'installazione Fase 1 già pubblicata

Leggi **`GUIDA_AGGIORNAMENTO_VERCEL_SUPABASE.md`** prima di cambiare file o database.

1. Effettua un backup verificabile del database Supabase e salva una copia funzionante del repository.
2. Applica **solo** `supabase/migrations/0002_gestionale_completo.sql` su una copia di test che già include Fase 1.
3. Configura le variabili d'ambiente in Vercel indicate in `.env.example` (le chiavi segrete restano solo server).
4. Fai deploy del progetto tramite il tuo GitHub e verifica le funzioni con account e dati **di prova**.
5. Dopo il collaudo, pianifica il rilascio sull'ambiente principale.

Non eseguire nuovamente la migrazione `0001_fase1.sql` sul database esistente. Non inserire mai password o service role key nel repository.

## Test e limiti

`npm run test:static` esegue controlli strutturali. `npm run typecheck` e `npm run build` richiedono `npm install`. Il codice **non è stato compilato né testato end-to-end** in questa consegna perché il registro npm e l'istanza Supabase/Vercel non sono stati accessibili da questo ambiente. Non dichiarare completato il collaudo sulla base dei soli test statici.

Da validare prima di trattare dati reali: GDPR e conservazione, accessi a dati di salute, statuto e autorità competente per le ammissioni, MFA staff, sicurezza e test RLS, backup/ripristino, gestione degli errori e disservizi, verifiche contabili e accessibilità.

## Elementi intenzionalmente limitati

- Le dieci tracce didattiche sono **bozze**, non programmi ufficiali FIPSAS/CMAS.
- Non è implementata la contabilità fiscale ufficiale; i report sommano campioni con limiti indicati nelle pagine.
- Il caricamento allegati a singole revisioni, prove e attestati è realizzabile tramite l'archivio documenti, ma non ha ancora collegamenti dedicati a tutte le entità.
- Le email automatiche richiedono provider e impostazioni Vercel; senza di essi le notifiche restano interne all'app.
- Il trasferimento, la rettifica e la cancellazione di dati di produzione richiedono procedure definite dall'associazione.

## Struttura

- `app/`: pagine, azioni lato server e route cron.
- `components/`: moduli e navigazione.
- `lib/modules.ts`: whitelist campi e tabelle per la gestione CRUD.
- `supabase/migrations/0001_fase1.sql`: schema precedente, **non rieseguire**.
- `supabase/migrations/0002_gestionale_completo.sql`: estensione incrementale.
- `tests/`: controlli statici, non test d'integrazione.
