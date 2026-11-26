# MASTER SPEC — Sesto Continente Gestionale 2.0

**Baseline normativa:** capitolato integrale di 45 sezioni fornito dal committente nella conversazione del 26/11/2026. Questo file è una trascrizione operativa sintetica per sezione/sottosezione, NON una copia letterale integrale. Il testo originale prevale in caso di discrepanza. Prima del rilascio va allegata la copia integrale e suddivisi ulteriormente i requisiti composti.

Obiettivo: intervenire sul gestionale esistente, non riscriverlo. Ogni requisito SC corrisponde alla numerazione originale; conservare le regole esistenti e usare la soluzione conservativa se ambigua.

| ID | Area | Fase | Ambito | Criterio operativo |
|---|---|---|---|---|
| SC-01 | Governance e obiettivo | 0–7 | Tutte | UX operativa, italiana, moderna marittima, adatta a utenti 50–60; posizione, azione, dati, ritorno, esito e conseguenze sempre chiari. |
| SC-02 | Vincoli | 0–7 | Tutte | Preservare stack, URL, dati, funzionalità, regole, ruoli, RLS, documenti, audit e contabilità; niente dati fittizi, credenziali, migrazioni distruttive, eliminazioni automatiche, merge o SQL produzione senza autorizzazione; documentare decisioni e test. |
| SC-03 | Audit | 0 | Repository | Branch, PR, patch 0019/0020, route, action, API, componenti, schema, RLS e ruoli; ramo dedicato dalla base compatibile. |
| SC-04 | Tracciamento | 0–7 | docs/redesign | Otto documenti; ID, descrizione, pagina, priorità, dipendenze, stato, commit, test, criterio, limiti; non dichiarare verificato senza prova. |
| SC-05.1 | Identità | 1 | CSS/layout | Palette #102B39 #087E83 #3679B8 #65C9BE #F3F7F8 #FFFFFF; accenti per macroarea: segreteria petrolio, didattica oceano, calendario viola, attrezzature ocra, contabilità verde, sistema ardesia; contrasti misurati. |
| SC-05.2 | Stati | 1 | UI | Verde valido/attivo, arancio imminente, rosso scaduto/errore, blu programmato/in corso, grigio archiviato; etichetta oltre al colore. |
| SC-05.3 | Tipografia | 1 | CSS | Sans leggibile, desktop H1 28–34 H2 20–24 testo 15–16 secondario 13–14; mobile H1 26–30 H2 20–22 testo 16 secondario 14; no maiuscolo eccessivo. |
| SC-05.4 | Componenti | 1–3 | components | AppShell, Sidebar, Header, PageHeader, Breadcrumb, BackButton, SectionHeader, MetricCard, StatusBadge, Alert, DataTable, SearchBar, FilterBar, Pagination, EmptyState, LoadingState, ErrorState, FormField, FormSection, FormActions, Modal, Drawer, ConfirmDialog, UnsavedChangesGuard, Tabs, FileUploader, Timeline, NotificationCenter, ActionMenu; riuso e token. |
| SC-05.5 | Gerarchia | 1 | CSS | Spazi coerenti, card non annidate né enormi, azione primaria visibile, bordi/ombre sobrie. |
| SC-06.1 | Shell | 2 | layout, StaffNav | Sidebar tutte pagine staff, incluse eventi/organi/documenti se autorizzati; macroaree espandibili Panoramica, Soci e segreteria, Corsi e didattica, Impianti e calendario, Attrezzature, Contabilità, Organi sociali, Eventi e comunicazioni, Documenti, Scadenze e notifiche, Impostazioni; scroll indipendente, URL conservati. |
| SC-06.2 | Route attiva | 2 | StaffNav | Sfondo, testo, indicatore, aria-current; sottoroute, deep link e refresh. |
| SC-06.3 | Header | 2 | SiteHeader | Logo, area corrente, account, logout, sole aree autorizzate; ricerca/notifiche solo funzionanti; cambio area multiruolo. |
| SC-06.4 | Breadcrumb | 2 | PageHeader | Nomi leggibili, inclusi dettagli e route dinamiche. |
| SC-06.5 | Ritorno | 2 | Tutte le pagine interne | Ritorno esplicito e sicuro, query param con filtri e pagina, non history indiscriminata. |
| SC-06.6 | Dirty guard | 2–3 | Form | Solo modifiche reali, navigazione/chiusura/refresh, dialogo continua o esci, reset dopo successo; beforeunload nativo; distinguere annulla e indietro. |
| SC-07.1 | Form fuori celle | 3 | CRUD/incassi/documenti/corsi | Drawer desktop, modal breve, pagina complessa, fullscreen mobile; espansione solo lettura a piena larghezza. |
| SC-07.2 | Tabelle | 3 | DataTable | Ricerca, filtri, sort, paginazione, totale, azioni distanziate, link scheda, export dove pertinente; euro allineati, mobile card o scroll locale. |
| SC-07.3 | Terminologia | 3 | CRUD | Eliminare nuovo record, crea nuovo, cerca nel campo principale, fasi tecniche, SQL/FK/UUID; azioni specifiche per entità e relazione. |
| SC-07.4 | Form | 3 | EditForm | Apertura su richiesta, sezioni, label, obbligatorietà, ricerca selector, date/importi, errori inline, dati conservati, no default rischiosi, 2 colonne desktop/1 mobile, blocco doppio submit. |
| SC-07.5 | Feedback | 3 | Server actions | Esito confermato server, errori italiani non SQL grezzi, loading e focus. |
| SC-07.6 | Distruttive | 3 | RemoveRecord | Azioni specifiche, conferma entità/conseguenze, audit e dipendenze, rettifica contabile. |
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
| SC-36.1 | Menu mobile | 2–6 | Shell | Header compatto, hamburger/drawer chiuso, macroaree, attivo, chiusura dopo nav, focus, profilo/notifiche per ruolo; bottom bar solo se utile. |
| SC-36.2 | Layout mobile | 1–6 | Tutte | No overflow globale, margini 16px, una colonna, target 44×44 preferiti, input 16px, safe area, card/tabelle, fullscreen dialog, agenda. |
| SC-36.3 | Safari | 6 | Tutte | Safe area, viewport dinamica, tastiera, scroll, data/ora, select, conferma, focus/drawer. |
| SC-36.4 | Home mobile | 6 | / /accedi /registrati | Header e titoli ridotti, CTA raggiungibili, dichiarazioni compatte. |
| SC-36.5 | Viewport | 6–7 | Tutte | 320/375/390/430/768/1024/1280/1440/1920, orientamenti, Safari iOS e Chrome, distinguere device reali ed emulazione. |
| SC-37 | Accessibilità | 1–7 | Tutte | WCAG 2.2 AA come obiettivo, contrasto, tastiera, focus, label, errori, dialoghi e ritorno focus, screen reader, semantica/live status, reduced motion, reflow/zoom, icone con label. |
| SC-38 | Sicurezza | 0–7 | DB/server/storage | Auth, autorizzazioni, RLS, route/action/API, documenti, IDOR, escalation, concorrenza, vincoli, transazioni, audit/export; centralizzare e verificare percorsi generici; migrazioni non distruttive, test separato, rollback e niente PII nei log. |
| SC-39 | Prestazioni | 1–7 | DB/React | Query/pagina/aggregazioni, bundle e immagini, richieste, rendering, loading, no limiti silenziosi, dipendenze leggere. |
| SC-40 | Fasi | 0–7 | Repository | 0 audit, 1 design system, 2 layout, 3 tabelle/form, 4 pagine per blocchi, 5 funzionale, 6 mobile, 7 QA; commit separati, sicurezza anticipata, responsive sin dall'inizio. |
| SC-41 | Collaudo | 7 | CI/staging | Navigazione, moduli, auth, soci, corsi, contabilità, attrezzature, documenti, organi, scadenze, mobile, sicurezza: test effettivi e regressioni. |
| SC-42 | Accettazione | 7 | Release | Inventario e tracking, shell/attivo/ritorno/dirty guard, no form celle o lessico tecnico, tab socio/corso, creazione lezione diretta, mobile, contabilità/RLS/patch, conteggi/limiti, migrazioni testate, build, no regressioni bloccanti, aree non testate esplicite, preview. |
| SC-43 | Consegna fase | 0–7 | docs/redesign | Riepilogo/file/requisiti aperti e chiusi/commit/migrazioni/test reali/esiti/screenshot disponibili/decisioni/blocchi/rischi e tracker. |
| SC-44 | Pubblicazione | 7 | Vercel/Supabase | Niente merge produzione senza consenso; preview isolata, verifiche patch/migrazioni/DB/rollback/testi/permessi, file SQL e ordine, accesso solo al progetto. |
| SC-45 | Esecuzione | 0–7 | Repository | Non solo CSS o proposta; tutte le route, decisioni conservative documentate, implementazione in fasi e nessuna incompletezza taciuta. |
