# Sesto Continente 3.0 — protocollo obbligatorio e registro regressioni
Data snapshot: 2026-11-26. Questo documento è un addendum vincolante al master prompt definitivo 3.0 (riferimento esterno) e alle sue sette fasi. Non sostituisce mockup, requisiti, o specifiche 2.0. In caso di conflitto sulle modalità di avanzamento prevale questo protocollo. **NO-GO F4** fino al coordinamento e al gate esteso F3.

## Regole permanenti
1. Conservare tutte le funzioni, autorizzazioni, validazioni, vincoli associativi, RPC, RLS, Storage, migrazioni e sicurezza. Separare presentazione e logica; nessuna modifica funzionale incidentale.
2. Fonte unica delle correzioni approvate: `release/gestionale-consolidato`. Prima di ogni fase congelare SHA della release e del 3.0, verificare piano di integrazione, PR, commit e CI sullo SHA esatto. Una PR verde ma non consolidata non è un'autorizzazione all'importazione. Mai importare rami non collaudati automaticamente.
3. Per ogni correzione consolidata: analizzare diff a tre vie, dipendenze, conflitti, migrazioni e test; trasferire solo il delta necessario, preservando il redesign e le altre correzioni. Non sostituire file interi senza analisi. Se il ramo si muove, riesaminare e non forzare il ref. Non trasferire redesign nel ramo release funzionale.
4. Conservare tutti i test funzionali e di regressione 2.0, trasferendo i test associati ai fix. Adattare solo asserzioni strutturali al layout, senza indebolire verifiche comportamentali, eliminare test o introdurre skip per rendere verde la CI. Registrare risultati e motivazioni.
5. Aggiornare questo registro e il tracker UI alla fine di ogni fase e a ogni sincronizzazione. Una CI non eseguita, saltata, parziale, fallita o riferita a un altro SHA non vale come superata. In caso di fallimento o coordinamento incompleto, interrompere avanzamento e risolvere regressioni; non dichiarare completato il gate.
6. Nessun merge su main, nuova PR se già esistente, deploy Vercel o modifica DB produzione. Test esclusivamente su dati sintetici e servizi isolati; non usare token, credenziali, storage o email reali. Conservare le regole di deployment esistenti.

## Gate obbligatorio per fase
Per lo SHA candidato registrare run, job e risultati; se una voce è non applicabile, motivarla con evidenza. La pipeline ordinaria e QA locale autenticata devono essere entrambe completate. Test browser desktop/mobile, manuale ove necessario, non solo controlli statici.
| Controllo | Evidenza richiesta |
|---|---|
| Sincronizzazione release | SHA release approvato, diff a tre vie, tracciabilità fix e test; nessuna correzione consolidata non verificata |
| Lint / TypeScript | Entrambi success |
| Test automatici / regressioni | Suite esistente più nuovi test, esito e numero; nessun test indebolito |
| Build Next.js | Success |
| Browser desktop / mobile | Chromium e WebKit, sessioni sintetiche, viewport desktop e mobile; flussi e layout pertinenti |
| Autenticazione / recovery | Login, registrazione, conferma, recupero email locale, callback, password, errori reali/falsi |
| Navigazione / logout | Tutti i ruoli (admin, segreteria, socio, istruttore, consigliere, richiedente; tutore e account particolari se previsti), desktop e mobile, revoca sessione e blocco accesso dopo uscita |
| CRUD | Inserimento, modifica, eliminazione o annullamento consentito; errori e rifiuti previsti, dirty form, conferme; verificare persistenza sul DB sintetico |
| RLS / RPC / Storage | Test positivi e negativi, isolamento utenti/ruoli, oggetti privati, vincoli e concorrenza |
| Migrazioni | Ordine canonico, applicazione ex novo e percorso di upgrade effimero, compatibilità, ripristino; nessuna esecuzione in produzione |
| Flussi già corretti | Tutte le righe del registro con test associati verificati sullo SHA candidato; collaudo delle parti impattate |
| Audit dipendenze | Nessuna vulnerabilità runtime alta/critica secondo gate esistente |

