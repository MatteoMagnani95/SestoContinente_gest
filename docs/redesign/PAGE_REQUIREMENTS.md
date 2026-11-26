# Gestionale Sesto Continente 2.0 — Fase 0
Data: 2026-11-26. Base esatta: `ea97e2663a3999527b2e3f868c19dfd5b4f646eb`. Ramo: `feature/gestionale-2.0-redesign`.
Nessun merge, modifica applicativa o SQL produzione in questa fase.

# Censimento route
Inventario ricavato dall'albero Git ricorsivo non troncato: 229 blob, 48 page, 7 handler, 2 layout. Le indicazioni ruolo sono preliminari e non una certificazione di accesso.

| File | URL | Perimetro | Stato |
|---|---|---|---|
| `app/accedi/page.tsx` | `/accedi` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/api/cron/promemoria/route.ts` | `/api/cron/promemoria` | cron protetto da verificare | Da analizzare nel dettaglio |
| `app/area-personale/certificato/page.tsx` | `/area-personale/certificato` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-personale/corsi/page.tsx` | `/area-personale/corsi` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-personale/documenti/page.tsx` | `/area-personale/documenti` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-personale/page.tsx` | `/area-personale` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-personale/profilo/page.tsx` | `/area-personale/profilo` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-soci/page.tsx` | `/area-soci` | socio abilitato | Da analizzare nel dettaglio |
| `app/auth/callback/route.ts` | `/auth/callback` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/comunicazioni/corsi/[id]/page.tsx` | `/comunicazioni/corsi/[id]` | autorizzazioni contestuali da verificare | Da analizzare nel dettaglio |
| `app/comunicazioni/soci/[id]/page.tsx` | `/comunicazioni/soci/[id]` | autorizzazioni contestuali da verificare | Da analizzare nel dettaglio |
| `app/documenti/[id]/route.ts` | `/documenti/[id]` | utente autenticato; scope RLS | Da analizzare nel dettaglio |
| `app/documenti/page.tsx` | `/documenti` | utente autenticato; scope RLS | Da analizzare nel dettaglio |
| `app/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]/page.tsx` | `/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/amministrazione-dati/page.tsx` | `/gestionale/amministrazione-dati` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/archivio-incassi/page.tsx` | `/gestionale/archivio-incassi` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/calendario-visivo/[id]/page.tsx` | `/gestionale/calendario-visivo/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/calendario-visivo/page.tsx` | `/gestionale/calendario-visivo` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/corsi/[id]/page.tsx` | `/gestionale/corsi/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/corsi/[id]/stampe/route.ts` | `/gestionale/corsi/[id]/stampe` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/corsi/nuovo/page.tsx` | `/gestionale/corsi/nuovo` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/corsi/page.tsx` | `/gestionale/corsi` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/economia/page.tsx` | `/gestionale/economia` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/esporta/[modulo]/route.ts` | `/gestionale/esporta/[modulo]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/importazione/modello/route.ts` | `/gestionale/importazione/modello` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/importazione/page.tsx` | `/gestionale/importazione` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/incassi/[id]/page.tsx` | `/gestionale/incassi/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/incassi/page.tsx` | `/gestionale/incassi` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/layout.tsx` | `/gestionale` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/moduli/[modulo]/page.tsx` | `/gestionale/moduli/[modulo]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/moduli/iscrizioni/page.tsx` | `/gestionale/moduli/iscrizioni` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/page.tsx` | `/gestionale` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/programmi-didattici/page.tsx` | `/gestionale/programmi-didattici` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/report/page.tsx` | `/gestionale/report` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/richieste/[id]/page.tsx` | `/gestionale/richieste/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/richieste/page.tsx` | `/gestionale/richieste` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/soci/[id]/page.tsx` | `/gestionale/soci/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/soci/page.tsx` | `/gestionale/soci` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/utenti/[id]/elimina/page.tsx` | `/gestionale/utenti/[id]/elimina` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/utenti/[id]/page.tsx` | `/gestionale/utenti/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/utenti/page.tsx` | `/gestionale/utenti` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestione-eventi/page.tsx` | `/gestione-eventi` | staff/responsabile autorizzato | Da analizzare nel dettaglio |
| `app/istruttore/page.tsx` | `/istruttore` | istruttore autorizzato | Da analizzare nel dettaglio |
| `app/layout.tsx` | `/` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/nuova-password/page.tsx` | `/nuova-password` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/organi-sociali/archivio/[id]/page.tsx` | `/organi-sociali/archivio/[id]` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/organi-sociali/archivio/page.tsx` | `/organi-sociali/archivio` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/organi-sociali/documento/[id]/route.ts` | `/organi-sociali/documento/[id]` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/organi-sociali/page.tsx` | `/organi-sociali` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/organi-sociali/riepilogo/page.tsx` | `/organi-sociali/riepilogo` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/page.tsx` | `/` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/registrati/informativa-test/page.tsx` | `/registrati/informativa-test` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/registrati/page.tsx` | `/registrati` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/richiesta/documenti-test/page.tsx` | `/richiesta/documenti-test` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/richiesta/nuova/page.tsx` | `/richiesta/nuova` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/richiesta/stato/page.tsx` | `/richiesta/stato` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/smista/page.tsx` | `/smista` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |

## Route dinamica CRUD
- /gestionale/moduli/anagrafiche
- /gestionale/moduli/adesioni
- /gestionale/moduli/tesseramenti
- /gestionale/moduli/stagioni
- /gestionale/moduli/corsi
- /gestionale/moduli/edizioni
- /gestionale/moduli/iscrizioni
- /gestionale/moduli/istruttori
- /gestionale/moduli/qualifiche
- /gestionale/moduli/brevetti
- /gestionale/moduli/certificati
- /gestionale/moduli/programmi
- /gestionale/moduli/versioni
- /gestionale/moduli/piscine
- /gestionale/moduli/corsie
- /gestionale/moduli/calendario
- /gestionale/moduli/prenotazioni
- /gestionale/moduli/presenze
- /gestionale/moduli/attrezzature
- /gestionale/moduli/revisioni
- /gestionale/moduli/consegne
- /gestionale/moduli/quote
- /gestionale/moduli/addebiti
- /gestionale/moduli/pagamenti
- /gestionale/moduli/listino
- /gestionale/moduli/contabilita
- /gestionale/moduli/comunicazioni
- /gestionale/moduli/promemoria

Sono 28 configurazioni, alcune con flussi speciali/redirect. Verificare singolarmente. La route iscrizioni ha anche una pagina dedicata.

## Dipendenze inventariate
- app/actions.ts
- app/area-personale/actions.ts
- app/area-personale/certificato/actions.ts
- app/area-personale/profilo/actions.ts
- app/area-soci/actions.ts
- app/comunicazioni/actions.ts
- app/documenti/actions.ts
- app/gestionale/amministrazione-dati/actions.ts
- app/gestionale/calendario-visivo/actions.ts
- app/gestionale/corsi/actions.ts
- app/gestionale/importazione/actions.ts
- app/gestionale/incassi/actions.ts
- app/gestionale/programmi-didattici/actions.ts
- app/gestionale/soci/actions.ts
- app/gestionale/utenti/[id]/elimina/actions.ts
- app/gestionale/utenti/actions.ts
- app/istruttore/actions.ts
- app/module-actions.ts
- app/organi-sociali/actions.ts
- components/ApplicationForm.tsx
- components/ApplicationReviewForm.tsx
- components/AssociationMailForm.tsx
- components/CancelEditButton.tsx
- components/CertificateUploadForm.tsx
- components/CodiceFiscaleAssist.tsx
- components/CourseEnrollmentSelect.tsx
- components/CourseLanePicker.tsx
- components/Cronologia.tsx
- components/Dichiarazioni.tsx
- components/EditForm.tsx
- components/EligibleEnrollmentSelect.tsx
- components/Emergenza.tsx
- components/GlobalCancelButtons.tsx
- components/LessonComposer.tsx
- components/MailContextPage.tsx
- components/RemoveRecord.tsx
- components/SceltaImmagini.tsx
- components/SiteHeader.tsx
- components/StaffNav.tsx
- lib/admin-accounts.ts
- lib/application-config.ts
- lib/application-review.ts
- lib/area-soci.ts
- lib/calendar-tools.ts
- lib/cda-documenti.ts
- lib/cda-pdf.ts
- lib/certificati.ts
- lib/codice-fiscale.ts
- lib/course-errors.ts
- lib/course-tools.ts
- lib/email-context.ts
- lib/email-service.ts
- lib/email-tools.ts
- lib/file-certificato.ts
- lib/format.ts
- lib/importazione.ts
- lib/modules.ts
- lib/pagine.ts
- lib/payment-tools.ts
- lib/pdf-registro.ts
- lib/registrazione.ts
- lib/scelte.ts
- lib/security.ts
- lib/supabase/admin.ts
- lib/supabase/server.ts
- lib/verifica-anagrafica.ts
- proxy.ts

## Requisiti pagina
| ID | Area | Fase | Ambito | Accettazione |
|---|---|---|---|---|
| SC-08 | Home | 4 | / | Header e hero equilibrati, logo, eventuale foto autorizzata, quattro passi adesione, footer, CTA anonimo/autenticato per ruolo; distinguere account e adesione. |
| SC-09 | Accesso | 4 | /accedi /auth/callback /nuova-password | Form centrato, mostra password, autocomplete, spazi invariati, recupero, errori, pending, sessione/email, redirect interno sicuro, ritorno home; test login/logout/reset. |
| SC-10.1 | Privacy | 4–5 | /registrati /richiesta | Titolo Crea il tuo account, quattro fasi, privacy/dichiarazioni raggruppate, presa visione e documenti ufficiali. |
| SC-10.2 | Foto/video | 4–5 | SceltaImmagini, scelte_iscrizione | Checkbox facoltativa non selezionata, non blocca, revocabile, versione/data/origine/stato/revoca/tutore, distinguere assenza storica/non consenso/revoca; niente consenso positivo dedotto. |
| SC-10.3 | Collaudo | 5 | application-config | Diciture e simulazioni solo test, non aggirare protezioni; blocco rilascio senza testi approvati. |
| SC-11 | Dashboard | 4 | /gestionale | KPI reali e link filtrati; domande, soci, corsi, iscritti, revisioni, certificati, quote, lezioni, eventi e attività; azioni rapide; economia solo autorizzati. |
| SC-12 | Domande elenco | 4 | /gestionale/richieste | Ricerca nominativo/riferimento, stati effettivi, date, sort e paginazione server, conteggi completi, rimuovere limite 100. |
| SC-13 | Domanda dettaglio | 4 | /gestionale/richieste/[id] | Riepilogo, anagrafica, residenza, contatti, tutore, documenti, dichiarazioni, comunicazioni, timeline e azioni stato/ruolo; nascondere codice catastale non CF, distinguere approvazione e pagamento; preservare storico. |
| SC-14 | Soci elenco | 4 | /gestionale/soci | Ricerca nome/cognome/CF, stagione/stato/ruolo, pagina, totale, stato e scheda; mobile card; distinguere persona/socio/allievo/account. |
| SC-15 | Scheda socio | 4 | /gestionale/soci/[id] | Header e riepilogo; tab vere panoramica, anagrafica, adesioni/dichiarazioni, tesseramenti, corsi, pagamenti, certificati, brevetti, documenti, qualifiche, attrezzature, famiglia, cronologia; contatto emergenza; azioni contestuali autorizzate. |
| SC-16 | Eventi | 4–5 | /gestione-eventi /area-soci | Shell condizionale, filtri, card con luogo/data/costo/capienza/occupazione/stato/attese; nuovo evento dedicato; sezioni iscrizioni/decisioni/pagamenti/comunicazioni se supportati; concorrenza ultimi posti. |
| SC-17 | Incassi | 4–5 | /gestionale/incassi | KPI dovuto/incassato/residuo/saldati, filtri stagione/persona/tipo/stato/periodo/scadenza; tabella compatta; versamento dedicato con causale/residuo/importo/data/metodo/rif/note/conferma e riepilogo; storico, parziali, saldi, eccedenze, concorrenza, rettifiche, contabilizzazione atomica. |
| SC-18 | Corsi elenco | 4 | /gestionale/corsi | Catalogo vs edizione, filtri disciplina/livello/stagione/stato, pagina, direttore, periodo, capienza, stati e annullati; scegliere corso prima iscrizioni. |
| SC-18.1 | Duplicati corsi | 5 | edizioni_corsi | Verificare duplicati e annullati; unicità coerente server/database, segnalare storici senza cancellarli. |
| SC-19 | Scheda corso | 4 | /gestionale/corsi/[id] | Header, riepilogo e tab vere: panoramica, configurazione, direttore/istruttori, allievi, programma, lezioni, presenze, brevetti, documenti/stampe, cronologia. |
| SC-19.1 | Configurazione | 4–5 | Corsi | Campi distinti, date italiane, costo/note, capienza non inferiore a iscritti confermati. |
| SC-19.2 | Direttore | 4–5 | Corsi | Un direttore per edizione, mai allievo della stessa, controllo di ogni percorso; firmatario brevetto e coerenza responsabile, segnalare assenza, non alterare abilitazioni. |
| SC-19.3 | Istruttori | 4 | Corsi | Ruolo, qualifica, validità e selettore ricercabile; non inferire abilitazioni. |
| SC-19.4 | Allievi | 4–5 | Iscrizioni | Stato storico distinto da idoneità corrente, requisiti amministrativi, emergenza esistente non sovrascritta da vuoto, ricerca e capienza/duplicati/concorrenza. |
| SC-19.5 | Programma | 4 | Corsi | Versioni compatibili approvate immutabili; moduli/esercizi/materiale consultabili. |
| SC-19.6 | Lezioni | 4–5 | LessonComposer | Titolo/tipo/data/orari/piscina/corsie/esercizi/moduli/materiale/istruttori se supportati; campi contestuali e transazione atomica, conflitti e Europe/Rome. |
| SC-19.7 | Presenze | 4–5 | Corsi/istruttore | Lezione e allievi pertinenti, presente/assente/da registrare, niente default arbitrario, preservare dati, modifiche autorizzate. |
| SC-19.8 | Stampe | 4 | stampe | Raggruppare PDF/stampa, etichette esplicite, preservare output. |
| SC-20 | Moduli didattici | 4 | /gestionale/programmi-didattici | Ricerca, filtro tipo/disciplina, pagina, codice/titolo/tipo/descrizione, modifica dedicata, legami protetti; distinguere modulo/programma/versione/associazione. |
| SC-21.1 | Calendario | 4 | /gestionale/calendario-visivo | Giorno/settimana/mese/agenda, oggi, navigazione/date, filtri piscina/corso, giorno corrente e modalità, eventi cliccabili con dati e empty state. |
| SC-21.2 | Nuova lezione | 4 | Calendario | Aprire flusso diretto, selezione corso e prefill data/ora/piscina, ritorno con filtri, riuso composer e validazione atomica. |
| SC-21.3 | Occupazione | 4–5 | Prenotazioni | Non prenotata ≠ disponibile contrattualmente; conflitti preflight e server, stati espliciti. |
| SC-21.4 | Piscine | 4 | moduli/piscine | Nome, indirizzo, orari, limitazioni, corsie, azioni e pannello. |
| SC-21.5 | Corsie | 4–5 | moduli/corsie, prenotazioni | Relazioni piscina/corsia/lezione/orario/vincoli; modifica e cancellazione protette. |
| SC-22 | Organi sociali | 4–5 | /organi-sociali | Shell condizionale e denominazione statutaria; tab panoramica, componenti, sedute, bozze, votazioni, approvati, archivio, sostituiti. |
| SC-22.1 | Componenti | 4 | cda_componenti | Nome/carica/mandato/stato, date italiane, aggiunta su richiesta, regole mandato. |
| SC-22.2 | Seduta e verbale | 4 | organi-sociali | Flusso dati/oggetto/tipo/DOCX/adesioni/riepilogo; limiti file, originale preservato, PDF non equivalente impaginazione Word. |
| SC-22.3 | Votazioni | 4–5 | cda_* | Titolo/data/tipo/stato/rif, azioni chiare, aventi diritto/quorum/unanimita/voto singolo/concorrenza/immutabilità/versioni e adesioni, evitare 0/0 ambiguo. |
| SC-23 | Documenti | 4 | /documenti | Shell per staff; ambito/visibilità, tipo file/nome/categoria/data/dimensione/riesame, ricerca/filtri/pagina, anteprima/download/modifica/sostituzione/archiviazione autorizzata. |
| SC-23.1 | Upload | 4–5 | Documenti | File e metadati contestuali, visibilità restrittiva e destinatari espliciti, limiti, storage privato, RLS e download temporanei. |
| SC-24 | Contabilità | 4 | moduli/contabilita | Entrata/uscita/export/rendiconto, filtri periodo/tipo/categoria/metodo/origine/descrizione, totali e tabella euro. |
| SC-24.1 | Movimento | 4 | Contabilità | Form data/tipo/categoria/descrizione/importo/metodo/rif/note; valutare singolare/plurale quote senza cambiare storici. |
| SC-24.2 | Automatici | 5 | Contabilità | Origine e link pagamento, immutabilità o rettifica, verificare sospetti duplicati senza cancellare. |
| SC-24.3 | Controlli | 5 | Contabilità | Precisione/arrotondamenti/saldi/idempotenza/rettifiche/permessi/CSV formula injection. |
| SC-25 | Rendiconto | 4–5 | /gestionale/economia | Entrate/uscite/saldo periodo/numero; saldo non cassa; anno/intervallo, 12 mesi anche a zero, categorie e percentuali, CSV/link, aggregazioni complete, rendiconto interno. |
| SC-26 | Inventario | 4 | moduli/attrezzature | KPI reali, ricerca/filtri categoria/codice/marca/modello/matricola/stato/revisione, tabella e scheda. |
| SC-26.1 | Scheda attrezzatura | 4–5 | attrezzature | Codice e nome, dati tecnici/stato/acquisto/revisioni/prestiti/documenti/note, azioni, unicità codice, stato coerente e revisione mancante/scaduta. |
| SC-27 | Revisioni | 4 | moduli/revisioni | Registra revisione, filtri, data/tipo/esito/costo/scadenza e note, pannello dedicato. |
| SC-27.1 | Sincronizzazione | 5 | revisioni_attrezzature | Fonte autorevole, ultima/prossima/stato e scadenze, modifiche storiche, non inventare periodicità. |
| SC-27.2 | Duplicati | 5 | revisioni_attrezzature | Indagare tre A001 sospetti; anti doppio submit e segnalazione, non cancellare o vietare interventi legittimi. |
| SC-28 | Prestiti | 4 | moduli/consegne | KPI, filtri, attrezzatura/destinatario/corso/consegna/restituzione prevista ed effettiva/stato. |
| SC-28.1 | Consegna | 4–5 | assegnazioni_attrezzature | Form contestuale, nessuna data effettiva obbligatoria per prestito aperto, bloccare doppia consegna e verificare utilizzabilità. |
| SC-28.2 | Restituzione | 4–5 | assegnazioni_attrezzature | Azione diretta, riepilogo e data, stato sincronizzato, storico. |
| SC-29 | Utenti elenco | 4 | /gestionale/utenti | Distinguere account/persona/socio/ruolo/permesso/famiglia; KPI, ricerca/filtri/pagina, email/stato/collegamenti, tuo account. |
| SC-29.1 | Account dettaglio | 4 | /gestionale/utenti/[id] | Info/email verificata/date/ruoli/legami/dipendenze/azioni; UID e FK solo tecnici; dipendenze in italiano. |
| SC-29.2 | Ruoli | 4–5 | admin-accounts | Nessun admin preselezionato; scelta account contestuale, descrizione privilegi effettivi; server impedisce escalation, duplicati, auto-revoca/ultimo admin se previsto. |
| SC-29.3 | Anagrafica | 4–5 | Utenti | Flusso account/persona/relazione/riepilogo; preservare multi-persona e tutor; compatibilità/duplicati. |
| SC-29.4 | Eliminazioni | 5 | Utenti | Distinguere blocco/revoca/rimozione account/dati, conseguenze, conservazione audit/verbali/contabilità, niente cascata indiscriminata. |
| SC-30.1 | Affidabilità report | 5 | /gestionale/report | Totali completi, distinguere quote non saldate/in scadenza/scadute/residuo; filtri spiegati, confronto fonti. |
| SC-30.2 | Centro operativo | 4 | Report | Categorie supportate: revisioni/certificati/quote/tessere/adesioni/domande/lezioni/eventi/prestiti/documenti/direttori/voti; entità, data, giorni, priorità, stato, link. |
| SC-30.3 | Orizzonti | 4 | Report | Scadute, 7/15/30/60/90 giorni, personalizzato, urgenza e limiti dichiarati. |
| SC-31 | Notifiche | 4–5 | notifiche, cron | Riuso regole e canali, campanella e non lette, link, segna letta distinto da risolta, deduplica e nessun invio reale di prova. |
| SC-32 | Altre route | 4 | Tutti i moduli | Analisi singola di anagrafiche/adesioni/tessere/quote/brevetti/certificati/catalogo/edizioni/iscrizioni/istruttori/qualifiche/versioni/presenze/calendario/prenotazioni/listino/comunicazioni/stagioni/promemoria/import/admin dati. |
| SC-32.1 | Stagioni | 4–5 | moduli/stagioni | Corrente, future, archiviate; una attiva secondo regole; niente collaudo in produzione. |
| SC-32.2 | Certificati/tessere | 4–5 | moduli/certificati, tesseramenti | Stati e date, minimizzazione sanitaria, accessi riservati. |
| SC-32.3 | Importazione | 4–5 | /gestionale/importazione | File, validazione, anteprima, conflitti, riepilogo, conferma, esito; deduplica e audit, nessun import reale in test. |
| SC-32.4 | Dati | 4–5 | /gestionale/amministrazione-dati | Area tecnica protetta, conferme irreversibili, non esporre a non autorizzati. |
| SC-33 | Area personale | 4 | /area-personale | Analizzare codice e applicare UI semplice; profilo/adesioni/tessere/corsi/lezioni/presenze/certificati/quote/brevetti/eventi/documenti/comunicazioni/dichiarazioni solo se supportati; dati propri e revoca scelta. |
| SC-34 | Istruttori | 4 | /istruttore | Corsi assegnati, lezioni/allievi/programmi/esercizi/materiale/presenze/documenti/calendario supportati; registro mobile, minimo dato necessario. |
| SC-35 | Richiedente | 4 | /richiesta | Form logico, progresso, validazione, bozze se supportate, privacy, riepilogo, conferma, stato/integrazioni, minori e tutori. |

## Evidenze lette
- app/layout.tsx monta SiteHeader, GlobalCancelButtons, main e footer per tutte le aree; app/gestionale/layout.tsx monta StaffNav e requireStaff. /gestione-eventi, /organi-sociali, /documenti sono esterne e condivise con ruoli non staff: shell condizionale, non trasferimento cieco sotto /gestionale.
- StaffNav server senza pathname; CSS solo hover/focus; a <=1000px il menu diventa wrap e occupa il flusso. SiteHeader mostra link generici anche senza contesto ruolo.
- CRUD [modulo] usa Editor dentro td/details, placeholder e azioni generiche; references limit 500 e qualifiche limit 5000. Incassi, documenti e schede corso richiedono flussi dedicati. Richieste limit 100; documenti limit 150; eventi limit 200.
- Schede socio e corso contengono numerose query limitate: non interpretare liste parziali come totali. Calendario Nuova lezione punta a /gestionale/corsi. Utenti assegnazione ruolo senza placeholder esplicito e ricerca persona limitata.
- Report patch 0020 ha count exact per revisioni ma mostra lista limitata 80: distinzione totale/dettaglio da mantenere. Rendiconto usa riepilogo_contabile_periodo.
- Area personale legge notifiche, saldi e stagione; istruttore usa assegnazioni e allievi_del_mio_corso; preservare scope e presenze patch 0020.
