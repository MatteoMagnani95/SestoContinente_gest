# Sesto Continente 3.0 — tracker
## Rifinitura grafica locale — 27/11/2026

Ramo `feature/gestionale-3.0-design-polish`, fotografia upstream `77e73c6`. Sette CSS condivisi aggiornati per header, menu, KPI, scorciatoie e tabelle; nessuna modifica funzionale. 17/17 controlli dedicati superati, parsing 19 CSS e integrità sorgenti superati. Suite completa, build e verifica browser non completate per limiti dell'ambiente. Stato: **pubblicazione autorizzata; trasferimento su ramo remoto e gate completo in preparazione**. Dettagli in `docs/redesign/DESIGN_POLISH_2026-11-27.md`. Le attestazioni F7 sottostanti rimangono storiche e non certificano questa rifinitura. Il 27/11/2026 l’utente ha chiesto «Pubblica»: si usa il ramo remoto della PR #6 e il progetto Vercel esistente, dopo gate esatto, senza migrazioni, reset o upgrade.

---

Data: 26/11/2026. Baseline produzione e HEAD 2.0: `20ae6fcceb5307d58920aa1527a83e2d1cf938f4`. Ramo: `feature/gestionale-3.0-ui-ux`. Albero Git ricorsivo non troncato: 451 elementi, 56 page, 7 route handler, 2 layout e not-found. Fonte 2.0: docs/redesign/MASTER_SPEC.md, DESIGN_SYSTEM.md, PAGE_REQUIREMENTS.md. Il master 3.0 e 16 mockup ricevuti sono riferimenti esterni, non pubblicati nel repository. Nessuna modifica DB o deploy. main e fix/0020 divergono solo per vercel.json; altri fix sono antenati. Preservata configurazione di produzione.
 
## Fasi
| Fase | Stato | Note |
|---|---|---|
| 1 — Fondazioni | Gate superato | Asset e componenti verificati nei rendering finali F7. |
| 2 — AppShell | Gate superato | Navigazione e logout verificati nel gate F7. |
| 3 — Centro operativo e segreteria | Gate sincronizzato superato | ff356d1: CI 45906661406 e QA 45906661502 tentativo 2 success; 280 statici, 68 browser ordinari, 166 autenticati, 72 logout. |
| 4 — Didattica e impianti | Gate superato | cc323fc: CI 45910455789 + QA 45910455776 success; 283 automatici, 68 browser ordinari, 170 autenticati, 72 logout. |
| 5 — Operazioni associative | Gate superato | b74aa8a: CI 45962908776 + QA 45962908906 success; 286 automatici, 68 browser ordinari, 172 autenticati, 72 logout. |
| 6 — Aree utente e mobile | Gate superato | e4fdb7f: CI 45965395429 e QA 45965395638 success, 288 statici, 70 browser ordinari, 182 autenticati, 72 logout. |
| 7 — Collaudo e rilascio | GO tecnico locale; produzione NO-GO | 31a626c: CI 45969993359 e QA 45969993424 success; 292 statici, 70 browser ordinari, 182 autenticati, 72 logout, 280/280 visuali. |
 
