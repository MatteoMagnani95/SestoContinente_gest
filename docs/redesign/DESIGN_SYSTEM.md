# Design system — Fase 1
Base: patch 0020, ramo feature/gestionale-2.0-redesign. Implementazione iniziale in app/design-tokens.css, app/design-system.css, components/ui/Icon.tsx, components/ui/Primitives.tsx.
## Token
Palette richiesta esatta: navy #102B39, teal #087E83, ocean #3679B8, aqua #65C9BE, surface #F3F7F8, white #FFFFFF. Testo secondario #51636F. Petrolio scuro #06696D per link e testo su superfici chiare: il petrolio principale su perla è al limite (non adottato per testo corrente). Font di sistema: nessun download remoto, sans serif per staff e auth. La home pubblica conserva il carattere storico fino alla F4A.
Macroaree: segreteria petrolio, didattica oceano, calendario #695397, attrezzature #946214, contabilità #267348, sistema #475569. Stati: success #166534 / #E8F5EC, warning #854D0E / #FFF4DE, danger #A12637 / #FDECEF, info #1D5D95 / #EAF3FC, neutral #475569 / #EDF1F4. Testo e icona, non solo colore.
Scala 4/8/12/16/20/24/32px; radius 8/12; shadow minima; target 44px, font base 16, H1 28–34 desktop e 26–30 mobile, H2 20–24; focus visibile e motion ridotto. CSS legacy mantenuto e collegato via variabili alias; override caricati per ultimi. Non nascondere overflow globale; affrontare la causa in F2/F3/F6.
## Componenti disponibili
Button (type=button di default; specificare submit), ButtonLink (link reale), PageHeader, SectionHeader, MetricCard, StatusBadge, Alert (announce solo per cambi dinamici), EmptyState, LoadingState, ErrorState, FormField (render callback locale con id/required/aria-invalid/aria-describedby), FormSection (fieldset/legend), FormActions; Icon (SVG decorativa, senza testo autonomo).
MetricCard non crea navigazione fittizia. Collegamenti KPI filtrati rimandati a F4B, quando i filtri esistono.
Dashboard amministrativa come prima integrazione reale: sei metriche, azioni già esistenti, prossime lezioni, errore distinto da lista vuota, scope admin invariato; nessuna query nuova. Non è ancora il redesign completo della dashboard.
## Verifiche
Contrasto calcolato WCAG per le coppie token, test automatici in tests/v26-design-system.test.mjs. Test visuali su tutte le viewport, focus reale, screen reader, zoom e WCAG completa ancora da eseguire.
## Dipendenze successive
F2: AppShell, Sidebar, Header, Breadcrumb, BackButton, UnsavedChangesGuard; F3: DataTable, SearchBar, FilterBar, Pagination, Modal/Drawer/ConfirmDialog, ActionMenu; F4: Tabs, FileUploader, Timeline e NotificationCenter (riuso componenti esistenti). Non rimuovere GlobalCancelButtons finché i form storici non sono migrati. Nessuna modifica DB, RLS, storage, ruoli o server action.

## Esito verifiche F1 (commit 5a15d8df9143a82b899a510cc82f3ccc03bfae4e)
- [CI 45810457357](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45810457357) conclusa success: TypeScript, 130/130 test automatici (5 nuovi, 0 errori, 0 saltati), prebuild e build Next.js. Log job 139876604355: 127 file sorgenti, 289 import, 7 moduli critici; 39/39 pagine statiche generate.
- Vercel status success associato al commit codice. Non è stato aperto né collaudato con utenti autenticati; nessuna attestazione di staging isolato o test visuale.
- T-05: palette, contrasti testo 4.5:1, focus/bordi 3:1, struttura delle primitive e integrazione dashboard verificati automaticamente. SC-05.1/2/3/5 restano Implementato perché copertura visuale/adozione globale non ancora verificata; SC-05.4 in lavorazione per i componenti delle fasi 2–4. Nessun SQL e nessuna modifica a main.

## Fase 2
AppShell, SiteHeader, StaffNav, Breadcrumb e back link integrati; nuove icone locali. Vedi [NAVIGATION.md](NAVIGATION.md) per decisioni e limiti.

## Fase 3
DataTable, SearchBar, FilterBar, Pagination, SearchableSelect, Drawer/Modal/ConfirmDialog, ActionForm e EditForm integrati. Vedi [DATA_UI.md](DATA_UI.md).

## Fase 4A
AuthForm, PasswordField, homepage e applicant surfaces in app/public-ui.css; riutilizzo componenti comuni. Vedi [PUBLIC_AUTH.md](PUBLIC_AUTH.md).

## Fase 4B
Dashboard metric link, quick actions, tab di navigazione e timeline in app/secretariat.css. Vedi [SECRETARIAT.md](SECRETARIAT.md).

## Fase 4C
Riutilizzati DataTable mobileCards, SearchableSelect, Drawer/ConfirmDialog, EditForm, MetricCard, StatusBadge e tab F4B. CourseStudentPicker e CourseLessonFields con input contestuali; LessonComposer con riordino da tastiera. Vedi [COURSES.md](COURSES.md).
