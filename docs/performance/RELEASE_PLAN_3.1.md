# Sesto Continente 3.1 — piano di rilascio controllato (NO-GO)
Preparazione esclusivamente GitHub; nessuna modifica a Vercel o database remoto. Il 50% è stretch goal, non gate obbligatorio. Soglia prestazionale minima già utilizzata: 40% della somma di cinque mediane click→contenuto in QA 40ms; nessuna regressione funzionale o di sicurezza accettata. Record sperimentale 47.20% su 60ec5c9 (profilo fallito dopo benchmark); release 92995d1 validata 44.79%. Dati sintetici, non RUM.

## Gate prima della promozione
- CI, QA comparativa e profilo aggregato sullo stesso SHA; confronti ON/OFF, autenticazione e logout dei ruoli, mutazioni, carico, RLS, ripristino e audit.
- Verificare che il redesign pubblico e qualsiasi altro lavoro parallelo siano integrati solo nel coordinamento finale. Nessun merge automatico.
- Nuova modalità release: test unitari fail-closed, OFF/ON e fallback; necessaria verifica in ambiente remoto isolato con progetto distinto prima di abilitare su produzione. L'attuale QA loopback non sostituisce questa prova. Nessun segreto o progetto reale nei test.
- Identificare e registrare SHA finale, progetto Supabase e Vercel corretti, deployment attuale e precedente stabile, versione CLI, elenco migrazioni già applicate, backup verificato e procedura di ripristino compatibile con il piano. Se non verificabili, stop.

## Sequenza migrazioni (solo dopo autorizzazione esplicita futura)
1. Con applicazione legacy/flag OFF, verificare cronologia e compatibilità schema sul target approvato. Escludere qualsiasi migrazione estranea o drift. Backup e prova di restore su ambiente isolato, nessun reset.
2. Applicare in ordine esclusivamente le migrazioni mancanti approvate: 20261127122235_structural_read_snapshots.sql (sette RPC); 20261127125108_course_calendar_read_snapshots.sql (due RPC, SHA256 552dfa8bef6b616c518a195795452e0c41bc12a04c6776b1e88c4092a36acf09). Verificare checksum dei file esatti e cronologia; nessuna modifica al contenuto. Non eseguire un push indiscriminato.
3. Verificare 9 funzioni STABLE SECURITY INVOKER, search_path vuoto, EXECUTE autenticati, nessun EXECUTE anon/PUBLIC, controllo staff o identità propria secondo RPC e RLS sottostanti. Verificare assenza di modifiche a tabelle/dati/trigger/policy e disponibilità API. Test non distruttivi con account autorizzati. Non usare service_role per simulare utenti.
4. Approvare deployment del candidato con flag OFF; verificare login/logout, navigazione per ruolo, dati e azioni essenziali, errori e compatibilità. Nessun deploy ora. Preview deve usare un database distinto, mai quello di produzione.

## Attivazione controllata
Il percorso locale esistente resta invariato. Il percorso remoto richiede contemporaneamente SC_STRUCTURAL_RPC=true, SC_STRUCTURAL_RPC_RELEASE=true, SESTO_TEST_MODE=false, QA_ISOLATED_ENV assente/false, SC_STRUCTURAL_RPC_RELEASE_ENV=preview oppure production coincidente con VERCEL_ENV e SC_STRUCTURAL_RPC_RELEASE_PROJECT_REF pari al ref esatto del progetto canonico HTTPS configurato in NEXT_PUBLIC_SUPABASE_URL. Non configurare questi valori ora. Nessun wildcard o endpoint custom. Le variabili release sono server-only. Non attivare il test mode per ottenere prestazioni. VERCEL_ENV deve essere fornito dal runtime; se assente, stop. I log diagnostici QA non sono attivi nella modalità remota.
- Primo collaudo remoto esclusivamente ambiente isolato: eseguire la matrice ON/OFF con dati sintetici e stessa build, verifica errori RPC e fallback, ricerca soci e isolamento account. Non alterare i controlli auth/RLS.
- Dopo autorizzazione e gate verde, predisporre un'unica pubblicazione coordinata: approvare il deployment finale con le variabili appropriate, controllare il comportamento con flag OFF prima dell'attivazione e usare il meccanismo di staging/promozione disponibile nel piano. Le modifiche alle variabili Vercel si applicano ai nuovi deployment: non sono un interruttore istantaneo sul deployment esistente.
- Monitorare esiti login, autorizzazioni, 5xx, RPC fallback, completezza dati e latenza delle cinque transizioni. Qualsiasi discrepanza dati, accesso non autorizzato o blocco delle mutazioni impone rollback; 50% non è condizione di stop. Definire baseline e finestra di osservazione prima del rilascio.

## Rollback
1. Preferire il ritorno immediato al deployment stabile identificato prima del rilascio (oppure al deployment candidato già verificato OFF). Se serve un nuovo deployment OFF, impostare SC_STRUCTURAL_RPC=false e SC_STRUCTURAL_RPC_RELEASE=false per il target, verificare che la nuova build sia OFF e promuovere soltanto previa autorizzazione. Non promettere disattivazione istantanea cambiando env.
2. Le due migrazioni sono additive di sola lettura: lasciare le funzioni installate durante il rollback applicativo, così da non interrompere richieste in corso e non ripristinare dati inutilmente. Verificare legacy e ACL. Non cancellare cronologia migrazioni.
3. Solo in caso di problema SQL e con autorizzazione specifica, predisporre nuova migrazione compensativa versionata che revoca/rimuove esclusivamente le nove firme dopo verifica dipendenze; test restore e compatibilità prima di applicare. Nessun DROP CASCADE, reset o restore integrale automatico.
4. Registrare motivo, tempi, SHA, deployment ripristinato, metriche aggregate e gate da ripetere. Non riportare PII, token o sessioni.