## Inventario UI (copertura di base non equivale a redesign della pagina)
Ruoli indicativi dal codice di navigazione e dalle guardie 2.0. Al checkpoint finale, V indica rendering osservato nel caso visuale indicato; I indica implementazione/ispezione del codice senza certificazione individuale esaustiva. NV indica controllo individuale non attestato in questa matrice, non un fallimento delle suite globali. I risultati funzionali e sicurezza di suite sono in F7_CLOSURE_REPORT.md. Non si presume copertura di ogni stato e combinazione ruolo/route. Stati da verificare per ogni riga: normale, vuoto, errore, caricamento; per operazioni di creazione/modifica/dialog anche dirty form, invio, errore e successo; N/A solo dopo verifica. D=desktop, M=mobile, F=funzionale, S=autorizzazioni. NV=non verificato. Le pagine ereditano token e shell senza essere marcate riprogettate.
| File | Route | Accesso | Fase | Stato specifico | D/M/F/S |
|---|---|---|---|---|---|
| `app/accedi/page.tsx` | `/accedi` | Pubblico/auth; redirect esistenti | 6 | Verificato scenario visuale 15a; gate F7 | V/V/NV/NV |
| `app/area-personale/certificato/page.tsx` | `/area-personale/certificato` | Account abilitato; persone collegate | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/area-personale/corsi/page.tsx` | `/area-personale/corsi` | Account abilitato; persone collegate | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/area-personale/documenti/page.tsx` | `/area-personale/documenti` | Account abilitato; persone collegate | 6 | Redirect preservato (nessuna UI propria) | N/A/N/A/NV/NV |
| `app/area-personale/page.tsx` | `/area-personale` | Account abilitato; persone collegate | 6 | Verificato scenario visuale 13,16; gate F7 | V/V/NV/NV |
| `app/area-personale/profilo/page.tsx` | `/area-personale/profilo` | Account abilitato; persone collegate | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/area-soci/page.tsx` | `/area-soci` | Socio autorizzato | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/comunicazioni/corsi/[id]/page.tsx` | `/comunicazioni/corsi/[id]` | Autorizzazione contestuale | 5 | Verificato scenario visuale extra corso; gate F7 | V/V/NV/NV |
| `app/comunicazioni/soci/[id]/page.tsx` | `/comunicazioni/soci/[id]` | Autorizzazione contestuale | 5 | Verificato scenario visuale extra socio; gate F7 | V/V/NV/NV |
| `app/documenti/page.tsx` | `/documenti` | Account autorizzato, RLS | 5 | Verificato scenario visuale 12; gate F7 | V/V/NV/NV |
| `app/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]/page.tsx` | `/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/amministrazione-dati/page.tsx` | `/gestionale/amministrazione-dati` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/archivio-incassi/page.tsx` | `/gestionale/archivio-incassi` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/attrezzature/[id]/page.tsx` | `/gestionale/attrezzature/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/calendario-visivo/[id]/page.tsx` | `/gestionale/calendario-visivo/[id]` | Staff; admin-only/contestuale ove previsto | 4 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/calendario-visivo/page.tsx` | `/gestionale/calendario-visivo` | Staff; admin-only/contestuale ove previsto | 4 | Verificato scenario visuale 07; gate F7 | V/V/NV/NV |
| `app/gestionale/corsi/[id]/page.tsx` | `/gestionale/corsi/[id]` | Staff; admin-only/contestuale ove previsto | 4 | Verificato scenario visuale 06; gate F7 | V/V/NV/NV |
| `app/gestionale/corsi/nuovo/page.tsx` | `/gestionale/corsi/nuovo` | Staff; admin-only/contestuale ove previsto | 4 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/corsi/page.tsx` | `/gestionale/corsi` | Staff; admin-only/contestuale ove previsto | 4 | Verificato scenario visuale 05; gate F7 | V/V/NV/NV |
| `app/gestionale/economia/page.tsx` | `/gestionale/economia` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/importazione/page.tsx` | `/gestionale/importazione` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/incassi/[id]/page.tsx` | `/gestionale/incassi/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/incassi/page.tsx` | `/gestionale/incassi` | Staff; admin-only/contestuale ove previsto | 5 | Verificato scenario visuale 08; gate F7 | V/V/NV/NV |
| `app/gestionale/incassi/posizione/[id]/page.tsx` | `/gestionale/incassi/posizione/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/moduli/[modulo]/page.tsx` | `/gestionale/moduli/[modulo]` | Staff; admin-only/contestuale ove previsto | 5 | Verificato scenario visuale 03 (anagrafiche); gate F7 | V/V/NV/NV |
| `app/gestionale/moduli/attrezzature/page.tsx` | `/gestionale/moduli/attrezzature` | Staff; admin-only/contestuale ove previsto | 5 | Verificato scenario visuale 09; gate F7 | V/V/NV/NV |
| `app/gestionale/moduli/consegne/page.tsx` | `/gestionale/moduli/consegne` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/moduli/contabilita/page.tsx` | `/gestionale/moduli/contabilita` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/moduli/iscrizioni/page.tsx` | `/gestionale/moduli/iscrizioni` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/moduli/piscine/page.tsx` | `/gestionale/moduli/piscine` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/moduli/revisioni/page.tsx` | `/gestionale/moduli/revisioni` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/page.tsx` | `/gestionale` | Staff; admin-only/contestuale ove previsto | 3 | Verificato scenario visuale 01; gate F7 | V/V/NV/NV |
| `app/gestionale/programmi-didattici/page.tsx` | `/gestionale/programmi-didattici` | Staff; admin-only/contestuale ove previsto | 4 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/report/page.tsx` | `/gestionale/report` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/richieste/[id]/page.tsx` | `/gestionale/richieste/[id]` | Staff; admin-only/contestuale ove previsto | 3 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/richieste/page.tsx` | `/gestionale/richieste` | Staff; admin-only/contestuale ove previsto | 3 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/soci/[id]/page.tsx` | `/gestionale/soci/[id]` | Staff; admin-only/contestuale ove previsto | 3 | Verificato scenario visuale 04; gate F7 | V/V/NV/NV |
| `app/gestionale/soci/page.tsx` | `/gestionale/soci` | Staff; admin-only/contestuale ove previsto | 3 | Verificato scenario visuale 02; gate F7 | V/V/NV/NV |
| `app/gestionale/utenti/[id]/elimina/page.tsx` | `/gestionale/utenti/[id]/elimina` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/utenti/[id]/page.tsx` | `/gestionale/utenti/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/utenti/page.tsx` | `/gestionale/utenti` | Staff; admin-only/contestuale ove previsto | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestione-eventi/[id]/page.tsx` | `/gestione-eventi/[id]` | Staff/responsabile autorizzato | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestione-eventi/page.tsx` | `/gestione-eventi` | Staff/responsabile autorizzato | 5 | Verificato scenario visuale 10; gate F7 | V/V/NV/NV |
| `app/istruttore/page.tsx` | `/istruttore` | Istruttore autorizzato | 6 | Verificato scenario visuale 14,14b; gate F7 | V/V/NV/NV |
| `app/notifiche/page.tsx` | `/notifiche` | Account autenticato; solo notifiche proprie | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/nuova-password/page.tsx` | `/nuova-password` | Pubblico/auth; redirect esistenti | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/organi-sociali/archivio/[id]/page.tsx` | `/organi-sociali/archivio/[id]` | CdA/staff autorizzati | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/organi-sociali/archivio/page.tsx` | `/organi-sociali/archivio` | CdA/staff autorizzati | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/organi-sociali/page.tsx` | `/organi-sociali` | CdA/staff autorizzati | 5 | Verificato scenario visuale 11; gate F7 | V/V/NV/NV |
| `app/organi-sociali/riepilogo/page.tsx` | `/organi-sociali/riepilogo` | CdA/staff autorizzati | 5 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/page.tsx` | `/` | Pubblico/auth; redirect esistenti | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/registrati/informativa-test/page.tsx` | `/registrati/informativa-test` | Pubblico/auth; redirect esistenti | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/registrati/page.tsx` | `/registrati` | Pubblico/auth; redirect esistenti | 6 | Verificato scenario visuale 15b; gate F7 | V/V/NV/NV |
| `app/richiesta/documenti-test/page.tsx` | `/richiesta/documenti-test` | Richiedente/account abilitato | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/richiesta/nuova/page.tsx` | `/richiesta/nuova` | Richiedente/account abilitato | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/richiesta/stato/page.tsx` | `/richiesta/stato` | Richiedente/account abilitato | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/smista/page.tsx` | `/smista` | Pubblico/auth; redirect esistenti | 6 | Redirect preservato (nessuna UI propria) | N/A/N/A/NV/NV |
| `app/layout.tsx` | Shell globale | Tutti | 2 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
| `app/gestionale/layout.tsx` | Guard staff | Staff | 2 | Guard staff preservata | N/A/N/A/NV/NV |
| `app/not-found.tsx` | Errore 404 | Contestuale | 6 | Implementato; verifica specifica di tutti gli stati non attestata | I/I/NV/NV |
 