## Snapshot coordinamento
- 3.0: `8c2a3134e2865e8b788fddb0dffcf32e99800e57`, PR #6 bozza, base 2.0; F1–F3 preservate, F4 non committata.
- Release: `0cae9ebb7dfeb8bf41f17e082f6134d5ec99ad0f`, [piano di integrazione](https://github.com/segreteriasestocontinente/SestoContinente_gest/blob/release/gestionale-consolidato/docs/release/INTEGRATION_PLAN.md), stato dichiarato NO-GO; nessuna integrazione applicativa eseguita. Rispetto alla baseline 2.0: 2 ahead, 278 behind, divergenza; rispetto al 3.0: 2 ahead, 304 behind. Non è una baseline funzionale utilizzabile. Non importare ora.
- PR #3 (75b9781): CI 45898172285 success secondo piano coordinatore; correzioni ancora da analizzare/trasferire sul 2.0 consolidato. PR #5 (7493e8d): CI 45898643203 e 45898643074 success, non consolidata. PR #7 (d914e28): CI 45897939890 failure; non integrare. PR #8 (f136cbd): CI 45899125174 in corso al rilevamento, non integrare.
- Fix corsi/deroghe già sul 3.0 PR #6: snapshot concorrente 5491c14, corretto setup CI 8c2a313. Non rimuovere; da estrarre e approvare separatamente nel flusso release. Migrazione 20261126213000_deroga_istruttori_corsi.sql applicata solo nei test effimeri.
- PR #1/#2 storiche già merged, baseline 2.0 comprende le precedenti migrazioni: non riapplicare.

## Registro iniziale
Gli ID locali qui sotto identificano le segnalazioni ai fini del coordinamento; non sono numeri di issue GitHub. Una riga raggruppa solo correzioni dello stesso flusso. PENDING = non ancora verificata sul consolidato e sul 3.0; nessuna affermazione di assenza/presenza basata solo su file sovrapposti. Test elencati sono suite di origine da preservare; identificare i singoli casi quando si trasferisce il delta.
| ID | Bug / descrizione | PR e commit origine | Funzionalità | Test associati | Integrazione 3.0 | Ultima verifica |
|---|---|---|---|---|---|---|
| REG-001 | Calendario personale deve mostrare solo lezioni dei corsi propri; iscrizioni e paginazione coerenti | #3 75b9781 | Area personale / corsi | tests/v24-audit-regressioni.test.mjs, tests/v25-audit-flussi.test.mjs | PENDING confronto selettivo | PR3 CI verde, non consolidata |
| REG-002 | Callback redirect esterni/backslash; password con spazi e instradamento dopo login senza confondere errori e assenza di dati | #3 75b9781 | Auth e sicurezza | tests/v24-audit-regressioni.test.mjs, tests/v25-audit-flussi.test.mjs, tests/v26-audit-regressioni.test.mjs | PENDING coordinare #5/#7 | PR3 CI verde, non consolidata |
| REG-003 | Orari Europe/Rome, DST ambiguo/inesistente, date e messaggi non validi | #3 75b9781 | Calendario e form | tests/v24-audit-regressioni.test.mjs, tests/v26-audit-regressioni.test.mjs | PENDING confronto con 2.0 | PR3 CI verde |
| REG-004 | Deep link modifica con pagina/filtri obsoleti; modifica lezione atomica | #3 75b9781 | CRUD / calendario | tests/v24-audit-regressioni.test.mjs, tests/v25-audit-flussi.test.mjs | PENDING | PR3 CI verde |
| REG-005 | Ricerca certificati, filtro deep link, validità date prima di upload e cancellazione file temporaneo | #3 75b9781 | Certificati / Storage | tests/v24-audit-regressioni.test.mjs, tests/v25-audit-flussi.test.mjs, tests/v26-audit-regressioni.test.mjs | PENDING | PR3 CI verde |
| REG-006 | Validazione ID direttore, esclusione stesso corso, reset selettore, contatto emergenza troppo lungo | #3 75b9781 | Iscrizioni / corsi | tests/v15-gestione.test.mjs, tests/v24-audit-regressioni.test.mjs, tests/v25-audit-flussi.test.mjs | PENDING; preservare deroghe già presenti | PR3 CI verde |
| REG-007 | Avvisi prova solo in test; adesione e quota stagione attiva, saldi e conteggi esatti | #3 75b9781 | Domande, area personale, report | tests/v24-audit-regressioni.test.mjs, tests/v25-audit-flussi.test.mjs | PENDING | PR3 CI verde |
| REG-008 | Presenze e note esistenti, nuova scelta esplicita, documenti istruttori assegnati | #3 75b9781 | Istruttori e presenze | tests/v25-audit-flussi.test.mjs | PENDING | PR3 CI verde |
| REG-009 | Neutralizzazione CSV formula anche dopo spazi/controlli | #3 75b9781 | Esportazione | tests/v25-audit-flussi.test.mjs | PENDING | PR3 CI verde |
| REG-010 | Recupero password da Accedi, alias, email normalizzata, errori non enumeranti; falso errore login da verificare con coordinatore | #5 7493e8d | Auth | tests/v29-public-auth.test.mjs, tests/v25-audit-flussi.test.mjs, scripts/qa-local-auth.mjs | PENDING; non importare direttamente | CI #5 success, non consolidata |
| REG-011 | Logout e funzioni account comuni, home per ruolo, cambio password e notifiche proprie | #7 f99564f | Shell / account / notifiche | tests/account-common-navigation.test.mjs, tests/browser/roles.spec.mjs, scripts/qa-local-supabase.mjs | In attesa del coordinamento release | 45900175385 e 45900175348 success. 36 logout verificati, nove account × Chromium/WebKit × desktop/mobile, con accesso a /notifiche respinto dopo l’uscita. |
| REG-012 | Registrazione componenti CdA, validazione, errori, conferma e quadriennio | #8 f136cbd | Organi sociali | tests/cda-componenti-save.test.mjs, tests/browser/staff.spec.mjs, tests/browser/roles.spec.mjs | PENDING | 45899125174 in corso |
| REG-013 | Pannelli centrati, gruppi responsive, conferme distruttive e focus | #8 f136cbd | Drawer/EditForm condivisi | tests/browser/public.spec.mjs, tests/browser/staff.spec.mjs, tests/browser/roles.spec.mjs | PENDING, riconciliare layout mockup 3.0 | 45899125174 in corso |
| REG-014 | Direttore, responsabile e aiuti leggibili; qualificati esclusi di default; deroga motivata e incompatibilità nella stessa edizione | #6 5491c14 + 8c2a313 | Corsi, selettori, SQL/RPC/RLS | tests/v48-course-instructor-override.test.mjs, tests/v31-course-redesign.test.mjs, scripts/test-redesign-postgres.cjs | PRESENTE; non ancora approvata nel release, estrazione separata necessaria | 45899245776 ordinaria success |
| REG-015 | Setup CI ometteva migrazione deroga, test strutturali/mocks non aggiornati | #6 8c2a313 | CI e test | tests/phase32.test.mjs, tests/v15-gestione.test.mjs, tests/v31-course-redesign.test.mjs, tests/v43-release-gates.test.mjs, scripts/test-redesign-postgres.cjs | PRESENTE | 45899245776 success |

## File sovrapposti (confronto per nome; non equivale a conflitto testuale)
- PR3 ↔ 3.0 (8): .github/workflows/verify.yml, app/area-personale/corsi/page.tsx, app/gestionale/corsi/actions.ts, app/gestionale/corsi/page.tsx, app/gestionale/moduli/[modulo]/page.tsx, app/module-actions.ts, components/EligibleEnrollmentSelect.tsx, tests/v15-gestione.test.mjs. Inoltre PR3/5 condividono app/actions.ts e test auth: analizzare insieme.
- PR5 ↔ 3.0: nessun file cambiato in comune rispetto alla base 2.0; dipendenza funzionale auth/shell, non dedurre compatibilità.
- PR7 ↔ 3.0 (5): components/AppShell.tsx, components/SiteHeader.tsx, lib/navigation-access.ts, lib/navigation.ts, tests/browser/roles.spec.mjs. Conservare saluto, ricerca con scope, navigazione per ruolo e correggere solo le funzioni account approvate.
- PR8 ↔ 3.0 (4): components/EditForm.tsx, tests/browser/public.spec.mjs, tests/browser/roles.spec.mjs, tests/browser/staff.spec.mjs; verificare inoltre cascata CSS e compatibilità Drawer. Non perdere i gruppi anagrafici e sticky actions; unire asserzioni.
- PR7 ↔ PR8: tests/browser/roles.spec.mjs. Nessun overwrite.
- Aggiornare snapshot quando il coordinatore rende disponibile la release effettivamente consolidata; non effettuare merge su release in questa chat.

## Gate F3 — stato iniziale
| Controllo | Esito su 8c2a313 |
|---|---|
| CI ordinaria 45899245776 | Entrambi i job success |
| Lint / TypeScript / build | Success |
| Test automatici | 258/258, 0 fail, 0 skip |
| Browser CI ordinaria | 66 passati, Chromium/WebKit, pagine pubbliche e accessi negati non autenticati; matrice autenticata non eseguita |
| DB effimero / RLS / deroga / ripristino | Success |
| Audit dipendenze | Success |
| Login/recovery email locale, logout per tutti i ruoli, CRUD UI, Storage JWT, browser autenticato | NON VERIFICATI su questo SHA; workflow locale 3.0 da avviare e verificare |
| Coordinamento release | NON COMPLETATO |
| Gate esteso | NO-GO |

Modifica di processo: esteso workflow QA Supabase locale al ramo 3.0, con verifica logout desktop/mobile per ogni account sintetico prima di generare gli stati riutilizzabili. Conservate verifiche browser, CRUD, auth, Storage/RPC/RLS e benchmark già previste; nessun test rimosso. Nuovo commit di protocollo richiede nuova CI; non ereditare come gate completo l'esito del commit precedente. Non avviare F4 fino al coordinamento e gate effettivo.

## Verifica della ricerca globale e coordinamento funzionale
Sul 3.0 a 5205ba2, CI ordinaria 45899921780 verde. QA 45899921809 fallita in quattro casi Chromium: Esc da un campo di ricerca compilato lasciava aperto il dialog per segreteria, socio, istruttore e consigliere. Il dialog gestisce ora Esc esplicitamente e ripristina il focus con la procedura di chiusura esistente. Conservate le asserzioni Playwright. Ripetere i due workflow sul commit della correzione.

Sul ramo sorgente della PR #7, 238 test automatici, 64 browser ordinari, 146 browser nella matrice autenticata. Verificati salvataggi, email e benchmark locali. Il piano release registra il trasferimento selettivo della PR #3 (910f89c) e l’integrazione delle PR #5 e #8. La verifica della PR #7 abilita il lavoro del coordinatore; F4 resta bloccata fino alla sincronizzazione approvata e al gate sul candidato risultante.

## Sincronizzazione release funzionale approvata — 26 novembre 2026
- Base comune 20ae6fc, release 302e9e995e2479344cde33777c66d34b4e7174e3, redesign precedente a59469a4edf591ec8e8cdae8f9947f560d5368c6. CI release 45905569811 e QA 45905569823 entrambe success; 261 test statici e 66 browser ordinari verificati, gate locale autenticato completo. Deroga confermata e integrata tramite #10; nessuna modifica a produzione.
- REG-001–010: trasferiti i file auth, certificato, smista, sicurezza e test della release; preservate le pagine 3.0 non coinvolte. REG-011: uniti logout diretto e menu, notifiche senza anagrafica, home e cambio password, conservando nome del titolare, ricerca, nav mobile e sidebar. REG-012/013: importati fix CdA, Drawer e CSS; EditForm unisce feedback validazione/redirect dopo salvataggio con apertura dettagli e focus 3.0. REG-014: migrazione e principali file corsi identici; delta nel modulo generico già presente, mantenuti gruppi segreteria 3.0. REG-015: workflow uniti, QA 45 min; conservati test statici e browser di entrambe le versioni, logout diretto e menu su Chromium/WebKit e viewport desktop/mobile, rifiuto accesso a pagine protette e mutazione deroga.
- Metodo: albero 3.0 + 29 blob esclusivi release, 16 comuni identici, 12 divergenti riconciliati (modulo generico già contiene delta), CSS shell adattato al logout mobile; nessuna rimozione intenzionale di test. Vedere docs/release/REGRESSION_TRACKER.md per tracciabilità delle correzioni. Nuovo candidato da collaudare: REG-001–015 trasferiti, **verifica integrata ancora PENDING**. F4 NO-GO fino a conclusione di entrambe le pipeline sul nuovo SHA. Nessun merge su main, deploy o SQL reale.

## Gate F3 sincronizzato — GO alla Fase 4
Commit ff356d1: verifica gestionale 45906661406 success (280/280 test automatici, 68/68 browser, build, DB, RLS, ripristino, audit). QA 45906661502 tentativo 1 fallita al comando supabase start, dettagli non conservati per protezione credenziali; tentativo 2 success sul medesimo SHA senza modifiche, 166 browser autenticati, 36 logout diretti + 36 da menu, CRUD, auth, Storage e benchmark superati. Resta non determinata la causa infrastrutturale del primo tentativo. Gate F3 GO su ff356d1. F4A: presentazione corsi, vista schede/tabella e prossime lezioni senza nuove scritture, test aggiunti; gate nuovo SHA obbligatorio, non avviare F4B prima del risultato. Nessun deploy o SQL reale.