Stato: preparazione; non costituisce autorizzazione a pubblicare, attivare o migrare produzione. Tutti i gate del nuovo candidato e la QA remota isolata devono essere verificati.

## Evidenza preflight 27/11 — sola lettura
- Baseline online confermata dal dominio Vercel: commit ebe1085, READY; versione precedente 31a626c, READY e candidata rollback. Prima dell'eventuale rilascio riconfermare deployment e alias e registrare ID esatti in verbale operativo. Nessuna promozione o modifica Vercel.
- QA profiler 46005118090 verde su 7d5d389: -46.51% (2406.0→1287.0 ms), 123→33 chiamate HTTP su sei visite diagnostiche, nessun errore. CI/QA Incassi 46005346228 e 46005346174 verdi su 3cd1048: -47.31% (2414.7→1272.3 ms), 5/5 transizioni e 12/12 schermate, Incassi 981.5→343.2 ms. Artifact 15202037421 e 15202247400 scaricati e checksum SHA256 corrispondenti a GitHub. Non RUM.
- Storia Git: i due fix profiler sono equivalenti ma committati separatamente. La release consolidata 7d5d389 e il ramo Incassi sono divergenti. Il candidato di integrazione mantiene entrambi i genitori; il contenuto applicativo deriva da 63064a5, che contiene tutti i cambiamenti Incassi e il gate release. Nessun force push, nessun consolidamento su release prima della CI e QA del nuovo SHA.
- In Supabase è visibile un solo progetto, quello attualmente usato dal gestionale. Non è stato identificato un progetto remoto distinto: nessuna prova remote ON/OFF autorizzata o eseguita. Un ambiente di staging con dati sintetici e progetto distinto resta un gate da soddisfare; non usare il database di produzione come staging e non richiedere upgrade senza approvazione.

### Riconciliazione cronologia migrazioni: gate bloccante
Confronto in sola lettura: repository 29 versioni, database 19 versioni, 18 coincidenti. Versioni presenti nel repository ma non registrate con lo stesso ID remoto:
- 20261125223000_patch_0019.sql
- 20261126160000_registra_revisione.sql
- 20261126162500_proteggi_prenotazioni_parziali.sql
- 20261126163000_coerenza_lezioni_presenze.sql
- 20261126163410_dichiarazioni_verificate.sql
- 20261126163420_coerenza_direzione.sql
- 20261126171000_anteprima_importazione_atomica.sql
- 20261126172500_serializza_prenotazioni_guidate.sql
- 20261126213000_deroga_istruttori_corsi.sql
- 20261127122235_structural_read_snapshots.sql
- 20261127125108_course_calendar_read_snapshots.sql
Versione solo remota: 20261127091403_deroga_istruttori_corsi. Il nome coincide con una migrazione versionata diversamente nel repository, ma equivalenza SQL non attestata. L'assenza nella storia non implica assenza dello schema. Prima del rilascio: confrontare definizioni di funzioni/viste, trigger, colonne, vincoli e ACL effettivi con le modifiche previste; per eventuali DML richiedere evidenza dei dati o storico di applicazione, non inferirne l'esecuzione dal catalogo. Confrontare contenuto della versione remota con quella omonima. Documentare ciascun esito (equivalente, mancante, divergente, non verificabile), proporre una riconciliazione esplicita e collaudarla su ambiente isolato. Non eseguire migration repair, db push o DDL remoto in questa fase. Nessuna migrazione di produzione autorizzata.

### Osservabilità e prova di rollback
- La lettura aggregata Vercel runtime logs per livello sulla baseline, finestra 30 minuti, ha restituito una tabella senza gruppi. Questo non prova assenza di errori o traffico. Prima di pubblicare verificare che una richiesta sintetica autorizzata produca evidenza di metriche/log; se non disponibile, usare controllo browser e HTTP esterno con campioni documentati. Nessun cambio al piano.
- Misurare prima e dopo: esito login/logout e autorizzazioni per ruolo, codici HTTP/5xx, tempi di risposta e click→contenuto sulle cinque transizioni, completezza dati/filtri e mutazioni con fixture isolate. Registrare numero campioni, finestra e commit; non trattare assenza di eventi come zero errori.
- Il profiler HTTP e i marker correnti sono limitati alla QA; non costituiscono telemetria di produzione e non attestano un contatore remoto di fallback. Prima del GO verificare osservabilità dei fallback tramite test sintetici OFF/ON e guasti simulati su staging; se serve un contatore remoto, aggiungere strumentazione aggregata senza PII e testarla prima del rilascio. Non inviare parametri, URL, token, body, sessioni o dati soci ai log.
- Trigger di stop: qualsiasi accesso improprio, perdita o divergenza dati, mutazione non funzionante, errori 5xx ripetuti attribuibili al candidato, o peggioramento sostanziale rispetto alla baseline. Definire finestra e budget numerico con il coordinatore prima del GO. Rollback applicativo al deployment baseline o precedente verificato; mantenere migrazioni additive installate se sicure. Backup e restore remoto non attestati: nessuna prova con dati reali, nessuna operazione di ripristino in produzione.