## Configurazioni CRUD
28 moduli censiti da lib/modules.ts; stato non iniziato per tutti; applicare pattern elenco, dettaglio, creazione, modifica, dialog, errore, vuoto e mobile se esistenti. Ruoli da confermare dai controlli server; le voci admin-only rilevate esplicitamente sono mantenute.
| Route | Accesso preliminare | Fase | Stato | D/M/F/S |
|---|---|---|---|---|
| `/gestionale/moduli/anagrafiche` | Staff; verificare restrizioni | 3 | Implementato; collaudo aperto | NV/NV/NV/NV |
| `/gestionale/moduli/adesioni` | Staff; verificare restrizioni | 3 | Implementato; collaudo aperto | NV/NV/NV/NV |
| `/gestionale/moduli/tesseramenti` | Staff; verificare restrizioni | 3 | Implementato; collaudo aperto | NV/NV/NV/NV |
| `/gestionale/moduli/stagioni` | Admin | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/corsi` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/edizioni` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/iscrizioni` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/istruttori` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/qualifiche` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/brevetti` | Staff; verificare restrizioni | 3 | Implementato; collaudo aperto | NV/NV/NV/NV |
| `/gestionale/moduli/certificati` | Staff; verificare restrizioni | 3 | Implementato; collaudo aperto | NV/NV/NV/NV |
| `/gestionale/moduli/programmi` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/versioni` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/piscine` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/corsie` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/calendario` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/prenotazioni` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/presenze` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/attrezzature` | Staff; verificare restrizioni | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/revisioni` | Staff; verificare restrizioni | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/consegne` | Staff; verificare restrizioni | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/quote` | Staff; verificare restrizioni | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/addebiti` | Staff; verificare restrizioni | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/pagamenti` | Staff; verificare restrizioni | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/listino` | Admin | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/contabilita` | Admin | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/comunicazioni` | Staff; verificare restrizioni | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/promemoria` | Admin | 5 | Non iniziato | NV/NV/NV/NV |
 
