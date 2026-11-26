# F7 — Gate di rilascio, collaudo e rollback
**Stato: NO-GO per produzione fino a evidenze complete e autorizzazione esplicita.**
Ramo `feature/gestionale-2.0-redesign`, PR #4 in bozza. Questo documento non autorizza distribuzioni, migrazioni reali o invii email.

## 1. Ambiente e precondizioni
- Creare un progetto Supabase di collaudo separato o Supabase locale, mai collegato al database di produzione. Non copiare anagrafiche, certificati, credenziali o token reali; usare esclusivamente fixture sintetiche e bucket privati.
- Verificare che il server Next locale e il runner usino la medesima configurazione Supabase locale; disattivare cron, invii email reali, webhook esterni. `QA_ISOLATED_ENV=true` è un'asserzione dell'operatore, non una prova automatica dell'isolamento del server già avviato.
- Preparare account distinti monoruolo: amministratore, segreteria, socio A, socio B, tutore, istruttore assegnato, istruttore non assegnato, consigliere, richiedente; profili e stagioni sintetici coerenti, quota saldata dove richiesta. Preparare separatamente un account disabilitato.
- Conservare i file Playwright storageState fuori dal repository, non committarli o allegarli ai report. Non riutilizzare cookie di produzione. Revocare le sessioni sintetiche al termine.
- Caricare i testi ufficiali versionati (privacy, dichiarazioni, immagini, statuto) e ottenere conferma della regola di rappresentanza dei minori; non inventare dichiarazioni o firme. Verificare che le origini storiche ignote non siano presentate come consensi acquisiti.

## 2. Sequenza di collaudo tecnico
1. Fissare SHA candidato, versione Node, dipendenze risolte, configurazione non segreta; eseguire lint, TypeScript, test statici, build, test browser pubblici, integrazione PostgreSQL. Conservare link CI e risultati, incluse eventuali anomalie.
2. Verificare che il progetto di prova abbia applicato tutte le migrazioni canoniche nell'ordine. Per DB già esistenti verificare lo storico effettivo, non rieseguire SQL già applicato. Le cinque migrazioni nuove sono elencate in F5_CLOSURE.md. Eseguire F5_HISTORICAL_AUDIT.sql su copia autorizzata, in sola lettura. Non bonificare automaticamente indicatori storici.
3. Avviare il server Next locale, con configurazione del Supabase locale (non placeholder). Dopo login con ciascun account sintetico salvare la rispettiva sessione Playwright in un file esterno al repository. Impostare `QA_ISOLATED_ENV=true`, `NEXT_PUBLIC_SUPABASE_URL` locale, `QA_BASE_URL` locale e i percorsi `QA_STAFF_STATE`, `QA_SECRETARY_STATE`, `QA_MEMBER_STATE`, `QA_INSTRUCTOR_STATE`, `QA_BOARD_STATE`, `QA_APPLICANT_STATE`. Eseguire `npm run test:browser`; controllare che tutti i progetti richiesti siano effettivamente presenti nel report, non soltanto quelli pubblici. I test sono read-only. Ripetere con varianti di socio/istruttore per controlli incrociati e usare sessioni separate per test mutanti.
4. Collaudo funzionale manuale con dati sintetici: domanda, accesso/recovery/logout, adesione/tesseramento, corsi e direzione, iscrizioni e contatti emergenza, presenze, calendario, incassi/rettifiche, attrezzature/prestiti/revisioni, eventi, documenti/certificati, verbali/versioni e voto, report/export, notifiche. Verificare anche tentativi non autorizzati, RLS e storage diretto, link scaduti, risposta incerta di upload e ripresa, revoca ruolo e account disabilitato. Nessun invio a persone reali.
5. Mobile: applicare TEST_PLAN.md T-36/37 su tutte le route, tastiera reale, zoom 200% e reflow a 320 CSS px, riduzione movimento, orientamenti, VoiceOver/TalkBack e almeno un browser desktop con screen reader. WebKit in CI non equivale a Safari su iPhone. Misurare tempi di caricamento e query su archivi sintetici grandi, distinguendo dati completi da paginati.
6. Verificare build Vercel sullo stesso SHA; accertare che l'anteprima usi un ambiente isolato. Se il limite build impedisce la preview, registrare il blocco e non aggirarlo né cambiare piano. Non promuovere preview a produzione.
7. Eseguire prova di rollback su copia: backup verificabile, ritorno applicativo alla base compatibile, controllo saldi, documenti, consensi, ruoli e storico. Le nuove funzioni/trigger possono rendere il vecchio client non completamente compatibile; usare istruzioni F5_CLOSURE.md e tracker. Non rimuovere colonne o righe storiche. Verificare anche ripristino da backup su database separato.

## 3. Registro evidenze richieste
| Gate | Prova minima | Stato iniziale |
|---|---|---|
| G1 CI | SHA candidato, lint, TS, unit/static, build, browser e PostgreSQL verdi | Da aggiornare al candidato |
| G2 Migrazioni | Ordine, storico, audit e prova rollback su copia autorizzata | DB effimero verificato a checkpoint F5; staging aperto |
| G3 Auth/RLS/Storage | Matrice ruoli e account A/B, JWT effettivi, upload/download privati | Aperto |
| G4 Accessibilità e responsive | Test browser, dispositivi reali, tastiera e screen reader | Parziale |
| G5 Integrità funzionale | Percorsi CRUD e scenari concorrenti; saldi e storico | CI F5 positiva; E2E aperto |
| G6 Testi/configurazione | Approvazione documenti e regole associative, mail sink/cron, privacy | Aperto |
| G7 Performance | Dataset sintetico grande, tempi e soglie concordate | Aperto |
| G8 Preview e rollback | Preview sullo SHA, isolamento e prova ripristino | Aperto |
| G9 Autorizzazione | Approvazione del committente per migrazioni e release | Non concessa |

Per ogni prova registrare data, SHA, ambiente, operatore, comando/scenario, esito ed eventuale evidenza priva di dati personali. Non dichiarare G1–G9 superati per semplice presenza di codice o fixture. In caso di errore, fermare il rilascio, correggere sul feature branch e ripetere i test pertinenti e le regressioni.

## 4. Decisione di rilascio
Finché anche un gate obbligatorio è aperto, PR #4 rimane in bozza. La chiusura del lavoro di sviluppo non equivale ad autorizzazione al deploy. Non inviare SQL al database reale, non unire main e non modificare configurazioni Vercel senza esplicita autorizzazione.
