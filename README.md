# Sesto Continente — Gestionale (prima implementazione)

**Versione 0.2 · 11 novembre 2026**

Applicazione web indipendente dal sito pubblico, con interfaccia in italiano. Realizzata con Next.js, Supabase Auth e PostgreSQL. Lo scopo di questa consegna è rendere **avviabile** il primo flusso: registrazione → domanda → approvazione → anagrafica → area personale.

> **IMPORTANTE:** il software non è pubblicato, non è stato verificato contro un progetto Supabase reale e non è pronto per trattare dati personali reali. Usa soltanto persone, email e recapiti di test. Prima della produzione servono informative e documenti associativi corretti, verifica della competenza statutaria per l'ammissione, misure GDPR, backup, controlli di sicurezza e prove complete.

## A. Cosa funziona nel codice

1. Registrazione con password e conferma email via Supabase Auth.
2. Login, logout e recupero password.
3. Modulo domanda per maggiorenni/minorenni, con genitore/tutore.
4. Salvataggio bozza, invio e reinvio dopo richiesta di integrazione.
5. Dashboard e coda di richieste della segreteria.
6. Presa in carico, approvazione, richiesta di integrazione, rifiuto.
7. Creazione atomica di persona, collegamento dell'account, adesione **da perfezionare** e registro delle operazioni.
8. Area personale per gli account approvati, elenco iniziale soci.
9. Row Level Security (RLS), controlli server, funzioni SQL con privilegi ristretti.

**Non ancora implementati:** creazione/modifica corsi, istruttori, quote, pagamenti, certificati, documenti, email applicative, notifiche, attrezzature, contabilità, esportazioni e procedura completa per correggere anagrafiche o unire duplicati. La verifica email di Auth usa l'email del servizio; non sono ancora previste notifiche applicative alla segreteria.

## B. Cosa serve per avviarlo

- Un computer con **Node.js 20.9+** e npm.
- Un nuovo progetto **Supabase**: `https://supabase.com` (scegliere una regione UE appropriata, verificando requisiti e DPA).
- Le chiavi pubblicabili Supabase. **Non inserire mai la `service_role` nel frontend o in `NEXT_PUBLIC_*`.**
- Nessun accesso necessario a sestocontinente.it.

## C. Configurazione guidata

**1.** Crea un progetto Supabase *di prova*, senza dati personali reali.

**2.** In Supabase → **SQL Editor**, apri `supabase/migrations/0001_fase1.sql`, incolla il contenuto e fai `Run`. Lo script crea tabelle, vincoli, regole di accesso e funzioni. Va eseguito su un progetto nuovo, una volta sola. Alla fine crea una stagione dimostrativa `2026/2027 (TEST)`.

**3.** In **Authentication → Providers → Email** abilita le iscrizioni con verifica email obbligatoria. Non disattivare la conferma email in un progetto destinato a utenti reali.

**4.** In **Authentication → URL Configuration** imposta:

- `Site URL`: `http://localhost:3000`
- Tra i `Redirect URLs` aggiungi `http://localhost:3000/auth/callback` (e, se necessario nella configurazione Supabase adottata, `http://localhost:3000/auth/callback**`).

Quando andrai online dovrai aggiungere l'URL del nuovo dominio, impostare `NEXT_PUBLIC_SITE_URL` con il nuovo indirizzo e usare HTTPS.

**5.** Copia `.env.example` in `.env.local`. Compila i tre campi usando Supabase → Project Settings → API:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://ID-PROGETTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHIAVE_PUBBLICABILE_DEL_PROGETTO
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**6.** Apri un terminale nella cartella del progetto ed esegui:

```bash
npm install
npm run dev
```

Apri `http://localhost:3000` nel browser.

## D. Come creare il primo amministratore (solo test)

1. Apri `/registrati` e registra un account email di prova. Conferma il messaggio ricevuto.
2. In Supabase → SQL Editor esegui, sostituendo l'email (serve accesso amministrativo al progetto):

```sql
insert into public.ruoli_utente (utente_id, ruolo)
select id, 'amministratore'::public.ruolo_app
from auth.users
where email = 'EMAIL_TEST_AMMINISTRATORE'
  and email_confirmed_at is not null
on conflict do nothing;
```

