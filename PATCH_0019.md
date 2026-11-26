# Patch 0019 · Sesto Continente

## Cosa cambia per i soci e la segreteria

- In registrazione, la presa visione dell’informativa è separata dalla scelta facoltativa sulle immagini. Inviare la domanda con “Non autorizzo” è consentito. Il socio può cambiare scelta dal profilo. La domanda mantiene la scelta, la versione e la data registrate al momento della sua compilazione. Le autorizzazioni storiche restano riferite ai testi dell’epoca.
- La domanda mantiene il codice fiscale e permette di inserire un contatto di emergenza. Il codice catastale è stato rimosso dal modulo di adesione. La segreteria può consultare il contatto nella scheda dell’allievo.
- Da “Iscrizioni ai corsi” si sceglie prima l’edizione. La scheda distingue direttore, istruttori, aiuto-istruttori e iscritti confermati. Il totale deriva dallo stesso elenco visualizzato. Le richieste in attesa sono gestite separatamente. La capienza resta un limite dell’edizione.
- Le nuove edizioni richiedono il direttore. Per le edizioni storiche la segreteria può completare le schede contrassegnate “Da assegnare”. La doppia iscrizione e il conflitto fra direttore e allievo sono bloccati nel database. Ogni nuovo brevetto conserva l’identità e il nominativo del direttore al rilascio.
- Il catalogo distingue tipo, livello e nome normalizzato. L’edizione distingue corso di catalogo, stagione, date di inizio e fine e nome normalizzato. Gli indici univoci coprono anche richieste simultanee. Le copie storiche sono segnalate e conservano i propri collegamenti.
- I moduli di modifica raggruppano i campi, identificano la scheda, gestiscono l’annullamento e il doppio invio. Gli errori di campo mantengono i valori digitati.
- I certificati hanno stati, filtri, conteggi e scadenze. I file JPG/JPEG o PDF sono serviti da una route autenticata. Ogni nuovo caricamento richiede verifica. La cronologia riporta azione, autore disponibile e data. Per le modifiche al corso riporta anche i campi cambiati.
- Il Consiglio visualizza cariche, documenti da approvare e archivio. L’apertura registra la lettura della versione. Occorre un voto esplicito di ciascun consigliere designato. La sostituzione conserva documento e voti precedenti e apre una nuova votazione.

## Migrazione e rilascio

1. In un ambiente di prova con le migrazioni precedenti, applicare una volta `supabase/migrations/20261125223000_patch_0019.sql`. La migrazione è transazionale. Coordinare l’aggiornamento dell’applicazione con quello delle funzioni SQL per l’adesione e il voto.
2. Verificare che `NEXT_PUBLIC_PRIVACY_URL` e `PRIVACY_VERSION` identifichino l’informativa approvata. Per l’adesione servono anche `NEXT_PUBLIC_STATUTO_URL` e `STATUTO_VERSION`. La modalità di collaudo usa testi e versioni separati. Il server usa `SUPABASE_SERVICE_ROLE_KEY` per lo storage privato e la registrazione della lettura del verbale.
3. Per controllare le segnalazioni storiche, consultare catalogo ed edizioni oppure eseguire separatamente queste query.

```sql
select id, nome from public.corsi where duplicato_storico;
select id, nome, inizio, fine from public.edizioni_corsi where duplicato_storico;
select id, nome from public.edizioni_corsi where direttore_id is null;
```

## Controlli eseguiti

- TypeScript, 105 test automatici, verifica dell’integrità dei sorgenti e del dataset del codice fiscale, build di produzione Next.js.
- Applicazione da zero delle 19 migrazioni su PostgreSQL locale, con strutture minime di Auth e Storage e sessioni distinte per due soci, segreteria e due consiglieri.
- Adesione con rifiuto foto/video e successiva revoca di un consenso, creazione simultanea della stessa edizione, creazione di un’edizione distinta, conflitto direttore/allievo in entrambi i versi e doppia iscrizione. Verificati anche il firmatario dopo un cambio di direttore, il brevetto storico e i permessi della cronologia.
- Permessi di accesso ai certificati e nuova verifica dopo il caricamento. La route HTTP è stata provata con risposte simulate dello storage. Il collaudo SQL ha verificato i permessi nel database.
- Lettura del verbale senza voto, prima approvazione con altro consigliere in attesa, voto ripetuto, sostituzione, conservazione del primo voto e passaggio automatico all’unanimità.

Per ripetere i controlli, eseguire `npm run typecheck`, `npm run test:static` e `npm run build`. Il comando `npm run test:patch19` richiede un database locale usa e getta con nome che inizi per `sesto_test_`, le migrazioni installate, i ruoli Supabase e una connessione amministrativa in `TEST_0019_DATABASE_URL`. Il test crea dati di esempio.

## Prove da completare in staging

- Conferma email e invio della domanda da browser con “Non autorizzo”. Verificare il riepilogo, la stampa da browser e la revoca dal profilo.
- Da telefono, modificare e annullare una scheda, verificare un errore di campo e salvare. Aprire i documenti con account distinti. Provare un JPG e un PDF, compreso un file superiore a 3 MiB.
- Sottoporre un DOCX con due consiglieri, verificare l’anteprima, sostituirlo e aprire il PDF definitivo dopo il secondo voto.
- Eseguire il test esistente `npm run test:rls` con gli account e le variabili del progetto Supabase di staging. Durante la preparazione della patch tali credenziali erano assenti.

## Decisione aperta

Nel progetto sono presenti la capienza per edizione, la regola di unicità allievo/edizione e i requisiti di adesione e tesseramento. Per introdurre anche un massimo individuale, l’associazione deve definire il numero consentito di iscrizioni, il periodo e gli stati da conteggiare.
