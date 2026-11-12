# Sesto Continente — Fase 3.2: gestione guidata corsi

## Cosa aggiunge

La patch estende la Fase 3.1 già funzionante; **non cancella né ricrea tabelle**.

- `/gestionale/corsi`: ricerca edizioni, filtri per stagione/stato, contatori e paginazione.
- `/gestionale/corsi/nuovo`: selezione attività e creazione edizione; possibilità di aggiungere un'attività al catalogo.
- `/gestionale/corsi/[id]`: dossier del corso con istruttori, iscrizioni, calendario, programmi, registro presenze.
- Corso programmato → gestione degli stati e della capienza.
- Conferma di un allievo permessa solo con **adesione attiva nella stessa stagione** (regola lato applicazione e DB).
- Scelta di istruttori con qualifica registrata (la segreteria deve verificarne l'idoneità alla specifica disciplina).
- Un solo responsabile, sostituibile senza cancellare accidentalmente l'incarico.
- Creazione di una lezione e prenotazione di più corsie in **una transazione SQL**: conflitti e corsie di piscina diversa annullano tutto.
- Orari in fuso `Europe/Rome`: orari inesistenti o duplicati al cambio dell'ora vengono rifiutati.
- Registro presenze con aggiornamento degli allievi confermati, senza visualizzare diagnosi o dettagli sanitari.

## Sequenza consigliata di installazione

1. **Backup e branch.** Conserva il commit GitHub attualmente funzionante. Esegui un backup di Supabase e verifica di poterlo ripristinare. Crea una branch per la Fase 3.2; non sovrascrivere il branch `main` direttamente.
2. **Ambiente di test.** Usa un progetto Supabase separato su cui sono già state applicate le migrazioni `0001_fase1.sql`, `0002_gestionale_completo.sql` e `0003_schede_soci.sql`.
3. **Migrazione.** Apri Supabase **SQL Editor** del progetto di test ed esegui, UNA SOLA VOLTA, `supabase/migrations/0004_corsi_guidati.sql`. Non riapplicare 0001–0003. La migrazione contiene nuove funzioni, policy, trigger e indici, ma nessuna cancellazione dati.
4. **Codice.** Estrai `SestoContinente_Fase3_2_PATCH_Corsi.zip`. Copia file e cartelle **nella radice del repository**, rispettando i percorsi. I file nuovi vanno aggiunti, quelli esistenti aggiornati. In particolare verifica le differenze su `app/globals.css`, `components/StaffNav.tsx`, `app/gestionale/page.tsx` e `package.json` se erano stati modificati dopo la Fase 3.1.
5. **Verifiche locali** (o nel CI GitHub):
   ```bash
   npm install
   npm run test:static
   npm run typecheck
   npm run build
   ```
6. **Vercel Preview.** Pubblica la branch con un deploy di anteprima, configurato su **Supabase di test**, non sul database di produzione. Esegui tutti i collaudi sotto.
7. **Produzione.** Soltanto dopo i test, applica `0004` al Supabase effettivo e integra la branch in `main`, seguendo la procedura Vercel usuale.

## Test pratici obbligatori con dati fittizi

- Crea una stagione se non esiste; crea un'attività ARA livello 1 e poi la sua edizione con date all'interno della stagione.
- Crea un record di qualifica per un istruttore fittizio, assegna un responsabile, aggiungi/rimuovi un aiuto; prova a sostituire il responsabile.
- Inserisci due soci fittizi: uno con adesione attiva e uno senza. Verifica che il secondo possa essere solo `in_attesa`, mentre per il primo sia possibile `iscritto`.
- Imposta capienza 1: prova ad aggiungere due allievi confermati. Il secondo deve fallire **senza** produrre iscrizioni extra.
- Crea una piscina e due corsie, poi una lezione con corsia 1; prova una seconda lezione sullo stesso intervallo e corsia. Deve fallire senza lasciare una lezione orfana.
- Verifica che prenotazioni di corsie di un'altra piscina vengano rifiutate.
- Registra presente/assente per una lezione. Controlla il dato nella tabella `presenze` e nella sezione istruttore.
- Accedi come socio fittizio: non deve essere possibile aprire dossier o anagrafiche di altre persone.
- Dopo la migrazione, controlla che le domande di adesione della Fase 3.1 rimangano disponibili.

## Limitazioni della fase

- Il menu elenca fino a 500 persone/qualifiche e 200 lezioni per corso: per archivi molto grandi servono ricerche asincrone per persona e paginazione dettagliata.
- Le qualifiche degli istruttori vengono rilevate come registrate, ma **non** sono valutate automaticamente rispetto ai requisiti federali della disciplina.
- Le date del corso si possono modificare dal modulo avanzato; l'interfaccia guidata modifica nome, stato, capienza e note.
- Per modificare una lezione o le sue prenotazioni si usa il modulo avanzato già presente.
- Non sono state configurate email transazionali né eseguiti test con il database del proprietario.
- Il pacchetto non aggiunge uno scheduler e non cambia le configurazioni Vercel / Supabase già esistenti.
- **Non è stato possibile completare `npm install` in questo ambiente** (`EAI_AGAIN` da registry.npmjs.org). I controlli statici e la sintassi TypeScript sono stati eseguiti, ma il typecheck completo e la build devono essere confermati in CI/Vercel.

## Ripristino

Se il deploy di anteprima non funziona, mantieni `main` invariato. Non eliminare le migrazioni già applicate al database. Per la produzione, prima di ogni modifica predisponi un rollback per il codice e un piano di ripristino del database. La migrazione 0004 è additiva, ma non va eseguita due volte.
