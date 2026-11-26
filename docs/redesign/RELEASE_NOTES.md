# Gestionale Sesto Continente 2.0 — Fase 0
Data: 2026-11-26. Base esatta: `ea97e2663a3999527b2e3f868c19dfd5b4f646eb`. Ramo: `feature/gestionale-2.0-redesign`.
Nessun merge, modifica applicativa o SQL produzione in questa fase.

# RELEASE_NOTES — NON RILASCIABILE
F0 è un deliverable documentale, non una nuova versione applicativa. Nessun merge su main, nessuna migrazione aggiunta. La CI/Vercel positive appartengono alla base, non alla nuova versione 2.0.

Gate prima del rilascio: granularizzazione tracker; staging isolato e account per ruolo; verifica documenti ufficiali; audit completo RLS/storage/RPC; collaudo contabilità, concorrenza, mobile e accessibilità; build nuova; preview verificata; piano rollback per codice e migrazioni; autorizzazione esplicita al merge. Per patch 0019, verificare stato DB senza rieseguirla alla cieca. Nessuna nuova migrazione 0020. Configurazione Vercel production branch e preview environment da confermare.

## Fase 1 — anteprima, non produzione
Token e primitive introdotti, dashboard usata come integrazione iniziale. Non è un rilascio 2.0. CI e stato Vercel verificati sul commit di F1; test visivi/staging ancora aperti.

## Esito verifiche F1 (commit 5a15d8df9143a82b899a510cc82f3ccc03bfae4e)
- [CI 45810457357](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45810457357) conclusa success: TypeScript, 130/130 test automatici (5 nuovi, 0 errori, 0 saltati), prebuild e build Next.js. Log job 139876604355: 127 file sorgenti, 289 import, 7 moduli critici; 39/39 pagine statiche generate.
- Vercel status success associato al commit codice. Non è stato aperto né collaudato con utenti autenticati; nessuna attestazione di staging isolato o test visuale.
- T-05: palette, contrasti testo 4.5:1, focus/bordi 3:1, struttura delle primitive e integrazione dashboard verificati automaticamente. SC-05.1/2/3/5 restano Implementato perché copertura visuale/adozione globale non ancora verificata; SC-05.4 in lavorazione per i componenti delle fasi 2–4. Nessun SQL e nessuna modifica a main.
