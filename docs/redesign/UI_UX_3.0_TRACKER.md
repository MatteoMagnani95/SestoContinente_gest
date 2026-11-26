# Sesto Continente 3.0 — tracker
Data: 26/11/2026. Baseline produzione e HEAD 2.0: `20ae6fcceb5307d58920aa1527a83e2d1cf938f4`. Ramo: `feature/gestionale-3.0-ui-ux`. Albero Git ricorsivo non troncato: 451 elementi, 56 page, 7 route handler, 2 layout e not-found. Fonte 2.0: docs/redesign/MASTER_SPEC.md, DESIGN_SYSTEM.md, PAGE_REQUIREMENTS.md. Il master 3.0 e 16 mockup ricevuti sono riferimenti esterni, non pubblicati nel repository. Nessuna modifica DB o deploy. main e fix/0020 divergono solo per vercel.json; altri fix sono antenati. Preservata configurazione di produzione.
 
## Fasi
| Fase | Stato | Note |
|---|---|---|
| 1 — Fondazioni | CI superata | Commit 7b39eb3; run 45897134510 success (lint, TS, static, build, browser, audit, integrazione DB effimero). Collaudo visuale autenticato manuale aperto. |
| 2 — AppShell | Implementato; gate da verificare | Header/account, nome titolare univoco, ricerca con sessione e scope espliciti, sidebar, menu mobile e barra rapida, test dedicati. |
| 3 — Centro operativo e segreteria | Non iniziato | KPI, soci, moduli, riquadro Nereia |
| 4 — Didattica e impianti | Non iniziato | Corsi, calendario, piscine |
| 5 — Operazioni associative | Non iniziato | Incassi, attrezzature, eventi, documenti, organi sociali, admin |
| 6 — Aree utente e mobile | Non iniziato | Area personale, istruttori, login, responsive, Nereia |
| 7 — Collaudo e rilascio | Non iniziato | Preview isolata, verifica autorizzazioni e regressioni |
 
