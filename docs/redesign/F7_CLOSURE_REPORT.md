# Sesto Continente 3.0 — rapporto di chiusura tecnica
**27 novembre 2026 — GO tecnico locale / NO-GO produzione**

## Identificazione
- Ramo `feature/gestionale-3.0-ui-ux`, PR #6 in bozza.
- SHA applicativo verificato: `31a626c5bdec182a556d8261e3921d68a7905f59`.
- Baseline funzionale congelata `302e9e995e2479344cde33777c66d34b4e7174e3`, PR #9 draft verso main.
- Main rilevato `5444519045f46eeece6f5c8030c6acb9f8fbda81` (non prova del deployment Vercel corrente).
- Checkout GitHub merge ref `af61e644859d7db7086271e0ccac68515f5c019a` e HEAD hanno identico tree `4c22eb83d9722d201b5cf097f46ccf1807638e14`.
- Diff rispetto al consolidato: 110 file modificati/aggiunti, nessun file rimosso; nessuna modifica alle migrazioni, proxy, configurazione Vercel o sicurezza centrale. Ricerca globale aggiunta con sessione utente, controlli ruolo e RLS, limiti e nessuna service role. Nessun merge/deploy/SQL produzione.

## Evidenze
| Gate | Risultato |
|---|---|
| CI [45969993359](https://github.com/segreteriasestocontinente/SestoContinente_gest/actions/runs/45969993359) | Success: lint, TS, 292/292 test, build, 70/70 browser, audit runtime alto/critico, migrazioni e integrazione DB |
| QA [45969993424](https://github.com/segreteriasestocontinente/SestoContinente_gest/actions/runs/45969993424) | Success: 182 browser autenticati, 8 skip configurati, login/JWT/Storage, CRUD, recovery email locale, benchmark e 72 logout effettivi |
| Visuale | 20 scenari, 2 motori, 7 viewport, 280/280; 80 PNG |
| Manifest | 280 combinazioni univoche, errors vuoto, 0 overflow, 0 font input mobile piccoli, 0 input senza label fra quelli testati, 0 target autonomi sotto 44px |
| Artifact | [15185395952](https://github.com/segreteriasestocontinente/SestoContinente_gest/actions/runs/45969993424/artifacts/15185395952), digest sha256 c7ee38f9e7923beb683f53edc20c41b1627f4652b9a5ce632452aa99ca48a22f; retention 7 giorni |

Verifiche visuali iterate (34f5d19: 277/280; 0bdd921: 280/280 ma diagnostica filtri; 31a626c: gate rafforzato 280/280). 16 mockup originali confrontati in F7_VISUAL_AUDIT.md; corretti registro presenze mobile, spaziature, caricamento marchi e filtri. I file originali del pacchetto non sono pubblicati nel repo. Brand primario Sesto Continente e progetto Nereia mantenuti; pannello anagrafico centrale/orizzontale secondo istruzione successiva, assenza di pagamento online o disponibilità inventate. Non equivalenza pixel-perfect.
Inventario 57 page, 7 handler e 2 layout; due redirect senza UI preservati; due pagine comunicazioni aggiornate via componente condiviso. Copertura delle route e dei flussi non equivale a verifica esaustiva di ogni stato per ogni ruolo. Per dettaglio: UI_UX_3.0_TRACKER.md, REGRESSION_TRACKER.md, DESIGN_SYSTEM_3.0.md, F7_VISUAL_AUDIT.md.

## Limiti espliciti
- Ambiente QA esclusivamente sintetico locale, Chromium/WebKit headless. Nessun dato reale, nessuna preview Vercel creata; accettazione visiva da parte dell'utente non ancora effettuata.
- Reflow a 320/390/768/844/1024/1440/1920 px, tastiera e focus coperti dagli scenari; reflow equivalente al 200% non costituisce zoom nativo. Dispositivi fisici e audit manuale completo WCAG 2.2 AA non certificati. 1620 occorrenze di target generici piccoli (inclusi link inline) restano diagnostica, non sono 1620 violazioni accertate. Gate autonomo verde.
- L'audit delle dipendenze runtime a soglia alta/critica non è penetration test o garanzia di assenza di vulnerabilità.
- Nessuna verifica exhaustiva di tutte le combinazioni di stati e accessi. 8 skip configurati non conteggiati come superati. Stato del DB remoto e deployment effettivo da verificare separatamente.
- La chiusura è riferita al codice di SHA 31a626c. Aggiornamento finale dei soli documenti non modifica il codice collaudato; eventuale nuovo SHA va ricollaudato prima del rilascio.

## Piano di rilascio — NON AUTORIZZATO
1. Congelare SHA approvato e verificare stato branch, PR, progetto Vercel, dominio effettivo e deployment READY corrente, registrando ID/URL del deployment precedente per rollback. Non assumere main come ramo pubblicato. Conservare deploymentEnabled=false.
2. Con approvazione separata, predisporre preview isolata su ambiente dati di test autorizzato, con credenziali/Storage/email di test; verificare che non punti a produzione. Non promuovere o pubblicare. Far approvare la preview all'utente, inclusi controlli accessibilità/device residui.
3. Il 3.0 non aggiunge migrazioni rispetto al consolidato. Diff Git main→release contiene otto file SQL aggiunti (registra_revisione, proteggi_prenotazioni_parziali, coerenza_lezioni_presenze, dichiarazioni_verificate, coerenza_direzione, anteprima_importazione_atomica, serializza_prenotazioni_guidate, deroga_istruttori_corsi). Non dedurre che siano mancanti sul DB. Verificare registro migrazioni e schema effettivi con accesso autorizzato, preparare SQL differenziale e backup/ripristino testato. Nessun reset.
4. Dopo accettazione esplicita, integrare in un candidato di rilascio separato e riesaminare delta a tre vie, verificare gli eventuali fix successivi e la copertura delle PR sorgenti. Mantenere #9 come unica PR finale verso main se ancora appropriata, senza contaminare ora la baseline 2.0. Verificare esatto SHA del candidato e gate completi. Nessuna chiusura automatica delle PR sorgenti.
5. Solo su autorizzazione esplicita: applicare eventuale differenziale DB approvato e pubblicare esattamente il commit approvato con il flusso Vercel verificato. Controllare READY, dominio, login/ruoli/logout, dashboard e flussi operativi, log ed errori.
6. Rollback: in caso di regressione rilevante interrompere il rollout e ripristinare il deployment precedente noto se compatibile con lo schema effettivo; per cambi DB non retrocompatibili utilizzare esclusivamente un piano di ripristino/differenziale approvato, conservando dati e audit. Non eseguire reset o rollback distruttivo automatico.

**Decisione:** sette fasi tecniche implementate e gate automatici locali conclusi, nessuna regressione bloccante rilevata nei controlli eseguiti. GO per preparazione della preview isolata, NO-GO per rilascio in produzione. L'utente deve autorizzare separatamente qualsiasi deploy.