## Handler preservati (fuori perimetro grafico)
- `app/api/cron/promemoria/route.ts`
- `app/auth/callback/route.ts`
- `app/documenti/[id]/route.ts`
- `app/gestionale/corsi/[id]/stampe/route.ts`
- `app/gestionale/esporta/[modulo]/route.ts`
- `app/gestionale/importazione/modello/route.ts`
- `app/organi-sociali/documento/[id]/route.ts`
 
## Verifiche F1
- Confronto HEAD e deploy: identici, produzione READY.
- Asset PNG ottenuti dai JPG originali, confronto visivo locale su fondo chiaro; file trasferiti con SHA Git verificata. Variante scura mediante supporto chiaro; non vettorializzazione perfetta. Logo SestoContinente originale 242×120: dettaglio perduto non recuperabile; approvazione visiva del titolare e controllo browser restano aperti.
- Coppie di contrasto calcolate per token (test F1 dedicato). Nessun accesso a dati reali.
- Git clone da runtime locale non disponibile per rete; test completi tramite CI solo se effettivamente eseguiti. Non attestare build, lint, test E2E, RLS o WCAG completa prima di risultati reali.
- Prossimo passo: verificare CI/collegamento asset, poi Fase 2; conservare guardie, navigazione e dati.

## F2 — AppShell
- Baseline F1 CI success: https://github.com/segreteriasestocontinente/SestoContinente_gest/actions/runs/45897134510. Nessun fix necessario.
- Tutte le pagine ereditano AppShell; stato dei redesign di pagina rimane invariato. Sidebar conserva tutte le destinazioni, raggruppamento e stato attivo, compressione locale senza dati personali. Mobile: quattro destinazioni principali secondo ruolo + menu completo in header; safe area, tastiera e dialog. Header ufficiale invariato, Nereia in footer.
- Nome: solo collegamento univoco relazione titolare, lettura sessione/RLS, fallback Ciao/Account e avatar generico. Non usare email o nome di persona rappresentata.
- Ricerca: staff (persone, allievi iscritti/conclusi, edizioni, eventi, attrezzature), istruttore non staff (edizioni assegnate, eventi di cui è responsabile), documenti associativi pubblicati per soci secondo RLS. Per soci normali non esporre anagrafiche, iscrizioni altrui o dettagli non collegabili: l'accesso a corsi ed eventi resta dalle rispettive aree. Esclusi documenti personali/sanitari/interni e note. Niente storage URLs o service role. Query min 2 caratteri, max 80/4 parole, 300ms debounce, 6 per gruppo, indicazione parzialità; scope istruttore limitato a 100 collegamenti/200 assegnazioni (parzialità dichiarata). Nessun log query, nessuna persistenza. Link effettivi e guardie esistenti a destinazione.
- F2 browser autenticato manuale e verifica visiva su tutte le viewport ancora aperti. CI nuova da controllare; nessun deploy o SQL.
- Aggiunti test eseguibili con client Supabase simulato (anonimo, account disabilitato, ruoli, errore parziale) e Playwright per ruoli sintetici ove configurati. Nessun test con sessione reale di produzione. Normalizzazione maiuscole solo in visualizzazione e iniziali nome/cognome del titolare.