## Inventario UI (copertura di base non equivale a redesign della pagina)
Ruoli indicativi dal codice di navigazione e dalle guardie 2.0; la verifica di accesso per singola route rimane aperta. Stati da verificare per ogni riga: normale, vuoto, errore, caricamento; per operazioni di creazione/modifica/dialog anche dirty form, invio, errore e successo; N/A solo dopo verifica. D=desktop, M=mobile, F=funzionale, S=autorizzazioni. NV=non verificato. Le pagine ereditano token e shell senza essere marcate riprogettate.
| File | Route | Accesso | Fase | Stato specifico | D/M/F/S |
|---|---|---|---|---|---|
| `app/accedi/page.tsx` | `/accedi` | Pubblico/auth; redirect esistenti | 6 | Non iniziato | NV/NV/NV/NV |
| `app/area-personale/certificato/page.tsx` | `/area-personale/certificato` | Account abilitato; persone collegate | 6 | Non iniziato | NV/NV/NV/NV |
| `app/area-personale/corsi/page.tsx` | `/area-personale/corsi` | Account abilitato; persone collegate | 6 | Non iniziato | NV/NV/NV/NV |
| `app/area-personale/documenti/page.tsx` | `/area-personale/documenti` | Account abilitato; persone collegate | 6 | Non iniziato | NV/NV/NV/NV |
| `app/area-personale/page.tsx` | `/area-personale` | Account abilitato; persone collegate | 6 | Non iniziato | NV/NV/NV/NV |
| `app/area-personale/profilo/page.tsx` | `/area-personale/profilo` | Account abilitato; persone collegate | 6 | Non iniziato | NV/NV/NV/NV |
| `app/area-soci/page.tsx` | `/area-soci` | Socio autorizzato | 6 | Non iniziato | NV/NV/NV/NV |
| `app/comunicazioni/corsi/[id]/page.tsx` | `/comunicazioni/corsi/[id]` | Autorizzazione contestuale | 5 | Non iniziato | NV/NV/NV/NV |
| `app/comunicazioni/soci/[id]/page.tsx` | `/comunicazioni/soci/[id]` | Autorizzazione contestuale | 5 | Non iniziato | NV/NV/NV/NV |
| `app/documenti/page.tsx` | `/documenti` | Account autorizzato, RLS | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]/page.tsx` | `/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/amministrazione-dati/page.tsx` | `/gestionale/amministrazione-dati` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/archivio-incassi/page.tsx` | `/gestionale/archivio-incassi` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/attrezzature/[id]/page.tsx` | `/gestionale/attrezzature/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/calendario-visivo/[id]/page.tsx` | `/gestionale/calendario-visivo/[id]` | Staff; admin-only/contestuale ove previsto | 4 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/calendario-visivo/page.tsx` | `/gestionale/calendario-visivo` | Staff; admin-only/contestuale ove previsto | 4 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/corsi/[id]/page.tsx` | `/gestionale/corsi/[id]` | Staff; admin-only/contestuale ove previsto | 4 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/corsi/nuovo/page.tsx` | `/gestionale/corsi/nuovo` | Staff; admin-only/contestuale ove previsto | 4 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/corsi/page.tsx` | `/gestionale/corsi` | Staff; admin-only/contestuale ove previsto | 4 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/economia/page.tsx` | `/gestionale/economia` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/importazione/page.tsx` | `/gestionale/importazione` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/incassi/[id]/page.tsx` | `/gestionale/incassi/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/incassi/page.tsx` | `/gestionale/incassi` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/incassi/posizione/[id]/page.tsx` | `/gestionale/incassi/posizione/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/moduli/[modulo]/page.tsx` | `/gestionale/moduli/[modulo]` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/moduli/attrezzature/page.tsx` | `/gestionale/moduli/attrezzature` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/moduli/consegne/page.tsx` | `/gestionale/moduli/consegne` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/moduli/contabilita/page.tsx` | `/gestionale/moduli/contabilita` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/moduli/iscrizioni/page.tsx` | `/gestionale/moduli/iscrizioni` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/moduli/piscine/page.tsx` | `/gestionale/moduli/piscine` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/moduli/revisioni/page.tsx` | `/gestionale/moduli/revisioni` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/page.tsx` | `/gestionale` | Staff; admin-only/contestuale ove previsto | 3 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/programmi-didattici/page.tsx` | `/gestionale/programmi-didattici` | Staff; admin-only/contestuale ove previsto | 4 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/report/page.tsx` | `/gestionale/report` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/richieste/[id]/page.tsx` | `/gestionale/richieste/[id]` | Staff; admin-only/contestuale ove previsto | 3 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/richieste/page.tsx` | `/gestionale/richieste` | Staff; admin-only/contestuale ove previsto | 3 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/soci/[id]/page.tsx` | `/gestionale/soci/[id]` | Staff; admin-only/contestuale ove previsto | 3 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/soci/page.tsx` | `/gestionale/soci` | Staff; admin-only/contestuale ove previsto | 3 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/utenti/[id]/elimina/page.tsx` | `/gestionale/utenti/[id]/elimina` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/utenti/[id]/page.tsx` | `/gestionale/utenti/[id]` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestionale/utenti/page.tsx` | `/gestionale/utenti` | Staff; admin-only/contestuale ove previsto | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestione-eventi/[id]/page.tsx` | `/gestione-eventi/[id]` | Staff/responsabile autorizzato | 5 | Non iniziato | NV/NV/NV/NV |
| `app/gestione-eventi/page.tsx` | `/gestione-eventi` | Staff/responsabile autorizzato | 5 | Non iniziato | NV/NV/NV/NV |
| `app/istruttore/page.tsx` | `/istruttore` | Istruttore autorizzato | 6 | Non iniziato | NV/NV/NV/NV |
| `app/nuova-password/page.tsx` | `/nuova-password` | Pubblico/auth; redirect esistenti | 6 | Non iniziato | NV/NV/NV/NV |
| `app/organi-sociali/archivio/[id]/page.tsx` | `/organi-sociali/archivio/[id]` | CdA/staff autorizzati | 5 | Non iniziato | NV/NV/NV/NV |
| `app/organi-sociali/archivio/page.tsx` | `/organi-sociali/archivio` | CdA/staff autorizzati | 5 | Non iniziato | NV/NV/NV/NV |
| `app/organi-sociali/page.tsx` | `/organi-sociali` | CdA/staff autorizzati | 5 | Non iniziato | NV/NV/NV/NV |
| `app/organi-sociali/riepilogo/page.tsx` | `/organi-sociali/riepilogo` | CdA/staff autorizzati | 5 | Non iniziato | NV/NV/NV/NV |
| `app/page.tsx` | `/` | Pubblico/auth; redirect esistenti | 6 | Brand base implementato; redesign non iniziato | NV/NV/NV/NV |
| `app/registrati/informativa-test/page.tsx` | `/registrati/informativa-test` | Pubblico/auth; redirect esistenti | 6 | Non iniziato | NV/NV/NV/NV |
| `app/registrati/page.tsx` | `/registrati` | Pubblico/auth; redirect esistenti | 6 | Non iniziato | NV/NV/NV/NV |
| `app/richiesta/documenti-test/page.tsx` | `/richiesta/documenti-test` | Richiedente/account abilitato | 6 | Non iniziato | NV/NV/NV/NV |
| `app/richiesta/nuova/page.tsx` | `/richiesta/nuova` | Richiedente/account abilitato | 6 | Non iniziato | NV/NV/NV/NV |
| `app/richiesta/stato/page.tsx` | `/richiesta/stato` | Richiedente/account abilitato | 6 | Non iniziato | NV/NV/NV/NV |
| `app/smista/page.tsx` | `/smista` | Pubblico/auth; redirect esistenti | 6 | Non iniziato | NV/NV/NV/NV |
| `app/layout.tsx` | Shell globale | Tutti | 2 | Token e marchio implementati; redesign shell non iniziato | NV/NV/NV/NV |
| `app/gestionale/layout.tsx` | Guard staff | Staff | 2 | Invariato | NV/NV/NV/NV |
| `app/not-found.tsx` | Errore 404 | Contestuale | 6 | Non iniziato | NV/NV/NV/NV |
 
## Configurazioni CRUD
28 moduli censiti da lib/modules.ts; stato non iniziato per tutti; applicare pattern elenco, dettaglio, creazione, modifica, dialog, errore, vuoto e mobile se esistenti. Ruoli da confermare dai controlli server; le voci admin-only rilevate esplicitamente sono mantenute.
| Route | Accesso preliminare | Fase | Stato | D/M/F/S |
|---|---|---|---|---|
| `/gestionale/moduli/anagrafiche` | Staff; verificare restrizioni | 3 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/adesioni` | Staff; verificare restrizioni | 3 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/tesseramenti` | Staff; verificare restrizioni | 3 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/stagioni` | Admin | 5 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/corsi` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/edizioni` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/iscrizioni` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/istruttori` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/qualifiche` | Staff; verificare restrizioni | 4 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/brevetti` | Staff; verificare restrizioni | 3 | Non iniziato | NV/NV/NV/NV |
| `/gestionale/moduli/certificati` | Staff; verificare restrizioni | 3 | Non iniziato | NV/NV/NV/NV |
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