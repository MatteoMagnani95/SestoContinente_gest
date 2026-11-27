# Fase 1 — inventario e benchmark
Baseline: 38e27a88aa8de7369e0d7c3578aa585542ad7cd4. Il confronto fb14535→38e27a8 (6 commit, 0 behind) modifica 9 file, nessuna aggiunta/rimozione di route; cambia soltanto la pagina dettaglio corso, action, errori, test e CI/SQL hotfix. Censimento derivato da PAGE_REQUIREMENTS.md sullo SHA esatto e dal gate v43; non equivale a nuovo albero Git ricorsivo (connector senza tree listing). 57 page, 8 handler, 2 layout, 28 configurazioni CRUD. Perimetri storici non sono certificazione dei permessi.
## Route (67 file)
| File | URL | Perimetro storico | Stato storico |
|---|---|---|---|
| `app/accedi/page.tsx` | `/accedi` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/api/cron/promemoria/route.ts` | `/api/cron/promemoria` | cron protetto da verificare | Da analizzare nel dettaglio |
| `app/area-personale/certificato/page.tsx` | `/area-personale/certificato` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-personale/corsi/page.tsx` | `/area-personale/corsi` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-personale/documenti/page.tsx` | `/area-personale/documenti` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-personale/page.tsx` | `/area-personale` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-personale/profilo/page.tsx` | `/area-personale/profilo` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/area-soci/page.tsx` | `/area-soci` | socio abilitato | Da analizzare nel dettaglio |
| `app/auth/callback/route.ts` | `/auth/callback` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/comunicazioni/corsi/[id]/page.tsx` | `/comunicazioni/corsi/[id]` | autorizzazioni contestuali da verificare | Da analizzare nel dettaglio |
| `app/comunicazioni/soci/[id]/page.tsx` | `/comunicazioni/soci/[id]` | autorizzazioni contestuali da verificare | Da analizzare nel dettaglio |
| `app/documenti/[id]/route.ts` | `/documenti/[id]` | utente autenticato; scope RLS | Da analizzare nel dettaglio |
| `app/documenti/page.tsx` | `/documenti` | utente autenticato; scope RLS | Da analizzare nel dettaglio |
| `app/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]/page.tsx` | `/gestionale/amministrazione-dati/dipendenze/[tabella]/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/amministrazione-dati/page.tsx` | `/gestionale/amministrazione-dati` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/archivio-incassi/page.tsx` | `/gestionale/archivio-incassi` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/calendario-visivo/[id]/page.tsx` | `/gestionale/calendario-visivo/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/calendario-visivo/page.tsx` | `/gestionale/calendario-visivo` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/corsi/[id]/page.tsx` | `/gestionale/corsi/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/corsi/[id]/stampe/route.ts` | `/gestionale/corsi/[id]/stampe` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/corsi/nuovo/page.tsx` | `/gestionale/corsi/nuovo` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/corsi/page.tsx` | `/gestionale/corsi` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/economia/page.tsx` | `/gestionale/economia` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/esporta/[modulo]/route.ts` | `/gestionale/esporta/[modulo]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/importazione/modello/route.ts` | `/gestionale/importazione/modello` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/importazione/page.tsx` | `/gestionale/importazione` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/incassi/[id]/page.tsx` | `/gestionale/incassi/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/incassi/page.tsx` | `/gestionale/incassi` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/layout.tsx` | `/gestionale` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/moduli/[modulo]/page.tsx` | `/gestionale/moduli/[modulo]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/moduli/iscrizioni/page.tsx` | `/gestionale/moduli/iscrizioni` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/page.tsx` | `/gestionale` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/programmi-didattici/page.tsx` | `/gestionale/programmi-didattici` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/report/page.tsx` | `/gestionale/report` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/richieste/[id]/page.tsx` | `/gestionale/richieste/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/richieste/page.tsx` | `/gestionale/richieste` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/soci/[id]/page.tsx` | `/gestionale/soci/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/soci/page.tsx` | `/gestionale/soci` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/utenti/[id]/elimina/page.tsx` | `/gestionale/utenti/[id]/elimina` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/utenti/[id]/page.tsx` | `/gestionale/utenti/[id]` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestionale/utenti/page.tsx` | `/gestionale/utenti` | staff (alcune admin-only) | Da analizzare nel dettaglio |
| `app/gestione-eventi/page.tsx` | `/gestione-eventi` | staff/responsabile autorizzato | Da analizzare nel dettaglio |
| `app/istruttore/page.tsx` | `/istruttore` | istruttore autorizzato | Da analizzare nel dettaglio |
| `app/layout.tsx` | `/` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/notifiche/page.tsx` | `/notifiche` | ogni account abilitato; requireUser, notifiche proprie (utente_id e RLS); RPC segna_notifica_letta previa verifica proprietà | Correzione account PR #7: paginazione e lettura; collaudo autenticato richiesto |
| `app/nuova-password/page.tsx` | `/nuova-password` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/organi-sociali/archivio/[id]/page.tsx` | `/organi-sociali/archivio/[id]` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/organi-sociali/archivio/page.tsx` | `/organi-sociali/archivio` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/organi-sociali/documento/[id]/route.ts` | `/organi-sociali/documento/[id]` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/organi-sociali/page.tsx` | `/organi-sociali` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/organi-sociali/riepilogo/page.tsx` | `/organi-sociali/riepilogo` | board/staff; verificare download | Da analizzare nel dettaglio |
| `app/page.tsx` | `/` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/registrati/informativa-test/page.tsx` | `/registrati/informativa-test` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/registrati/page.tsx` | `/registrati` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/richiesta/documenti-test/page.tsx` | `/richiesta/documenti-test` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/richiesta/nuova/page.tsx` | `/richiesta/nuova` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/richiesta/stato/page.tsx` | `/richiesta/stato` | richiedente/utente; verificare guard | Da analizzare nel dettaglio |
| `app/smista/page.tsx` | `/smista` | pubblico/auth/redirect da verificare | Da analizzare nel dettaglio |
| `app/gestionale/attrezzature/[id]/page.tsx` | `/gestionale/attrezzature/[id]` | staff; scheda attrezzatura | Implementata, collaudo autenticato aperto |
| `app/gestionale/incassi/posizione/[id]/page.tsx` | `/gestionale/incassi/posizione/[id]` | staff; posizione debitoria | Implementata, collaudo autenticato aperto |
| `app/gestionale/moduli/attrezzature/page.tsx` | `/gestionale/moduli/attrezzature` | staff; inventario | Implementata, collaudo autenticato aperto |
| `app/gestionale/moduli/consegne/page.tsx` | `/gestionale/moduli/consegne` | staff; prestiti e restituzioni | Implementata, collaudo autenticato aperto |
| `app/gestionale/moduli/contabilita/page.tsx` | `/gestionale/moduli/contabilita` | admin; contabilità | Implementata, collaudo autenticato aperto |
| `app/gestionale/moduli/piscine/page.tsx` | `/gestionale/moduli/piscine` | staff; impianti | Implementata, collaudo autenticato aperto |
| `app/gestionale/moduli/revisioni/page.tsx` | `/gestionale/moduli/revisioni` | staff; revisioni | Implementata, collaudo autenticato aperto |
| `app/gestione-eventi/[id]/page.tsx` | `/gestione-eventi/[id]` | staff o gestore autorizzato dell'evento | Implementata, collaudo autenticato aperto |
| `app/gestionale/incassi/person-options/route.ts` | `/gestionale/incassi/person-options` | QA locale esclusiva; staff autenticato, RLS, no-store, ricerca paginata | Prototipo, non attivo in produzione |
## Componenti (censimento documentale + PR #6/#11, 33 percorsi)
- components/AppShell.tsx
- components/ApplicationForm.tsx
- components/ApplicationReviewForm.tsx
- components/AssociationMailForm.tsx
- components/AuthForm.tsx
- components/CancelEditButton.tsx
- components/CertificateUploadForm.tsx
- components/CodiceFiscaleAssist.tsx
- components/CourseEnrollmentSelect.tsx
- components/CourseLanePicker.tsx
- components/CourseStudentPicker.tsx
- components/Cronologia.tsx
- components/DeferredEditorButton.tsx
- components/Dichiarazioni.tsx
- components/EditForm.tsx
- components/EligibleEnrollmentSelect.tsx
- components/Emergenza.tsx
- components/GlobalCancelButtons.tsx
- components/GlobalSearch.tsx
- components/LessonComposer.tsx
- components/MailContextPage.tsx
- components/RemoveRecord.tsx
- components/SceltaImmagini.tsx
- components/SiteHeader.tsx
- components/StaffNav.tsx
- components/ui/AuthIdentity.tsx
- components/ui/BrandLogo.tsx
- components/ui/Drawer.tsx
- components/ui/Icon.tsx
- components/ui/Primitives.tsx
- components/ui/RemotePersonSelect.tsx
- components/ui/SearchableSelect.tsx
- components/ui/Secretariat.tsx
Componenti non modificati nelle PR potrebbero mancare; confronto con albero ricorsivo e import graph ancora obbligatorio. Preservare AppShell, SiteHeader, StaffNav, GlobalSearch, GlobalCancelButtons, AuthForm, PasswordField, EditForm, DeferredEditorButton, RemotePersonSelect, SearchableSelect, Primitives, Drawer, Icon, AuthIdentity, BrandLogo. Asset ufficiali già presenti: public/brand/sestocontinente-logo.png, sestocontinente-mark.png, nereia-logo.png. Nessuna riscrittura di logo.
## Evidenze 3.1
CI 46007462724 e QA 46007462703 verdi su fb14535. 325 statici e 70 browser ordinari da log job 140534150985. Gate OFF su cinque route autenticate e ricerca disabilitata da log 140534150782. Il benchmark comparativo successivo usa RPC ON sul candidato, latenza HTTP simulata 40ms, 9 campioni, DOM content-ready, non RUM/LCP/INP. NON usare come baseline OFF di 3.2.
| Transizione | 3.0 ms | 3.1 ON ms |
|---|---:|---:|
| Dashboard→Soci |371.3|261.4|
| Soci→Corsi |506.8|248.2|
| Corsi→Calendario |306.5|262.4|
| Calendario→Incassi |1045.8|400.7|
| Incassi→Dashboard |527.1|349.1|
| Somma |2757.5|1521.8|
Riduzione 44.81%; JS static chunks gzip 346714→344683 byte, 35 chunk. Profilo 123→33 chiamate su sei visite con RPC ON. Artifact benchmark 15203840382, profilo 15204200228; metadati e log consultati, ZIP non scaricato/ricontrollato. La run 46034688976 storica ha job database failure e test success; non attribuirla automaticamente al commit finale. Stato di CI esatto 38e27a8 non attestato da endpoint PR.
## Gate Fase 1 ancora aperti
Nuova misura OFF/OFF sul commit esatto 38e27a8 con fixture sintetiche equivalenti: 9 campioni alternati, 40ms HTTP, 5 transizioni e 12 scenari content-ready, TTFB, JS/CSS gzip, image bytes, CLS e LCP separati. Conservare output JSON e screenshot. Non eseguire contro produzione. Gate della 3.2: nessun peggioramento sistematico, confrontare p50/max e ripetere con stesso runner; eventuale soglia numerica va concordata. RPC SC_STRUCTURAL_RPC=false e SC_STRUCTURAL_RPC_RELEASE=false per entrambi i server; non attivare neppure per il benchmark nuovo. Non alterare env Vercel o database. Clone locale non disponibile per DNS; non dichiarare completato inventario fisico o benchmark OFF.