3. Esci ed entra di nuovo. Dopo il login accederai alla pagina `/gestionale`.
4. **Non** mettere questa query in codice pubblico e non attribuire ruoli tramite il modulo di registrazione.

## E. Prova completa con due account distinti

Usa **email di test** ed **esclusivamente dati fittizi**.

- **Richiedente:** registrati con una seconda email, verifica la casella e accedi; compila la domanda, salva la bozza e invia.
- **Segreteria:** accedi con l'account amministratore; vai su **Domande di adesione**, apri la richiesta e clicca **Prendi in carico**.
- **Per approvare:** controlla tutti i dati, spunta la conferma delle verifiche e scegli **Approva**. Il database crea la persona e l'adesione `da_perfezionare`. Se CF/nome/data nascita sono duplicati, l'approvazione viene bloccata.
- **Per integrazione:** scegli **Chiedi integrazione** e scrivi almeno 10 caratteri. Il richiedente potrà modificare e reinviare.
- **Per rifiutare:** inserisci una motivazione interna di almeno 10 caratteri e scegli **Respingi**; la nota interna non viene mostrata al richiedente.
- **Richiedente approvato:** esci dall'amministratore, rientra come richiedente e verifica `/area-personale`.
- **Verifica isolamento:** un terzo account non deve vedere né le richieste né l'anagrafica dei primi due.

**Attenzione:** nell'interfaccia corrente l'errore di duplicazione viene comunicato con un messaggio generico, per non rivelare l'esistenza dei dati di altre persone. La segreteria deve risolvere manualmente il conflitto prima di ripetere l'approvazione. Non è ancora previsto il merge automatico dei soci.

## F. Sicurezza e limitazioni da risolvere prima della produzione

- Sostituire il testo dimostrativo sulla presa visione con informativa privacy, statuto e modulistica verificati; registrare le versioni effettivamente fornite.
- Definire chi verifica e chi delibera l'ammissione secondo lo statuto. L'app attuale considera la decisione della segreteria un'approvazione operativa e crea un'adesione `da_perfezionare`, **non un tesseramento perfezionato**.
- Validare completamente il codice fiscale (oggi solo controllo base del formato), inclusi i casi di persone senza CF italiano.
- Gestire tutori già presenti, più figli dello stesso account, revoca della rappresentanza e prove della titolarità; al momento è prevista **una domanda per account**.
- Introdurre una procedura documentata per rettifiche, deduplicazione, conservazione/cancellazione, export, informativa e diritti degli interessati.
- Impostare MFA per staff, policy di password, controllo anti-abuso, rate limit, verifica indirizzi email, logging e backup con restore testato.
- Verificare rischi, configurazione, accessibilità, privacy e sicurezza applicativa con test end-to-end prima del rilascio.
- Nessuna `service_role` è necessaria all'app: le funzioni di modifica usano `auth.uid()` e controlli server/SQL.

## G. Come testare il codice consegnato

`npm run test:static` esegue controlli **strutturali** offline; non testa Supabase.

`npm run typecheck` verifica i tipi, **dopo** l'installazione dei pacchetti.

`npm run build` compila l'app, **dopo** l'installazione dei pacchetti.

L'ambiente usato per preparare questa consegna non dispone dell'accesso al registro npm/Supabase; l'integrazione con un server reale va pertanto ancora verificata.

## H. Struttura cartelle

- `app/`: pagine, moduli e operazioni lato server.
- `components/`: interfacce riutilizzabili.
- `lib/`: connessione Supabase e controlli accesso.
- `proxy.ts`: rinnovo sessione Supabase per il server.
- `supabase/migrations/0001_fase1.sql`: database relazionale e RLS.
- `tests/`: controlli statici offline.

## I. Lavoro della fase successiva

1. Convalida su Supabase e test effettivi di login, email e flusso segreteria.
2. Migliorare il trattamento dei minorenni con account del tutore e più pratiche.
3. Completare le anagrafiche e il modulo di rettifica/deduplicazione.
4. Realizzare catalogo corsi ARA 1–5, apnea, nuoto libero; edizioni stagionali, istruttori e iscrizioni.
5. Aggiungere documentazione, quote, tesseramenti e calendario.
