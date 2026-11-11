# Sesto Continente — Aggiornamento del gestionale già pubblicato

**Destinazione:** applicazione Next.js collegata a GitHub e pubblicata su Vercel, database e autenticazione su Supabase.

**Attenzione:** questo è codice sorgente esteso. Non è stato possibile collegarsi alla tua istanza privata, eseguire SQL sul tuo database o verificare build/integrità con utenti reali. Prima di aggiornare l'app in produzione, esegui le prove qui indicate **in un ambiente di test**. Evita dati reali e certificati medici finché non avrai validato privacy, sicurezza e processi associativi.

## 1. Fai un backup prima di modificare alcunché

- Salva una copia del repository GitHub nello stato attualmente funzionante (un tag/commit identificabile).
- In Supabase salva un backup/esportazione del database e **verifica** che sia ripristinabile. Le modalità disponibili dipendono dal piano: non dare per scontato che il database sia coperto da backup automatici.
- Prendi nota delle variabili d'ambiente **senza copiarle nel repository**.
- Non eseguire direttamente lo script su dati in produzione senza una prova su ambiente secondario.

## 2. Database — aggiungi la Fase 2

1. Apri Supabase → il progetto di test che contiene già `0001_fase1.sql`.
2. Vai su **SQL Editor → New query**.
3. Incolla il contenuto di `supabase/migrations/0002_gestionale_completo.sql` e usa **Run**.
4. Se compare un errore, annota il messaggio e **non** ripetere l'intero script senza aver compreso dove si è fermato. Questo file è pensato per essere eseguito una volta, non è completamente idempotente.
5. Controlla in **Table Editor** la presenza delle nuove tabelle `corsi`, `edizioni_corsi`, `iscrizioni_corsi`, `lezioni`, `attrezzature`, `quote_associative`, `pagamenti`, `movimenti_economici`, `documenti`, `notifiche`, `tesseramenti`.
6. In **Storage** controlla la presenza del bucket privato `sesto-documenti`. Deve risultare **non pubblico**.

**Non rieseguire `0001_fase1.sql`**, già presente nella versione online. La migrazione 0002 non cancella volutamente richieste, persone, adesioni e account esistenti.

### Avvertenza per SQL Editor

Verifica che lo script venga applicato correttamente prima di usare l'app aggiornata. Alcune istruzioni creano trigger e policy; interrompere a metà l'esecuzione può produrre uno schema solo parzialmente aggiornato. Preferisci un'applicazione transazionale su una copia di test e una procedura di rollback/restore documentata.

## 3. Sostituisci il codice mantenendo il repository

Il pacchetto ZIP contiene una cartella `sestocontinente-gestionale` con il nuovo codice e la migrazione iniziale invariata.

Puoi procedere da GitHub Desktop oppure con Git, creando preferibilmente una **branch di test**. Esempio da terminale, *nella cartella locale del tuo repository già collegato a Vercel*:

```bash
git switch -c feature/gestionale-fase2
# Copia qui i file della cartella sestocontinente-gestionale dello ZIP
# mantenendo la struttura app/, lib/, components/, supabase/, ecc.
git add .
git commit -m "Implementa moduli gestionali fase 2"
git push -u origin feature/gestionale-fase2
```

Non copiare il file `.env.local` dal computer e non inserire password/chiavi segrete negli script. Una branch consente una Preview Deployment su Vercel prima di aggiornare la branch di produzione. Fai attenzione: se la Preview usa lo stesso database della produzione, anche i test possono modificare dati veri. Per test isolati usa un **progetto Supabase separato** con dati fittizi.

Se preferisci aggiornare GitHub solo dalla web app, il caricamento dei file e delle cartelle è possibile, ma verifica che mantenga struttura e nomi; il caricamento del solo file `.zip` non aggiorna automaticamente il sorgente dell'app.

## 4. Imposta le variabili Vercel

Vai su **Vercel → progetto → Settings → Environment Variables**. Conferma le tre variabili già usate dalla Fase 1:

| Variabile | Descrizione |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave pubblicabile/anon del progetto |
| `NEXT_PUBLIC_SITE_URL` | `https://sesto-continente-gest.vercel.app` (senza `/` finale) |

Per lo scheduler di notifiche puoi aggiungere **solo lato server**:

| Variabile | Quando serve |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Necessaria alla route cron per creare promemoria e leggere le email degli utenti |
| `CRON_SECRET` | Stringa lunga, casuale e privata, che Vercel invia come `Authorization: Bearer ...` alle chiamate cron |
| `RESEND_API_KEY` | Facoltativa, solo per inviare email tramite Resend |
| `EMAIL_FROM` | Facoltativa, email mittente verificata nel provider |

