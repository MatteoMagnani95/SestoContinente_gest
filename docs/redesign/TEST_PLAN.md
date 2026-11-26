# Gestionale Sesto Continente 2.0 — Fase 0
Data: 2026-11-26. Base esatta: `ea97e2663a3999527b2e3f868c19dfd5b4f646eb`. Ramo: `feature/gestionale-2.0-redesign`.
Nessun merge, modifica applicativa o SQL produzione in questa fase.

# TEST_PLAN
## Baseline osservata, non rieseguita
GitHub Actions al commit ea97e2663a3999527b2e3f868c19dfd5b4f646eb: [45800874698](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45800874698), [45800866450](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45800866450), success. Workflow Node 22: npm install --no-package-lock --no-audit --no-fund, npm run typecheck, npm run test:static, npm run build (prebuild check:source e test:cf-data). Vercel status success. Non sono prove E2E o live. package.json non ha lint script e non è presente lockfile nell'albero: valutare lockfile e CI riproducibile senza cambi dipendenze indiscriminati. Workflow push solo fix/** o PR: prima del codice estendere a feature branch oppure draft PR autorizzata; nessun merge.

## Matrice da eseguire, non eseguita in F0
| ID | Scenario | Esito atteso |
|---|---|---|
| T-06.* | Tutte le route staff, deep link e refresh, back con filtri, dialogo dirty, browser back e beforeunload | shell/attivo coerenti, ritorno sicuro, nessuna perdita o falsi positivi |
| T-07.* | Crea/modifica/annulla, errore client/server, doppio invio, focus, eliminazione | nessun form in td, stato preservato, conferma e risultato reale |
| T-08/09/10.* | Anonimo, signup, verifica email, login/logout/reset, password spazi, redirect, consensi e revoca, minori | auth corretta, no consenso presunto, nessun messaggio di prova prod |
| T-11–15 | Domande oltre 100, ricerca, idoneità, soci/famiglia, certificati, dichiarazioni, KPI | conteggi esatti e scope, sezioni vere, dati storici preservati |
| T-16 | Ultimo posto richiesto simultaneamente | capienza preservata, risposta deterministica |
| T-17/24/25 | Versamento parziale/completo e doppio invio, simultanei, rettifica, categorie, CSV injection, report 12 mesi | contabilità e residui coerenti, no duplicato, export sicuro |
| T-18/19.* | Duplicati, direttore allievo, capienza simultanea, qualifiche, programma, presenze, stampe | invarianti DB e storico; nessun default presenza |
| T-20/21.* | Nuova lezione dal calendario, teoria/piscina, sovrapposizione, DST Europe/Rome, ritorno filtri | RPC atomica, conflitti respinti, nessun orario ambiguo |
| T-22.* | DOCX, voto parallelo, quorum, versione approvata, sostituzione, adesioni | originale e immutabilità; solo aventi diritto |
| T-23.* | Upload/download/anteprima privati, URL e visibilità; accesso incrociato | RLS/storage impediscono accesso indebito |
| T-26–28 | Codice unico, revisioni ripetute/storiche, prestito simultaneo, restituzione | stato e revisione coerenti; no cancellazione automatica |
| T-29.* | Ruolo esplicito, escalation, ultimo admin, multi-persona, eliminazione con dipendenze | enforcement server/DB, audit |
| T-30/31 | Conteggi oltre limiti, 7–90 giorni, quote fuori orizzonte, letto vs risolto, cron | totali e filtri espliciti, no invii reali o dupliche |
| T-32–35 | Import dry run, stagioni, certificati, area socio/istruttore/richiedente | dati sintetici, autorizzazioni e flussi conservati |
| T-36/37 | 320,375,390,430,768,1024,1280,1440,1920; landscape; zoom, tastiera, screen reader, contrasto, reduced motion | no overflow globale, navigazione, focus e target; distinguere Safari reale/emulato |
| T-38 | Anonimo, socio A/B, tutore, istruttore, responsabile eventi, consigliere, segreteria, admin; IDOR, RLS, storage, export, race | matrice allow/deny server e DB; nessun PII in log |
| T-39–44 | Build, typecheck, lint se configurato, unit/integration/E2E, migrazioni 0019 e successive in staging, rollback, preview | nessuna regressione bloccante; autorizzazione prima del merge |

## Ambiente
Usare Supabase separato, utenti sintetici, mail sink, cron disabilitato o isolato, preview con variabili non produttive. Esistono npm run test:rls e npm run test:patch19, non lanciare contro produzione. Eseguire test su DB locale/staging; verificare script e parametri prima. Registrare SHA, comando, data, output, ambiente, esito e screenshot dove disponibili. Non segnare verificato sulla base di sola lettura.

## T-05 — Fase 1
Eseguire `node --test tests/v26-design-system.test.mjs` e la CI completa. Test palette esatta, contrasto >=4.5:1 per coppie testo/sfondo, >=3 per focus/bordi, semantica minima, integrazione dashboard e guard. Questi test non sostituiscono rendering, test tastiera, viewport e screen reader. Nessun DB necessario per T-05.

