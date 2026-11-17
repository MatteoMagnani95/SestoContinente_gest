# Sesto Continente — aggiornamento 0014

## Installazione
1. Verificare un backup ripristinabile e che il database `main` abbia le 13 migrazioni già applicate/registrate. Non resettare il database.
2. Eseguire solo `supabase/migrations/20261117223000_area_soci_eventi.sql` nel SQL Editor di Supabase. Lo script è transazionale e non cancella dati preesistenti. Non rieseguirlo se già applicato.
3. Eseguire `verifica_0014_sola_lettura.sql` (incluso nel pacchetto) e controllare che tutti i campi siano true. Registrare la versione `20261117223000`, nome `area_soci_eventi`, solo dopo esito positivo. Non eseguire la query di verifica come migrazione.
4. Estrarre l'archivio nella radice del repository locale aggiornato alla patch 0013, mantenendo la struttura, sovrascrivendo i file modificati. Non sostituire le migrazioni precedenti. Controllare i diff su GitHub Desktop, eseguire commit e push. Il file di verifica SQL è nella radice, non nella cartella migrations.
5. Verificare build Vercel e procedere con collaudo. Nessuna ulteriore installazione locale necessaria per pubblicare.

## Registrazione
La pagina non ricarica il modulo dopo un errore. Verifica CF con la stessa funzione server usata per l'invio, senza inviare anagrafiche a servizi di ricerca esterni. Il CF non viene assegnato automaticamente: è un controllo di coerenza, non una certificazione dell'Agenzia delle Entrate. Se il CF non è disponibile resta possibile lasciare vuoto come previsto dal flusso preesistente.

Controllare che l'account manuale in Supabase Authentication > Users sia confermato (se è un account di test autorizzato, usare la conferma effettiva prevista dalla Dashboard; non confermare indiscriminatamente utenti reali). In Vercel devono essere impostate quattro variabili: `STATUTO_VERSION`, `PRIVACY_VERSION`, `NEXT_PUBLIC_STATUTO_URL`, `NEXT_PUBLIC_PRIVACY_URL`. Le versioni devono corrispondere ai documenti effettivi (non `DA_CONFIGURARE`); gli URL devono essere validi e raggiungibili. Dopo una variazione delle variabili, effettuare un nuovo deploy. Nessun consenso fittizio viene attribuito. Non condividere password in chat o nel repository.

## Regole area soci
- Account collegato come titolare a una persona con adesione attiva nella stagione attiva che include la data odierna (Europe/Rome), quota associativa presente e completamente saldata. Quota a zero ammessa se esplicitamente registrata. Account di soli tutori non autorizzati automaticamente; un tutore può accedere se è anche socio in proprio.
- Istruttori e staff possono gestire eventi dalla pagina separata `/gestione-eventi`, anche senza quota saldata. Istruttori solo eventi propri; staff tutti. L'autore diventa responsabile. Nessun accesso ai documenti associativi per il solo ruolo istruttore.
- Una domanda in attesa riserva subito un posto; una domanda approvata lo mantiene. Il rifiuto, il ritiro e l'annullamento liberano il posto. Evento chiuso non ammette nuove richieste; evento annullato conserva storico. Non è prevista lista d'attesa automatica: quando un posto si libera un socio può riprovare. Le iscrizioni non associano alcun versamento: costo solo indicativo.
- Gli elenchi partecipanti sono alfabetici e mostrano l'ora di richiesta agli incaricati. I soci non vedono la lista degli altri partecipanti.
- Gli amministratori pubblicano dal menu Eventi soci > Pubblica documenti per i soci oppure da Documenti, scegliendo Ambito Associazione e Visibilità Soci attivi, senza intestatari/edizioni. RLS limita lettura e storage. I documenti esistenti già pubblicati con tali campi diventano riservati agli attivi e allo staff; nessun file viene copiato o eliminato. Per ritirare un documento da Area soci usare la rimozione amministrativa protetta; la modifica metadati non cambia riservatezza.
- Rimozione degli elementi nelle schede di modifica, non direttamente nelle liste; i vincoli sui dati collegati, pagamenti contabilizzati e verbali approvati restano invariati. Le liste con record collegati rimandano alla scheda editor dell'elemento.

## Collaudo manuale richiesto (ambiente di test, dati inventati)
1. Nuovo account confermato senza ruolo: login, bozza e invio. Provare CF incoerente e uno coerente, errore server e conferme obbligatorie: i valori inseriti devono rimanere nel modulo. Controllare che una pratica inviata non si duplichi.
2. Socio con quota mancante/non saldata e adesione sospesa: link Area soci assente; accesso diretto rifiutato; download documento riservato negato.
3. Due soci attivi distinti: evento con un solo posto. Richiedere il posto simultaneamente da sessioni diverse; una sola richiesta in attesa, l'altra rifiutata. Ritiro e nuova richiesta; approvazione del responsabile; provare una terza sessione istruttore non responsabile e una staff. Verificare capienza e duplicati.
4. Pubblicare un PDF non sensibile di test come amministratore; consultarlo come socio attivo e verificare il diniego di un non-socio. Provare pubblicazione dalla segreteria: negata per documenti associativi destinati ai soci.
5. Aprire anagrafiche, adesioni, corsi, quote: azione Rimuovi solo nella scheda di modifica. Conferma obbligatoria. Provare rimozione di record di prova senza dipendenze e blocco su record collegato (mai sui dati reali).

## Limiti delle verifiche locali
70 test automatici di progetto passati (in parte test statici e test unitari con dati simulati); 89 sorgenti TypeScript/TSX analizzati sintatticamente, 156 import locali controllati. Non è stata eseguita la build completa con dipendenze npm reali, né l'esecuzione di questa migrazione su PostgreSQL/Supabase, né il collaudo live con gli account. Il test reale dell'archivio Belfiore resta attivo su Vercel. Le modifiche sono derivate dal progetto 0011 con hotfix CF e patch 0012–0013 sovrapposte; confrontare i diff con eventuali modifiche locali successive.