**Sicurezza:** non mettere mai `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` o `RESEND_API_KEY` tra le variabili `NEXT_PUBLIC_*` e non scriverle nel repository o in chat. Se non configuri il provider email, le notifiche rimangono interne, ma la generazione automatica richiede comunque il cron e le sue chiavi. Il file `vercel.json` definisce una frequenza quotidiana alle **08:00 UTC**, non alle 08:00 italiane: la conversione risente dell'ora legale.

Verifica anche i limiti e le funzionalità Cron del tuo piano Vercel.

## 5. Controlla le URL Supabase Auth

In Supabase → Authentication → URL Configuration:

- `Site URL`: `https://sesto-continente-gest.vercel.app`.
- Aggiungi tra gli indirizzi di redirect almeno `https://sesto-continente-gest.vercel.app/auth/callback`.
- Se utilizzi una Preview Deployment con URL differente, autorizzala separatamente **solo per i test pertinenti**.

Il login e il recupero password della Fase 1 non cambiano.

## 6. Test manuali obbligatori con account fittizi

| Test | Risultato atteso |
|---|---|
| Richiedente registra un account e invia domanda | Nessun accesso ai dati degli altri; domanda in elenco segreteria |
| Segreteria approva la domanda | Anagrafica collegata e adesione `da_perfezionare` |
| Segreteria crea corso ed edizione | Corso presente nel catalogo e nella stagione |
| Segreteria assegna istruttore e allievo | Istruttore vede solo i propri corsi e allievi |
| Prenoti due volte la stessa corsia/orario | Seconda prenotazione respinta dal DB |
| Diminuisci capienza sotto gli iscritti | Modifica respinta |
| Registra una revisione attrezzatura | Date aggiornate nella scheda attrezzatura |
| Consegna un'attrezzatura in manutenzione | Operazione respinta |
| Inserisci quota e due pagamenti parziali | Riepilogo quota e movimenti entrata coerenti |
| Socio scarica proprio documento | Accesso consentito solo a quel socio/staff autorizzato |
| Socio tenta di vedere documento altrui | Accesso negato |
| Configura promemoria come amministratore | Intervalli salvati correttamente |
| Registrazione presenze da istruttore | Consentita solo per la propria lezione |
| Esportazione CSV | File corretto, con valori non interpretati come formule |

Il test delle policy RLS richiede esplicitamente utenti diversi per verificare che un socio non possa leggere certificati medici altrui, note amministrative o movimenti contabili. Verifica il ripristino da backup e non solo l'esistenza del file di backup.

## 7. Dove trovare i moduli

- **Segreteria** → `/gestionale`: panoramica, menu laterale, domande, soci, quote, tesseramenti.
- **Corsi e didattica** → catalogo corsi, edizioni, iscrizioni, qualifiche e programmi.
- **Piscine e calendario** → `/gestionale/calendario-visivo`, lezioni e prenotazioni corsie.
- **Attrezzature** → inventario, manutenzioni e consegne.
- **Amministrazione** → contabilità interna, comunicazioni, stagioni, regole dei promemoria.
- **Documenti** → `/documenti`.
- **Area socio** → `/area-personale`.
- **Area istruttore** → `/istruttore`.

La maggior parte delle schermate di gestione usa un editor generico e tabelle paginabili, una base operativa ma non una UI definitiva completamente rifinita.

## 8. Limiti noti e prima del rilascio reale

- Non abbiamo verificato una compilazione `npm run build` o un'installazione su Supabase reale: sono necessari test nel tuo progetto.
- Report ed elenchi impongono limiti di query; per contabilità e archivi grandi servono aggregazioni SQL e paginazione server completa.
- I dieci programmi di partenza sono tracce, non didattica ufficiale dell'ente.
- I documenti possono essere collegati a corsi e programmi; alcuni allegati specializzati richiedono ancora una UI dedicata.
- Controllare e applicare informativa privacy, conservazione, procedura per diritti degli interessati, trattamento certificati medici, cifratura, backup, audit, MFA e garanzie contrattuali dei fornitori.
- Allineare le ammissioni dei soci alle competenze previste dallo statuto; approvazione della domanda, tesseramento e pagamento restano eventi separati.
- Le email applicative dipendono da un fornitore esterno e non sono una garanzia di consegna.

**Password account admin:** se una password è stata inserita in chat o condivisa fuori da un password manager, cambiala immediatamente in Supabase/nel gestionale e non riutilizzarla.