## Esito verifiche F1 (commit 5a15d8df9143a82b899a510cc82f3ccc03bfae4e)
- [CI 45810457357](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45810457357) conclusa success: TypeScript, 130/130 test automatici (5 nuovi, 0 errori, 0 saltati), prebuild e build Next.js. Log job 139876604355: 127 file sorgenti, 289 import, 7 moduli critici; 39/39 pagine statiche generate.
- Vercel status success associato al commit codice. Non è stato aperto né collaudato con utenti autenticati; nessuna attestazione di staging isolato o test visuale.
- T-05: palette, contrasti testo 4.5:1, focus/bordi 3:1, struttura delle primitive e integrazione dashboard verificati automaticamente. SC-05.1/2/3/5 restano Implementato perché copertura visuale/adozione globale non ancora verificata; SC-05.4 in lavorazione per i componenti delle fasi 2–4. Nessun SQL e nessuna modifica a main.

## T-06 e T-36.1 — Fase 2

## Fase 2 — Layout globale (26/11/2026)
- SC-06.1/06.2: AppShell client a partire dal root layout server; sidebar staff anche in eventi, organi, documenti e comunicazioni. requireStaff resta nel layout /gestionale e tutte le guard/RPC/RLS esistenti restano operative. 11 macroaree, whitelist moduli esistente, activeItem per segmento più specifico, alias, aria-current, gruppo corrente aperto, scroll sidebar indipendente.
- SC-06.3: header con simbolo storico (nessun logo ufficiale trovato nell'albero Git), area corrente, account, cambio area solo per ruolo/abilitazione verificata, disconnessione, profilo e consensi per utente abilitato. Conteggio esatto notifiche e link al pannello esistente per chi ha area personale; niente campanella fittizia per account senza area personale. Centro notifiche completo F31/F4. Ricerca globale omessa perché non esiste un flusso sicuro e funzionante.
- SC-06.4/06.5: breadcrumb con etichette e titolo h1 già autorizzato (non ID grezzi); ritorno esplicito, fallback locale e contesti filtro conservati in memoria del layout, tramite query whitelist. Non si memorizzano valori personali in localStorage/sessionStorage. Il refresh del dettaglio perde il contesto in memoria e usa il fallback. Vecchi link contestuali restano per compatibilità; migrazione capillare a F3/F4. Le route handler download/stampe non sono pagine UI.
- SC-06.6: guard confronta snapshot dei campi modificabili, compresi checkbox/radio/file e marker controllati non inviati al server. Dialogo con Continua a modificare / Esci senza salvare per link, ritorno, chiusura details, reset, submit di altro form; beforeunload quando dirty; Navigation API solo per traversate cancellabili, nessuna manipolazione della cronologia. Non elimina baseline su submit; markFormSaved solo su esito esplicito dei flussi client. Annulla separato da ritorno, adapter temporaneo per form POST storici. Limiti: back/forward SPA non cancellabile in alcuni browser, lifecycle mobile, azioni native con redirect e form controllati non ancora migrati richiedono collaudo/integrazione ulteriore. Drawer/tabs F3/F4 dovranno usare requestDiscard. Nessun Salva e continua generico.
- SC-36.1: hamburger e dialog nativo chiuso di default, focus iniziale e ripristino su chiusura, Escape, chiusura dopo navigazione, desktop sidebar nascosta sotto 1001px, safe area e viewport dinamica con fallback. Nessuna bottom bar opzionale. Verifica reale Safari/Chrome, tastiera, focus trap e misure SC-36.5 ancora da eseguire.
- Test: prima CI 45811733467 fallita per un'asserzione storica di collocazione del titolo; sostituita con verifica della query dei ruoli, guard e AppShell. CI [45812175587](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45812175587) superata: 139/139 test, TypeScript, integrità e build. Ultimo codice f5ee958: CI [45812422015](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45812422015), stato al momento del registro: success. I test automatici includono logica e controlli strutturali, non E2E browser o RLS live.
- Commit: 717d88c, fe90cc6, e48283b, ab258a4, f5ee958. Nessun SQL, nuova dipendenza, merge, modifica ai permessi o operazione su produzione.

Scenari browser aperti: accesso diretto e refresh, drawer a 320/375/390/430/768/1024/1280/1440/1920, focus/ESC, menu account e logout, nav protetta, stato sporco/ritorno a valori iniziali, submit fallito e riuscito, browser back/forward, reload/chiusura, tastiera iOS, RLS per ruolo. Testare su staging e non dati reali.

### Evidenza finale F2
Commit applicativo `f5ee95843305a60efc0f271e0ae82bca3d754e00`: [CI 45812422015](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45812422015), job 139883397017, conclusione success. TypeScript OK; 140/140 test (10 nuovi rispetto a F1), 0 falliti, 0 saltati; integrità 131 sorgenti / 307 import / 7 moduli critici; build Next.js e 39/39 pagine statiche generate. Vercel commit applicativo success. Nessun collaudo autenticato, browser E2E o RLS live. `main` verificato invariato a eb25225ce7e538cf72486b48c4af2812c7492416. Nessuna pubblicazione in produzione.
