# Audit funzionale 3.2 — registro incrementale
Data 2026-11-27. Stato APERTO / NO-GO per una nuova release. Non certifica la produzione.
Baseline Vercel READY `a615d3982422a881d6337089e9986097191a8209`, alias sesto-continente-gest-lime.vercel.app verificato sul deployment dpl_6aPEx8Qfj4Q6e7zy1NQcJcHxg5ba. Branch audit/3.2-functional. PR di riferimento #12 (non merge). Il precedente hotfix 38e27a88 è antenato (19 commit avanti, zero dietro); main 5444519 è 509 commit indietro. Versione package 0.3.2. Nessun deploy automatico Git in vercel.json.
## Inventario verificato via albero Git non troncato
464 file; 57 pagine, 8 route handler, 2 layout, 48 componenti TSX, 56 file di test statici, 29 migrazioni repository. Route dinamiche e azioni server richiedono ulteriore enumerazione; questo non è un censimento delle funzionalità esercitate.
| File | Tipo | QA nuova | Evidenza |
|---|---|---|---|
| `app/accedi/page.tsx` | pagina | PENDING | inventario Git |
| `app/area-personale/certificato/page.tsx` | pagina | PENDING | inventario Git |
| `app/area-personale/corsi/page.tsx` | pagina | PENDING | inventario Git |
| `app/area-personale/documenti/page.tsx` | pagina | PENDING | inventario Git |
| `app/area-personale/page.tsx` | pagina | PENDING | inventario Git |
| `app/area-personale/profilo/page.tsx` | pagina | PENDING | inventario Git |
| `app/area-soci/page.tsx` | pagina | PENDING | inventario Git |
| `app/comunicazioni/corsi/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/comunicazioni/soci/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/documenti/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/amministrazione-dati/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/archivio-incassi/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/attrezzature/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/calendario-visivo/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/calendario-visivo/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/corsi/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/corsi/nuovo/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/corsi/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/economia/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/importazione/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/incassi/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/incassi/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/incassi/posizione/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/moduli/[modulo]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/moduli/attrezzature/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/moduli/consegne/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/moduli/contabilita/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/moduli/iscrizioni/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/moduli/piscine/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/moduli/revisioni/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/programmi-didattici/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/report/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/richieste/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/richieste/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/soci/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/soci/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/utenti/[id]/elimina/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/utenti/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestionale/utenti/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestione-eventi/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/gestione-eventi/page.tsx` | pagina | PENDING | inventario Git |
| `app/istruttore/page.tsx` | pagina | PENDING | inventario Git |
| `app/notifiche/page.tsx` | pagina | PENDING | inventario Git |
| `app/nuova-password/page.tsx` | pagina | PENDING | inventario Git |
| `app/organi-sociali/archivio/[id]/page.tsx` | pagina | PENDING | inventario Git |
| `app/organi-sociali/archivio/page.tsx` | pagina | PENDING | inventario Git |
| `app/organi-sociali/page.tsx` | pagina | PENDING | inventario Git |
| `app/organi-sociali/riepilogo/page.tsx` | pagina | PENDING | inventario Git |
| `app/page.tsx` | pagina | PENDING | inventario Git |
| `app/registrati/informativa-test/page.tsx` | pagina | PENDING | inventario Git |
| `app/registrati/page.tsx` | pagina | PENDING | inventario Git |
| `app/richiesta/documenti-test/page.tsx` | pagina | PENDING | inventario Git |
| `app/richiesta/nuova/page.tsx` | pagina | PENDING | inventario Git |
| `app/richiesta/stato/page.tsx` | pagina | PENDING | inventario Git |
| `app/smista/page.tsx` | pagina | PENDING | inventario Git |
| `app/api/cron/promemoria/route.ts` | handler | PENDING | inventario Git |
| `app/auth/callback/route.ts` | handler | PENDING | inventario Git |
| `app/documenti/[id]/route.ts` | handler | PENDING | inventario Git |
| `app/gestionale/corsi/[id]/stampe/route.ts` | handler | PENDING | inventario Git |
| `app/gestionale/esporta/[modulo]/route.ts` | handler | PENDING | inventario Git |
| `app/gestionale/importazione/modello/route.ts` | handler | PENDING | inventario Git |
| `app/gestionale/incassi/person-options/route.ts` | handler | PENDING | inventario Git |
| `app/organi-sociali/documento/[id]/route.ts` | handler | PENDING | inventario Git |
| `app/gestionale/layout.tsx` | layout | PENDING | inventario Git |
| `app/layout.tsx` | layout | PENDING | inventario Git |
## Matrice ruoli
Enum produzione: amministratore, segreteria, istruttore, socio, tutore, consigliere_cda. Richiedente, anonimo, sospeso/non approvato/incompleto e ruoli combinati sono stati separati come scenari (non nuovi ruoli). I permessi esatti vanno derivati da guardie server, policy e flussi; non assumere accesso sulla base di questa tabella.
| Scenario | Accesso consentito da verificare | Accessi negativi | Stato |
|---|---|---|---|
| Anonimo | pubbliche, signup, login, recupero | dati privati, API, URL protette | PENDING |
| Richiedente | richiesta e stato | sezioni riservate ai soci/staff | PENDING |
| Amministratore | account e amministrazione, funzioni comuni | vincoli business anche da admin | PENDING |
| Segreteria | soci, richieste, corsi, operazioni autorizzate | azioni esclusivamente admin | PENDING |
| Istruttore | corsi assegnati, presenze e profilo | altri corsi e dati non autorizzati | PENDING |
| Socio | profilo, eventi, corsi e documenti propri | altri soci, staff, API | PENDING |
| Tutore | perimetro del tutelato autorizzato | terzi e azioni oltre delega | PENDING (gap suite esistente) |
| Consigliere CdA | organi sociali e verbali autorizzati | mutazioni riservate staff | PENDING |
| Ruoli combinati | unione dei permessi legittimi | escalation e bypass vincoli | PENDING |
| Sospeso / non approvato / incompleto | solo azioni previste per lo stato | sessione stale e URL dirette | PENDING |
## Registro rilievi (non tutti sono bug confermati)
| ID | Priorità provvisoria | Evidenza / causa da approfondire | Stato |
|---|---|---|---|
| AUD-001 | rischio release | main 509 commit dietro produzione | aperto, nessun merge |
| AUD-002 | alta verifica | 29 file SQL vs 20 versioni registrate; upgrade unico e SQL hotfix possono spiegare divergenze, non applicare per differenza numerica | aperto |
| AUD-003 | alta verifica | Supabase default branch MIGRATIONS_FAILED; progetto ACTIVE_HEALTHY; nessun branch di test visibile | aperto |
| AUD-004 | informativo | cda_letture RLS senza policy: patch 0019 revoca accesso diretto e usa funzioni privilegiate; comportamento previsto da verificare con ACL live e test voto/lettura | triage, non aggiungere policy |
| AUD-005 | sicurezza | 15 SECURITY DEFINER con EXECUTE anon: 14 restituiscono trigger, 1 is_board boolean; privilegio non dimostra exploit | triage ACL / guardie |
| AUD-006 | sicurezza | 79 SECURITY DEFINER con EXECUTE authenticated; rivedere scope e guardie singole | aperto |
| AUD-007 | bassa | btree_gist in public; valutare dipendenze, non spostare arbitrariamente | aperto |
| AUD-008 | gap test | workflow autenticato esistente non include progetto tutore, né dimostra copertura combinazioni/stati | aperto |
## Controlli produzione in sola lettura, nessun dato personale
54 tabelle public, tutte RLS abilitate. Conteggi: 0 gruppi edizioni duplicate (corso/stagione/nome lower trim/inizio), 0 gruppi iscrizioni duplicate (edizione/persona), 0 join direttore/allievo. Indice unico edizione_identita su corso, stagione, inizio, fine, nome normalizzato con esclusione duplicato_storico; indice unico iscrizione edizione/persona. Non dimostrano concorrenza o assenza di duplicati secondo tutte le regole.
### Migrazioni
| File repository | Versione identica nello storico live |
|---|---|
| `20261111210100_fase1.sql` | sì |
| `20261111210200_gestionale_completo.sql` | sì |
| `20261111210300_schede_soci.sql` | sì |
| `20261111210400_corsi_guidati.sql` | sì |
| `20261111210500_calendario_economico.sql` | sì |
| `20261111210600_incassi_controllati.sql` | sì |
| `20261116100700_ruolo_cda.sql` | sì |
| `20261116100800_v12_sicurezza_organi_didattica_import.sql` | sì |
| `20261116100900_precaricamento_didattica.sql` | sì |
| `20261116101000_v12_riepilogo_cda_certificati.sql` | sì |
| `20261117190000_archivio_cda_anagrafica.sql` | sì |
| `20261117201500_corsi_rimozione_quote_attive.sql` | sì |
| `20261117210000_iscrizioni_rimozioni_ordinamento.sql` | sì |
| `20261117223000_area_soci_eventi.sql` | sì |
| `20261117234500_amministrazione_account_dati.sql` | sì |
| `20261118001500_eliminazione_completa_account.sql` | sì |
| `20261118004000_fix_ambiguita_eliminazione_account.sql` | sì |
| `20261118090000_comunicazioni_email.sql` | sì |
| `20261125223000_patch_0019.sql` | no — verificare oggetti e upgrade unico |
| `20261126160000_registra_revisione.sql` | no — verificare oggetti e upgrade unico |
| `20261126162500_proteggi_prenotazioni_parziali.sql` | no — verificare oggetti e upgrade unico |
| `20261126163000_coerenza_lezioni_presenze.sql` | no — verificare oggetti e upgrade unico |
| `20261126163410_dichiarazioni_verificate.sql` | no — verificare oggetti e upgrade unico |
| `20261126163420_coerenza_direzione.sql` | no — verificare oggetti e upgrade unico |
| `20261126171000_anteprima_importazione_atomica.sql` | no — verificare oggetti e upgrade unico |
| `20261126172500_serializza_prenotazioni_guidate.sql` | no — verificare oggetti e upgrade unico |
| `20261126213000_deroga_istruttori_corsi.sql` | no — verificare oggetti e upgrade unico |
| `20261127122235_structural_read_snapshots.sql` | no — verificare oggetti e upgrade unico |
| `20261127125108_course_calendar_read_snapshots.sql` | no — verificare oggetti e upgrade unico |
Versioni live ulteriori: 20261127091403 deroga_istruttori_corsi; 20261127163939 elimina_edizione_annullata_vuota. Mai eseguire migrazioni mancanti basandosi sul solo nome.
## Gate storici (non esecuzioni nuove)
- [46062535748](https://github.com/segreteriasestocontinente/SestoContinente_gest/actions/runs/46062535748): job test e database success, inclusi lint, TS, statici, build, browser pubblico, audit dipendenze, RLS/integration, hotfix e ripristino.
- [46062535755](https://github.com/segreteriasestocontinente/SestoContinente_gest/actions/runs/46062535755): compare success, browser autenticato, mutazioni, auth, screenshot, cleanup visuale e benchmark OFF/OFF. Artifact metadata disponibili; contenuti binari non ispezionati.
## Matrice copertura incrementale
| Gruppo | Gate baseline storico | Nuova esecuzione | Estensioni richieste |
|---|---|---|---|
| Auth / account | success | pending | session expiry, logout effettivo, tutore, combinazioni |
| Soci / adesioni / privacy | success aggregato | pending | rinnovi, revoche, concorrenza |
| Corsi / iscrizioni / didattica | success aggregato | pending | fine-to-end, duplicati e deroga |
| Calendario / eventi | success aggregato | pending | fusi, conflitti, annullamento |
| Attrezzature / revisioni / inventario | success aggregato | pending | mutazioni, restituzione, errori |
| Economia / incassi / quote | success aggregato | pending | saldi, rettifiche, idempotenza |
| CdA / documenti | success aggregato | pending | lettura, voto, ACL e download |
| Notifiche / comunicazioni | success aggregato | pending | lettura, duplicati, email sink |
| Import/export / amministrazione | success aggregato | pending | permessi, dataset, atomicità |
| Browser / responsive / prestazioni | success aggregato | pending | OFF/OFF vs a615d39, casi limite |
## Vincoli e ripresa
Ramo isolato; nessun merge, deploy, reset o modifica database live, no dati reali, nessun upgrade, SC_STRUCTURAL_RPC=false e SC_STRUCTURAL_RPC_RELEASE=false. Usare Supabase locale effimero in CI, fixture sintetiche e sink email. Non creare policy/DDL senza riproduzione, non indebolire test. Prossimo: nuova QA autenticata e benchmark sulla baseline, ispezionare ACL effettive e migrazioni, estendere matrice, riprodurre bug e aggiungere test prima del fix. Ogni gate non osservato resta PENDING. Nessun bug funzionale nuovo confermato o corretto in questo avvio; nessuna idoneità alla release.

## Ciclo 2 — evidenze 27 novembre 2026
- CI 46078537867 su 8494995: conclusione success (database, lint, TS, statici, build, browser pubblico, audit dipendenze).
- QA 46078537950: in_progress alla verifica; nessuna conclusione attribuita.
- AUD-001: ramo audit separato, PR #13 base esatta 3.2; main non consolidato per scelta conservativa.
- AUD-002: 16/16 funzioni previste dall'upgrade 2.0 presenti e corpo normalizzato uguale; 5/5 trigger previsti presenti, abilitati e associati alla funzione corretta; due trigger di coerenza direzione deferrable/deferred come atteso. 0 funzioni sc_perf_% in produzione. Storico non equivale a schema mancante.
- AUD-003: stato MIGRATIONS_FAILED della branch di default da riconciliare separatamente; non intervenire sul DB live.
- AUD-004: ACL dirette negate a anon/authenticated su cda_letture, funzione di attestazione lettura non eseguibile da tali ruoli; accesso server documentato. Non è bug di policy; test voto/lettura rimane aperto.
- AUD-005: 14/15 trigger; is_board controlla account abilitato e auth.uid(). Nessun exploit dimostrato.
- AUD-006: 65 funzioni SECURITY DEFINER non-trigger eseguibili da authenticated, tutte con search_path fissato. Le 8 senza guardia sintattica diretta sono state lette: 6 usano guardie indirette; documento_sanitario e percorso_sanitario sono predicati usati per proteggere documenti/Storage, da approfondire per possibile divulgazione della classificazione di un ID/percorso noto. Nessuna prova di abuso o modifica SQL in questo ciclo.
- AUD-007: btree_gist in public, 264 oggetti membro; hardening non necessario senza analisi dipendenze.
- AUD-008: aggiunto scripts/qa-audit-functional.mjs, esecuzione nel workflow isolato prima delle mutazioni; tutore, selezione certificati propria/rappresentata, accessi vietati, combinazione tutore+segreteria+CdA e revoca in sessione, account sospeso con sessione stale, 28 archivi CRUD e 10 route amministrative su Chromium/WebKit, export/API negative, RPC OFF. Nessun test precedente rimosso; nuovi test da eseguire e verificare. Non equivale a copertura di ogni combinazione o mutazione.

## Ciclo 3 — AUD-006 e mutazioni
- Pipeline 46078864643: entrambi i job conclusi success; 46078537950 ancora in esecuzione (sessioni/browser autenticati); 46078864647 senza job disponibile al controllo.
- AUD-006: conferma dal codice e dal catalogo live, in sola lettura, che documento_sanitario(uuid) e percorso_sanitario(text) sono SECURITY DEFINER accessibili ad authenticated senza verifica diretta di titolarità. Le policy SELECT di documenti/Storage ne dipendono; la route download usa documento_sanitario solo dopo verifica metadata. Possibile oracle di classificazione di UUID/percorso già noto, non prova di accesso ai byte.
- Candidato SQL docs/audit-3.2/AUD006_CANDIDATE.sql: sposta i classificatori interni in schema non esposto, conserva OID delle policy, aggiorna riferimenti interni e mantiene una RPC pubblica compatibile e autorizzata. Non è migrazione applicata o pronta per produzione. In CI viene generata con CLI e applicata esclusivamente al DB locale dopo benchmark, con verifica prima/dopo su fixture sintetiche (RPC, RLS, Storage, download autorizzato, immutabilità metadata e schema non esposto). Prima di promuovere occorre verificare configurazione Data API target e generare migrazione canonica con evidenze positive. Non applicare al DB live.
- Nuovo script qa-audit-mutations.mjs: eventi creazione/modifica/annullamento, grant/revoca ruoli via UI con sessione attiva, nomina CdA e durata mandato, persistenza e isolamento. Eseguito dopo benchmark per non alterare dataset di carico. Test nuovi non ancora osservati; possibili errori di selettori/fixture da distinguere da bug applicativi.
- Nessun bug dichiarato risolto prima della riproduzione e dei gate. Nessun deploy, merge, upgrade, reset o modifiche produzione; RPC prestazionali OFF.

### Gate dedicato AUD-006
Spostata la riproduzione prima/dopo in workflow indipendente `.github/workflows/audit-medical.yml` per non attendere la coda del benchmark OFF/OFF e per isolare completamente lo schema candidato. Usa seed sintetico, login browser autonomo e solo Supabase locale; non modifica il database del benchmark. La QA complessiva mantiene le nuove mutazioni dopo il benchmark per preservare il dataset. Strategia schema non esposto coerente con documentazione ufficiale Supabase: https://supabase.com/kb/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw . Stato candidato ancora non validato.

## Ciclo 4 — validazione e consolidamento
- QA 46078537950 (8494995): success integrale; 188 test browser autenticati pass, 10 skip condizionali; login/logout, mutazioni, auth, visuali e cleanup, benchmark OFF/OFF. 44 gruppi visuali × 5 viewport (220 screenshot privati secondo log); archivi ZIP disponibili, contenuti pixel non ispezionati. Artifact 15236635088 private, 15235009756 public, 15236139191 benchmark.
- Benchmark 40 ms RTT, 12 route + 5 transizioni, 9 campioni per scenario; somma mediane content-ready navigazione 1803.9 -> 1800.4 ms (-0.19%), 3/5 transizioni migliorate; rumore, nessun obiettivo di accelerazione attribuito al ramo di audit. Nessun marker RPC strutturale.
- CI 46079202936 (e0c30c0): 341/341 statici, 70 browser pubblici, lint, TS, build, database, restore: success. QA estesa 46079202933 in corso.
- AUD-006: gate 46079202987 job 140773972856 success; log 22:54:37 UTC REPRODUCED e PASS. Classificazione di UUID/percorso sanitario noto da utente estraneo riprodotta con documenti sintetici, metadata e contenuto negati. Dopo fix: classificazione estranea negata, schema non esposto, route autorizzate, RLS, Storage ordinario e immutabilità conservati. Bug confermato e fix validato in laboratorio, NON applicato al live.
- Promosso file esatto generato dal CLI nel gate: supabase/migrations/20261127225433_audit006_private_medical_classification.sql. SQL identico byte per byte al candidato. Gate replay sposta temporaneamente la migrazione fuori dalla directory nel runner isolato per ricreare lo stato vulnerabile, poi applica lo stesso file canonico; QA full e nuovo gate mutazioni partono da schema con migrazione inclusa. Verify database applica anche la migrazione prima del restore. Benchmark applicativo successivo confronta i due build sul medesimo schema consolidato, non misura overhead della migrazione rispetto al DB live.
- Gate mutazioni indipendente dal benchmark, con seed e login autonomi; aggiunti creazione/modifica piscina, creazione corsia e rifiuto duplicato, form guidato corso con duplicato normalizzato e link originale. Nuovi test non ancora validati.
- Preflight live non invasivo: nessun override pgrst.db_schemas trovato nel catalogo pg_db_role_setting per authenticator; non è prova della configurazione hosted. Prima di eventuale rilascio verificare Data API e assenza esposizione sesto_internal. No-go fino a gate completi e approvazione.

## Ciclo 5 — risultati e correzioni dei gate
- 46079873280: database success (migrazione AUD-006 + restore); test 340/341, unico fallimento inventario migrazioni F5_CLOSURE.md. Aggiunto riferimento reale e dettagli preflight/rollback, senza cambiare il gate. Restore esteso a funzioni e ACL dello schema interno.
- 46079873318: REPRODUCED/PASS AUD-006 sulla migrazione ufficiale (23:02:19 UTC). 46079873336: cinque gruppi mutazioni reali superati (eventi, ruoli, CdA, piscine/corsie e duplicato corso). Installazione locale comprensiva del fix superata; live invariato.
- 46079202933 e 46079873284: Chromium/WebKit hanno completato gli archivi e le route, ma WebKit ha generato eccezioni Fetch API cannot load http, rilevate a fine sweep. AUD-009 aperto: causa non ancora dimostrata (possibile cancellazione prefetch durante goto); non classificare come falso positivo. Conservato assert zero eccezioni, aggiunta attribuzione route/fase, requestfailed e stack sanificato senza query, attesa di stabilizzazione rete prima della navigazione successiva e verifica interattiva sidebar. Nessuna modifica al codice applicativo né esclusione di errori. Nuova CI necessaria per classificazione.
- Mutazioni aggiuntive: tentativo cancellazione piscina con corsia collegata, verifica record invariati, cancellazione corsia e piscina, concorrenza due browser per creare identità normalizzata corso con un solo vincitore e link originale al perdente. Test da validare, esclusivamente sintetici.
- AUD-001–005/007: nessuna nuova evidenza di bug applicativo; disallineamenti storici e preflight hosted restano aperti, voto/lettura CdA non ancora esercitato end-to-end. AUD-008: copertura ampliata e flussi precedenti positivi, non chiuso; AUD-009 blocca QA estesa. RPC OFF; nessun deploy, merge, upgrade o scrittura live.
