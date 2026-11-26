# Fase 6 — Responsive, tablet, tastiera e accessibilità

## Implementazione
- SC-36.1: menu mobile già chiuso di default, focus al contenuto dopo una navigazione, ritorno al trigger alla chiusura, sidebar solo desktop; nessuna modifica alle guard.
- SC-36.2/36.4: nuovo layer finale `app/responsive-accessibility.css`, margini 16 px/safe area, wrapping dei testi lunghi, campi almeno 16 px nelle viste mobili, controlli principali almeno 44 px, moduli compatti, pannelli fullscreen fino a 768 px. Non maschera overflow globale. Tabelle a schede <=600 px, ruoli espliciti in DataTable per rowgroup/row/columnheader/rowheader/cell anche dentro Fragment; tabella larga resta scorrevole localmente. Calendario agenda predefinita anche desktop (decisione per evitare rilevamento UA e doppia query), quattro viste esplicite intatte.
- SC-36.3: blocco scroll dello sfondo con dialog aperto, scroll-padding, header non sticky in viewport bassa, VisualViewport come miglioramento progressivo, nessuna limitazione al pinch zoom; fallback vh/dvh. Safe area mediante env(). Il ridimensionamento reale della tastiera iOS e la safe area fisica richiedono device.
- SC-37: focus esplicito legacy con colore contrastato, link testuali distinguibili, contrasto bordo controlli rafforzato, errori generici EditForm focalizzati dopo riabilitazione campi, label SearchableSelect, reduced motion e forced colors. La conformità WCAG 2.2 AA non è certificata: test automatici mirati non sostituiscono lettura con VoiceOver/TalkBack, zoom e audit manuale di ogni pagina.

## File principali
- app/layout.tsx, app/responsive-accessibility.css
- components/AppShell.tsx, components/EditForm.tsx, components/ui/DataTable.tsx, components/ui/SearchableSelect.tsx
- lib/calendar-tools.ts
- tests/browser/public.spec.mjs, tests/browser/staff.spec.mjs, tests/browser/roles.spec.mjs, tests/v42-responsive-accessibility.test.mjs, playwright.config.mjs

## Prove automatiche e limiti
- CI F5 finale d617578 [45861539071](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45861539071): entrambi job success.
- CI F6 checkpoint 768b6f6 [45862178519](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45862178519): entrambi job success; 214/214 statici, lint, TypeScript, build, 54/54 browser Chromium/WebKit. Pagine pubbliche reali su server locale e simulazioni touch/orientamento; fixture HTML sintetica renderizzata con DataTable reale e CSS di produzione, non pagina staff autenticata. Dieci viewport per fixture, dialoghi con date/ore, conferma raggiungibile, salto al contenuto e menu keyboard. Migrazioni/database success, nessun cambiamento SQL F6.
- Nuovi test viewport ridotta (CSS simulato, non tastiera reale), contrasto palette e semantica markup, matrice ruoli e staff: verificare CI ultimo head. Nessuna sessione autenticata disponibile qui.
- Vercel continua a riportare limite build anteprime; GitHub Actions esegue build e browser locali indipendentemente. Nessun screenshot di anteprima reale verificato.

## Collaudo autenticato opzionale
Usare esclusivamente Supabase locale isolato, account sintetici, server Next locale e `QA_ISOLATED_ENV=true`; la configurazione rifiuta endpoint non localhost in caso di storage state autenticato. Verificare che il server Next in esecuzione usi lo stesso Supabase locale, non una configurazione ereditata di produzione.
Impostare NEXT_PUBLIC_SUPABASE_URL locale e, se disponibili, QA_STAFF_STATE (admin), QA_SECRETARY_STATE, QA_MEMBER_STATE (socio attivo e quota saldata), QA_INSTRUCTOR_STATE (istruttore assegnato), QA_BOARD_STATE (consigliere), QA_APPLICANT_STATE (richiedente confermato senza pratica inviata). State Playwright in file privati fuori dal repository, mai committare cookie o token. QA_FIXTURE_IDS opzionale JSON con UUID sintetici person, edition, lesson, event, equipment, request, payment, account, minutes. npm run test:browser. Test in sola lettura salvo modifiche di bozza non salvate. La presenza dei test non equivale a esecuzione.

