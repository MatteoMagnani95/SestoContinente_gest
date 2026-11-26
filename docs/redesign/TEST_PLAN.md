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