## F3 — Segreteria
- Baseline F2: run 45897856873, entrambi i job success. Riferimenti riaperti localmente: MASTER_PROMPT_SESTO_CONTINENTE_3.0_DEFINITIVO.md, §§5.1–5.3, 6–10 e mockup 01–04 del pacchetto definitivo. Nessuna immagine dimostrativa o dato personale nel repository.
- Dashboard: quattro scorciatoie reali prima di priorità e riepiloghi; nuovo evento apre drawer con ?nuovo=1, stessa guardia e azione; nuova persona non crea adesione; incasso apre scelta posizione. Nereia informativo dopo lezioni/eventi. 5+4 KPI invariati, zero e errore distinti. Amministrazione e altre funzioni conservate.
- Soci: filtri, conteggi esatti per stato e stagione/ricerca (adesioni, non persone uniche), paginazione server; CF mascherato solo nell'elenco, completo nella scheda autorizzata; stagione nascosta solo quando filtro singolo; avatar/nomi formattati solo a schermo. Navigazione contestuale 7 aree.
- Scheda: tutte le 13 tab e URL conservati, 6 sotto Altro; identità, azioni, riepiloghi reali, documenti recenti solo secondo RLS, dati dettagliati caricati in base alla tab. Tesseramenti mostrati come conteggio registrato (non attestazione di validità); nessun dato clinico. Azioni e controlli server invariati.
- Moduli: sezioni personali/recapiti/fiscali/verifiche particolari, campi facoltativi invariati, assistenza CF preservata, checkbox allineate, apertura dettagli in caso di errore, azioni persistenti su desktop e normali su telefono per non coprire campi. Pattern generico disponibile anche nelle altre aree; non marcarle completamente riprogettate. Domande: filtri/stati, verifica e cronologia invariati.
- Test e collaudo autenticato ancora da eseguire; nessun deploy, SQL, migrazione o modifica ai dati.

## Correzione funzionale trasversale — corsi e deroghe istruttori
- Elenco e dettaglio: direttore, responsabile e aiuto-istruttori da assegnazioni effettive; nessuna correzione automatica di duplicati o dati storici.
- Selettori staff ordinari e avanzati: qualifiche istruttori escluse di default, deroga esplicita con motivazione; direttore e istruttori della stessa edizione sempre esclusi. Area personale: rinvio alla segreteria.
- Migrazione proposta: 20261126213000_deroga_istruttori_corsi.sql; RLS staff, audit, vincoli reciproci e RPC atomica; regolarizzazione iscrizioni storiche senza cancellazione.
- Test statici v48 e integrazione PostgreSQL nel collaudo esistente. CI da verificare; nessun merge, rilascio o intervento sul DB di produzione. PR esistente #6.

- Rifiniture F3: modifica anagrafica diretta, quattro gruppi anche nel drawer scheda socio, stato e scadenza più recente del tesseramento associato all’adesione attiva (non attestazione di validità), footer sticky anche mobile salvo tastiera aperta/schermo molto basso. Test statici aggiunti e scenari Playwright con fixture sintetiche. Integrazione concorrente: preservato integralmente l’intervento corsi su branch; la sua migrazione separata NON è stata applicata in produzione.

