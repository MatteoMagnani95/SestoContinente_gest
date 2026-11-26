# Registro delle regressioni — release funzionale 2.0
Snapshot 2026-11-26. ID allineati a docs/redesign/REGRESSION_TRACKER.md del 3.0, senza modificare il ramo 3.0.
Stato: tutte le correzioni funzionali integrate, NO-GO produzione fino ai gate del nuovo SHA e alla verifica separata dello schema reale. Le verifiche sorgente non sono evidenza di esito sul ramo consolidato. Test e CI del candidato obbligatori; non indebolire le asserzioni.
| ID | Correzione | Origine | Stato codice sul release | Evidenza/test da eseguire sul release |
|---|---|---|---|---|
| REG-001 | Calendario personale solo corsi propri e confermati, nome corso e paginazione | #3 75b9781 / 2.0 | preservato: readCourseChunks(myCourseIds), upcoming e Pagination | v24, v25, browser autenticato |
| REG-002 | Callback interno, spazi password, sessione immediata, instradamento errori | #3 / #5 | preservato callback 2.0 (Location relativo e same origin), ritorno next #5; aggiunto fail-closed smista e messaggio | v24, v25, v26, v29, QA email |
| REG-003 | Orario Roma e DST, date reali, messaggi validi | #3 | asRomeISO comune e formatDate robusta già presenti; aggiunti isCalendarDate e todayRome con clock iniettabile | v24, v26 |
| REG-004 | Link diretti e modifica lezione guidata | #3 | preservato editId prima dei filtri, redirect calendario guidato e module-actions | v24, v25 |
| REG-005 | Ricerca certificati e upload | #3 | query vista, filtri, prevalidazione server e rimozione transito dopo successo 2.0; validazione data civile condivisa anche prima del ticket client | v24, v25, v26, QA Storage |
| REG-006 | Iscrizioni, direttore, reset, emergenza | #3 | preservate validazioni direttore UUID, emergenza e coppia contatti, filtri iscrizione, reset React | v15, v24, v25, browser |
| REG-007 | Domande, saldi, report, conteggi | #3 | preservata UI 2.0: avviso test condizionale, stagione attiva, saldi ufficiali, paginazione completa, report per periodo Roma | v24, v25, test report 2.0 |
| REG-008 | Presenze, note, documenti istruttori | #3 | preservato form presenza esplicita, nota salvata e query materiali scoped; controlli aggiuntivi su lezione/assegnazione/iscrizione | v25, browser istruttore |
| REG-009 | CSV formula injection | #3 | preservata neutralizzazione | v25 |
| REG-010 | Recupero password, falso errore login | #5 7493e8d | integrata per intero | v29, v25, scripts/qa-local-auth.mjs |
| REG-011 | Logout, account, notifiche | #7 f99564f | integrata; collaudo verde su 3d934da e 257a89c | account-common-navigation, browser e QA locale |
| REG-012 | Componenti CdA | #8 f136cbd | integrata per intero | cda-componenti-save, browser staff/roles |
| REG-013 | Pannelli, focus, responsive | #8 f136cbd | integrata per intero | cda-componenti-save, browser pubblici, staff, roles |
| REG-014 | Deroga istruttori | #6 3.0 / #10 257a89c | integrata tramite ramo funzionale autonomo; CI e QA sorgente verdi | v48-course-instructor-override, test DB e UI |
| REG-015 | Compatibilità CI/migrazioni | #6 3.0 / #4 2.0 | mantenuto setup CI 2.0 + QA #5; migrazione deroga inclusa e verificata su DB effimero | verify, QA locale, DB effimero |