## Gate residui
- Ultimo head CI, collaudo autentico di tutte le route/ruoli e dettagli, controllo iPhone/iPad reali e Chrome reale con tastiera, VoiceOver/TalkBack, reflow a zoom 200/400%, contrasto effettivo di tutte le combinazioni, assenza di clipping in dati lunghi reali sintetici.
- Nessun deploy produzione, main invariato, PR #4 bozza.


## Chiusura implementativa e verifica finale
- CI [45862415180](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45862415180), commit 3891a0a, e [45862646270](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45862646270), commit 28ba37c: entrambi job success; 218/218 statici e 56/56 browser, incluso il test viewport visibile ridotta, contrasto palette e semantica. Lint, TypeScript, build e database success. Configurazione dei progetti autenticati presente ma senza sessioni nella CI pubblica.
- db1feb5: PasswordField distingue tramite nome accessibile la password e la conferma; il nome inizia con il testo visibile Mostra/Nascondi e rispecchia l'azione corrente. f72d86c: prova Playwright di etichette, attivazione da tastiera, conservazione spazi e reflow a 640 e 320 CSS px (equivalenti a 200% e 400% su viewport iniziale di 1280 px). Non è un test del pinch zoom o dello zoom browser nativo. Verificare esito CI di questo checkpoint.
- Tutti i gruppi implementativi SC-36.1–36.4 e SC-37 sono trattati nel codice; SC-36.5 verificato sulle pagine pubbliche e componenti sintetici, con matrice autenticata predisposta. Il gate di rilascio G4 della F7 resta aperto per le prove fisiche e autenticate, non trasferite implicitamente allo stato superato. Nessuna dichiarazione di conformità WCAG completa.

### Scheda di collaudo manuale da allegare al gate G4
Registrare per ciascuna prova SHA, dispositivo/OS, browser e versione, ruolo sintetico, pagina, orientamento, zoom, esito e descrizione di eventuali difetti; evitare dati personali negli screenshot.
| Scenario | Criterio di accettazione | Stato |
|---|---|---|
| Safari iPhone, verticale/orizzontale, barre dinamiche | Header compatto, safe area, nessun overflow globale, menu e dialoghi raggiungibili | Da eseguire su device |
| Safari iPad, verticale/orizzontale e split view | Nessun controllo fuori schermo; drawer e tabelle leggibili | Da eseguire su device |
| Tastiera virtuale su data/ora, select, ricerca, textarea | Focus e pulsante finale raggiungibili con tastiera aperta e chiusa; contenuto non coperto | Simulazione CI superata; device aperto |
| Zoom browser 200% e 400%, pinch zoom | Contenuto disponibile senza perdita; scroll orizzontale solo per tabelle necessarie | Reflow automatico; zoom reale aperto |
| VoiceOver iOS/macOS e TalkBack Chrome Android | Titoli, landmark, nomi, errori, stati, celle e azioni annunciati; focus coerente | Da eseguire con screen reader |
| Contrasto, zoom testo e movimento ridotto | Testo 4,5:1 (3:1 se grande), componenti rilevanti 3:1, nessun significato solo colore | Token verificati; combinazioni reali da verificare |
| Sei ruoli con fixture sintetiche e tutti i 28 moduli staff | Menu coerente con ruolo, nessun clipping, controlli raggiungibili, accessi vietati negati | Test predisposti; sessioni isolate necessarie |
| Salvataggio/annullamento, errore server e dirty guard | Focus corretto e bozza conservata, nessuna perdita silenziosa | Test mirati; scenari autenticati aperti |