## Gate F3 — regressioni di integrazione
- Run 45898473176 sul commit concorrente 5491c14: 248 test statici passati, 4 falliti; integrazione DB non superata (trigger deroga non installato nel setup CI). Run F3 45898862122 in coda al controllo iniziale. Corretti setup CI effimero (migrazione successiva al pacchetto 2.0), inventario azioni staff, test disabled con motivo, mock qualifiche/incarichi e test di deroga positiva/negativa; documentata migrazione e aggiunta verifica schema fail-fast. Nessuna modifica alle regole applicative, alla migrazione SQL o al database reale. F4 non avviata fino a esito del gate aggiornato.

## Protocollo anti-regressione vincolante — 26/11/2026
Il documento [REGRESSION_TRACKER.md](./REGRESSION_TRACKER.md) integra e prevale sulle precedenti istruzioni di avanzamento del master 3.0: nessuna fase successiva senza sincronizzazione delle sole correzioni approvate dal ramo release/gestionale-consolidato e gate esteso verde sul commit esatto. Mantiene tutti i mockup e il lavoro F1–F3. Il commit 8c2a313 ha superato la CI ordinaria 45899245776 (entrambi i job success). I 66 test browser sono pubblici/non autenticati: non equivalgono a matrice dei ruoli. La F4 non è stata committata, né iniziata sul ramo. Nessun merge, pubblicazione o SQL produzione. Workflow QA locale esteso alla PR 3.0; verifiche aggiuntive logout desktop/mobile per ogni account sintetico prima di generare le sessioni riutilizzabili. Il gate resta NO-GO fino a risultati effettivi e coordinamento.

## Checkpoint prima della Fase 4
PR #7 f99564f verificata nei run 45900175385 e 45900175348, inclusi 36 logout effettivi su Supabase locale. Sul redesign, corretta la chiusura con Esc della ricerca globale emersa nella QA 45899921809. Evidenze e dipendenze in REGRESSION_TRACKER.md. Fase 4 bloccata fino a coordinamento e gate esteso sul candidato sincronizzato.

## Sincronizzazione F3 con release 2.0
Release 302e9e9 approvata (run 45905569811 e 45905569823 success); importazione funzionale REG-001–015 e riconciliazione dei test con a59469a. Inserita route /notifiche nell'inventario; preservati asset, ricerca, sidebar, dashboard e segreteria. Nuovo gate esteso obbligatorio: F4 non avviata. Nessun deploy o SQL produzione.

## F4A — elenco e scheda corso
Gate F3 sincronizzato GO su ff356d1: CI 45906661406, QA 45906661502 tentativo 2 entrambe verdi; 280 automatici, 68 browser pubblici, 166 autenticati, 72 logout. Avviata F4A: cards differenziate per disciplina, vista tabella alternativa, filtri/paginazione conservati in URL (parametro vista_corsi separato dal percorso iscrizioni legacy), capienza reale con errore esplicito, staff reale, header di area didattica, riepilogo prossime cinque lezioni future non annullate; dieci tab e link storici intatti. Nuova edizione riusa header comune. Nessuna modifica ad azioni, SQL, RPC o RLS. Test aggiunti. Mockup originali non direttamente recuperati in questa sessione: implementazione basata sul perimetro documentato, verifica visuale di conformità aperta. F4B didattica/impianti da completare dopo gate F4A.

## F4A — riferimenti definitivi recuperati
Pacchetto SestoContinente_3.0_Pacchetto_Definitivo(1).zip aperto e master prompt §5.4–5.6 confrontato con i mockup 05/06. Correzione firma pageHref senza indebolire test storico; icone disciplina, azioni distinte, scorciatoie, accesso calendario e capienza dettagli riallineati. Form orizzontali della release prevalgono sulla vecchia indicazione pannello laterale. Le immagini non sono asset di produzione. Verifica visiva reale a viewport desktop/mobile ancora aperta; non dichiarata equivalenza pixel-perfect. Calendario/piscine/corsie (07) e archivio didattico da completare dopo gate F4A.