## Tracciabilità PR #3
Il delta originale toccava 28 file. I seguenti sono stati riconciliati senza sostituire l'implementazione 2.0 con quella antecedente:
- app/actions.ts, app/auth/callback/route.ts: password non trimmate, login e signup sessione, redirect sicuro già presenti o migliorati; preservato contratto next/error #5 e controlli versioni legali 2.0.
- app/area-personale/corsi/page.tsx, app/area-personale/page.tsx, app/gestionale/corsi/page.tsx, app/gestionale/report/page.tsx, app/istruttore/page.tsx: comportamento già presente con nuove UI, tab, query paginate; test 2.0 v24/v25 conservati.
- app/gestionale/corsi/actions.ts, app/gestionale/moduli/[modulo]/page.tsx, app/gestionale/moduli/iscrizioni/page.tsx, app/module-actions.ts, app/istruttore/actions.ts, app/gestionale/esporta/[modulo]/route.ts: validazioni e query conservate; non reintrodotti i vecchi redirect/contratti server.
- app/richiesta/nuova/page.tsx, components/ApplicationForm.tsx, components/EligibleEnrollmentSelect.tsx, lib/format.ts: avviso test condizionale, reset selettore e conversione orari già presenti.
- app/smista/page.tsx, lib/security.ts, lib/course-tools.ts, app/area-personale/certificato/actions.ts, components/CertificateUploadForm.tsx: delta nuovo; nessun indebolimento di sicurezza/storage 2.0.
- tests/v15-gestione.test.mjs, tests/v24-audit-regressioni.test.mjs, tests/v25-audit-flussi.test.mjs: adattamenti 2.0 esistenti conservati (in v24 solo il nuovo nome della guardia). tests/v26-audit-regressioni.test.mjs importato intero.
- .github/workflows/verify.yml e vercel.json: mantenuta CI 2.0 estesa, disabilitazione deployment Git; aggiunta esecuzione release. Nessun deploy o SQL produzione.

## Gate
- CI sorgente #4, #3, #5 e #8: success per gli SHA congelati.
- CI consolidata antecedente 3d934da verde; PR7 e deroga incluse. QA sorgente 257a89c verde; ripetere gate PR9 sul nuovo SHA. I test su dati sintetici non attestano schema o configurazione della produzione.
- Il redesign 3.0 non deve ancora importare questo candidato. Aggiornare REG-001–015 su entrambi i registri quando il candidato è approvato.

### Primo gate del candidato
CI ordinaria 45900482031 su 0c1ec5a: database success, lint e TypeScript success; 4 test automatici falliti per mock obsoleti delle funzioni calendario in v38/v40. Correzione: caricare helper reali, clock fisso via todayRome, lasciare inalterate le asserzioni di compensazione e conservazione storage; aggiunto test di data impossibile/futura senza consumo transito. Nuovo gate necessario. QA 45900482052 del vecchio SHA non vale per il nuovo candidato.

## Integrazione della PR #7
Origine f99564fc805aceec089b4bb855b6704b81526db6, CI ordinaria 45900175385 e QA 45900175348 superate, 36 logout effettivi su nove account, Chromium/WebKit, 1440/390 px. Integrazione a tre vie sulla base del candidato 58f627b. Conservati i trigger QA di release, recupero password e account e tutte le asserzioni dei test browser della PR #8. Nessuna migrazione SQL aggiunta. Ripetere i gate sul nuovo candidato nella PR #9 prima di approvarlo. Fase 4 sospesa.

## Checkpoint integrazione PR #10
- Regola approvata dall’utente: deroga motivata anche nella stessa disciplina, mai per il direttore o un istruttore assegnato alla medesima edizione. Audit con autore, data e motivazione; nessuna modifica storica implicita.
- Ramo fix/deroga-istruttori-corsi, SHA 257a89c4b7e50e337ea11f020183ed23f15d7531, integrato per fast-forward da 3d934da senza conflitti. Migrazione 20261126213000_deroga_istruttori_corsi.sql inclusa; testata solo su PostgreSQL effimero e Supabase locale.
- CI sorgente 45904800690: 261/261 statici, 66/66 browser ordinari, lint/TS/build, migrazioni/RLS, restore, audit dipendenze verdi. QA 45904800627: 150/150 browser autenticati, 36/36 logout, deroga salvata da UI con esclusione direttore e audit persistente, recupero email locale, benchmark e mutazioni verdi.
- REG-001–015: codice integrato; evidenza delle suite sopra disponibile sul candidato funzionale esatto 257a89c, da ripetere sulla PR9 dopo aggiornamento documentale. Verifica visiva manuale completa e schema/configurazione di produzione non attestati. Nessun deploy o SQL di produzione. F4 3.0 bloccata fino a sincronizzazione e gate esteso.
