# Gestionale Sesto Continente 2.0 — Fase 0
Data: 2026-11-26. Base esatta: `ea97e2663a3999527b2e3f868c19dfd5b4f646eb`. Ramo: `feature/gestionale-2.0-redesign`.
Nessun merge, modifica applicativa o SQL produzione in questa fase.

# RELEASE_NOTES — NON RILASCIABILE
F0 è un deliverable documentale, non una nuova versione applicativa. Nessun merge su main, nessuna migrazione aggiunta. La CI/Vercel positive appartengono alla base, non alla nuova versione 2.0.

Gate prima del rilascio: copia integrale del capitolato e granularizzazione tracker; staging isolato e account per ruolo; verifica documenti ufficiali; audit completo RLS/storage/RPC; collaudo contabilità, concorrenza, mobile e accessibilità; build nuova; preview verificata; piano rollback per codice e migrazioni; autorizzazione esplicita al merge. Per patch 0019, verificare stato DB senza rieseguirla alla cieca. Nessuna nuova migrazione 0020. Configurazione Vercel production branch e preview environment da confermare.