## F4A — sincronizzazione del test browser
QA 45908246524 sul precedente 0a5c9e6: la prova F4A WebKit ha fallito per navigazione concorrente alla scheda prima del completamento del cambio vista Schede. Aggiunte attese verificabili URL, aria-current, rimozione tabella, visibilità scheda sintetica e verifica overflow a 390 px con polling di Playwright. Nessun controllo rimosso; nessuna modifica applicativa, SQL o permessi. Verifica ordinaria 45908763172 sul 48d4f86 verde; la QA 45908763248 era ancora in corso al rilevamento. Nuovo gate esatto richiesto prima di F4B.

## F4B — calendario, piscine, corsie e archivio didattico
Master definitivo §5.6 e immagine 07 riletti dal pacchetto allegato. CI F4A a51c7c6: 45909307533 + 45909307432 success (282 automatici, 68 ordinari, 168 autenticati, 72 logout). F4B: header area, legenda e icone lezioni, navigazione agenda mobile, matrice corsia×giorno con intervalli reali e ritorno al contesto, link prenotazioni/piscina, segnalazione titoli non leggibili. Moduli didattici: header, scorciatoie agli archivi e badge tipologia; programmi/versioni, corsie/prenotazioni e altre route CRUD didattiche mantengono editor e protezioni originali. Test browser verifica occupazione di altra edizione, etichette, settimana, viewport 390 e link. Nessun SQL, scrittura produzione o asset mockup in repo. Gate F4B aperto, verifica visuale pixel non ancora eseguita.

## F5 — Operazioni associative, 27/11/2026
Riaperto ZIP definitivo, master §§5.7–5.11 e mockup 08–12. Baseline release 302e9e9 confermata immutata. Gate F4 cc323fc verde: 283 statici, 68 browser ordinari, 170 autenticati (8 skip configurati), 72 logout. Incassi: due tab URL, filtri e debito contestuale, KPI effettivi colorati, cifre allineate, storico e admin protetti. Inventario: icone categorie, KPI stato/prestiti, revisione separata, priorità 30 giorni già usata dal codice, schede reali. Eventi: card, filtri, contatori occupazione con attesa inclusa nei riservati, nessun incasso fittizio. CdA: panoramica con bozze/votazioni correnti, progresso da RPC, navigazione e riservatezza; sette tab e tutti i flussi originali intatti. Documenti: file manager con icone MIME, dimensioni effettive e visibilità; nessuna cartella/cestino o permesso inventato. Header comuni anche nelle route collegate incassi, attrezzature, contabilità, report, amministrazione, importazione, utenti, archivio verbali e versioni. Conservati pannelli orizzontali e tutte le azioni/RPC/RLS/SQL. Nuovi test unitari/strutturali e scenario browser mobile. Gate F5 aperto: non avviare F6 prima della CI e QA esatte. Confronto visivo delle schermate renderizzate ancora aperto. Nessun deploy.

## F6 — Aree utente, auth e mobile, 27/11/2026
Riaperti il master definitivo §§5.12–5.14, §7 e mockup 13–16 nel pacchetto allegato. F5 GO b74aa8a: 286 statici, 68 browser ordinari, 172 autenticati, 72 logout, 8 skip configurati. Release 302e9e9 confermata immutata. Area personale: card distinte dei profili propri e rappresentati, stagione, certificato con upload e consultazione privata, residuo da dati registrati, metriche e anteprime limitate a tre per profilo, corsi e brevetti autorizzati, eventi soltanto se RPC area_soci_accesso=true, notifiche del solo account, azioni rapide e Nereia dopo attività. Nessun pagamento online o idoneità inventata. Istruttori: card delle sole assegnazioni, cinque tab e registro individuale; nessuna assenza automatica, note didattiche e vincoli conservati. Login, registrazione e nuova password distinti, decoro marino e riquadro informativo con Nereia, invariati PKCE, conferma email, consensi, versione legale e flussi. Header coerenti nelle pagine personali, soci, domanda, profilo, certificati, notifiche e pagine di collaudo/404. Sidebar utente desktop per destinazioni autorizzate, tab contestuali e documenti in barra mobile max 5. Estesa matrice ruoli a 1024, 1440, 1920, oltre alle viewport preesistenti. Test nuovi su privacy, navigazione, dati e accesso. Verifiche visuali del rendering, zoom 200%, dispositivi fisici e audit WCAG completo rimangono in F7; non dichiarata equivalenza pixel-perfect. Nessuna modifica alle azioni, migrazioni o deploy. Gate F6 richiesto sullo SHA esatto.

