# Sesto Continente — Patch 0015: amministrazione account e dati

## Prima dell'installazione
- Base ricostruita: progetto 0011 + hotfix CF + 0012 + 0013 + 0014 + collaudo globale + hotfix valutazione adesioni. Applicare solo a un repository con tutte queste modifiche. Non sostituire i file di migrazioni precedenti.
- Effettuare un backup ripristinabile; la 0015 cambia anche controlli di autorizzazione, dipendenze e accesso alle sessioni. Conservare almeno un amministratore attivo e verificato. Non eseguire reset.
- Vercel: verificare la presenza di `SUPABASE_SERVICE_ROLE_KEY` (chiave server-side service_role di Supabase, mai `NEXT_PUBLIC_*`, mai in GitHub o in chat). Era già prevista per cron. Senza chiave si può consultare l'elenco utenti, ma le azioni Auth restano disabilitate.

## Installazione
1. Eseguire solo `supabase/migrations/20261117234500_amministrazione_account_dati.sql` nel SQL Editor del branch main. Non eseguire il file due volte. Lo script è in transazione e non rimuove record durante l'installazione.
2. In caso di successo, eseguire `verifica_0015_sola_lettura.sql`. Tutti i risultati attesi sono `true`. Non registrare la migrazione nello storico se un controllo fallisce.
3. Dopo verifica, registrare la versione 20261117234500, nome `amministrazione_account_dati`, nello storico Supabase come fatto per le precedenti.
4. Estrarre la patch nella radice locale del progetto; esaminare Changes in GitHub Desktop. Commit `Update v1.5 - Amministrazione utenti e dati`, push, verificare build e deploy Vercel.

## Funzioni
- Gestione utenti mostra gli account Auth anche privi di ruolo, ordinati prima della paginazione; crea account (conferma email manuale esplicita, non invia un invito), cambia email/password di altri utenti, assegna/revoca ruoli e collega/scollega anagrafiche. Disattivazione con ban Auth e riattivazione.
- Rimozione conservativa: cancellazione logica Auth non reversibile, preserva la riga tecnica e le relazioni secondo le API Supabase. Cancellazione definitiva: solo se le FK applicative non riguardano storico, eccezione per soli ruoli e collegamenti; i file di proprietà possono bloccare entrambe le forme di cancellazione. Non cancella automaticamente l'anagrafica. Un amministratore in carica non può essere rimosso o disattivato prima della revoca del ruolo da parte di un altro amministratore attivo. Il proprio account è protetto.
- Le nuove restrizioni RLS proteggono i dati applicativi e lo storage; le nuove scritture tramite vecchie RPC sono bloccate per account non abilitati nelle tabelle applicative elencate. Non considerare revocati istantaneamente tutti i JWT o tutti gli URL firmati già emessi; verificare sui ruoli reali.
- Amministrazione dati: collegamenti diretti agli editor di tutti i moduli operativi esistenti; nuovi editor per listino, legami familiari, notifiche esistenti, creazione moduli didattici e rimozione eventi, iscrizioni evento e lezioni quando prive di dipendenze. Rimozioni dentro Modifica. Visualizza dati collegati nell'editor generico. Calendari restano cronologici.
- Incassi: correzione di registrazione ERRATA, non rimborso. Archivia snapshot immutabile, cancella incasso e movimento correlato nella stessa transazione, ricalcola saldi via viste. Registrare poi una nuova operazione corretta. Per un vero incasso/rimborso utilizzare una procedura contabile di storno, non questa funzione.
- Limiti intenzionali: nessun editor SQL libero o accesso alle tabelle tecniche Auth; verbali approvati, voti, audit, consensi, pratiche approvate, versioni didattiche storiche restano protetti, e la rimozione generica rifiuta dipendenze. Nessuna cancellazione globale/cascata dei dati associativi. Notifiche: modifica/rimozione di esistenti, nuovi avvisi da Comunicazioni. Alcuni selettori legacy sono limitati; non è stato riscritto tutto il gestionale.

## Collaudo obbligatorio dopo deploy (solo record dedicati)
- Admin: creare un account senza ruolo, cercarlo, aprire Modifica, cambiare email/password e assegnare/revocare ruolo. Verificare che utente non amministratore non veda il menu e non riesca a invocare le operazioni.
- Account nuovo senza riferimenti: rimozione definitiva, impossibilità del nuovo accesso. Account con pratica/adesione: rimozione definitiva bloccata, disattivazione/riattivazione; rimozione conservativa su un diverso account sacrificabile; controllare che anagrafica e storico restino.
- Verificare tentativo su proprio account e ultimo admin, nonché account con votazione in corso. Controllare sessioni già aperte e collegamenti ai file; non utilizzare record reali per queste prove.
- Eventi con e senza iscrizioni, rimozione singola iscrizione, capienza aggiornata; rimozione calendario e record con FK, listino, legami, moduli, notifiche; accessi separati istruttore/socio/segreteria.
- Rettifica di un versamento fittizio dedicato: saldi, movimento, copia in storico rettifiche, reinvio idempotency_key rifiutato. Verificare anche assenza di permesso per segreteria.
- Test eseguiti offline: 86/86 unitari/statici (`node --test tests/*.test.mjs`), controllo sintattico/import 100 sorgenti e 188 import. Le dipendenze npm complete, build Next.js, SQL su PostgreSQL/Supabase reale e Auth Admin non sono stati eseguiti nell'ambiente di lavoro. I test non sostituiscono il collaudo online.