### F6 — correzione compilazione 27/11/2026
CI 45964841996: job database superato, TypeScript TS2322 in lib/navigation.ts: il nuovo collegamento certificati usa l'icona `certificate`, già implementata in Icon.tsx ma non inclusa nel tipo MobileDestination. Estesa la union in modo esplicito, senza cast o disattivazione dei controlli. Nessun cambiamento a permessi, destinazioni o test. Gate da ripetere sul nuovo SHA; F7 non avviata prima del GO.

### F6 — ripristino contratto link certificato
CI 45965182027 su d1f3900: TypeScript e database superati; test storico v25-audit-flussi.test.mjs fallito esclusivamente sulla forma testuale del link certificato con persona specifica. Ripristinata la template literal originale `/area-personale/certificato?persona=${p.id}` nella nuova card; destinazione e ID invariati, test storico non modificato. Gate richiesto sul nuovo SHA.

## F7 — preparazione candidata
57 pagine, 7 route handler, 2 layout censiti; 53 pagine modificate rispetto al consolidato, 2 redirect invariati, 2 comunicazioni condividono MailContextPage aggiornato nel candidato. Script di acquisizione F7 integrato nel candidato con 20 scenari, 2 browser, 7 viewport; risultati ancora aperti. Matrice confronto in F7_VISUAL_AUDIT.md. F6 gate esatto obbligatorio prima di aggiornare il ramo. Nessun deploy.

## F7 — evidenze reali e correzioni, 27/11/2026
F6 e4fdb7f GO. 34f5d19 CI 45967282072 verde, QA 45967282666 fallita esclusivamente nello step visuale: 182 test autenticati superati; artifact visual-f7 15182899305 scaricato, 80 PNG e manifest, 277/280 controlli, 3 errori font registro presenze mobile. Zero overflow globale e zero input senza label fra quelli controllati. Confronto 16 mockup originali e rendering reale documentato in F7_VISUAL_AUDIT.md. Correzioni font, densità, caricamento immagini e diagnostica; nessun test indebolito. Nuovo gate e confronto visivo richiesti. Zoom nativo e audit WCAG completo aperti; NO-GO produzione.

## F7 — secondo collaudo e target filtri
0bdd921: CI 45968851284 e QA 45968851276 verdi (291 statici, 70 pubblici, 182 autenticati, 72 logout, 280/280 visuali). Artifact 15184745456 ispezionato e confrontato con 16 mockup e primo rendering. Diagnostica residuale: 4 filtri da 28px in tre scenari a 320px (12 occorrenze). Corretto flex mobile e reso bloccante il controllo target autonomi. Gate da ripetere sullo SHA esatto; nessun deploy. Zoom browser nativo, fisico, WCAG completa non certificati.

## F7 — chiusura tecnica locale (27/11/2026)
SHA applicativo collaudato `31a626c5bdec182a556d8261e3921d68a7905f59`; checkout PR `af61e644859d7db7086271e0ccac68515f5c019a`, identico albero `4c22eb83d9722d201b5cf097f46ccf1807638e14`. Entrambi i gate completati: 292 statici, 70 browser ordinari, 182 autenticati, 8 skip configurati, 72 logout, 280 controlli senza anomalie. Artifact 15185395952 con 80 PNG e manifest verificato. Ultimi filtri 320px corretti, zero smallActions. Confronto 16 riferimenti documentato nei cicli precedenti, controllate le schermate aggiornate dei filtri/form. Vedi F7_CLOSURE_REPORT.md per limitazioni e rilascio. Nessun deploy, nessun merge, nessuna modifica DB produzione. GO tecnico locale non è accettazione utente né certificazione WCAG.
