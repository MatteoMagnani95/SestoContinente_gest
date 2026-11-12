# Changelog Fase 3.1 — 12 novembre 2026

## Aggiunto
- Vista sicura `public.schede_soci` e indice di ricerca delle adesioni.
- Ricerca, filtro per stagione e stato, paginazione server dell'elenco soci.
- Scheda socio con anagrafica, adesioni, tesseramenti, corsi, pagamenti, certificati, brevetti, documenti, qualifiche, attrezzature, famiglia.
- Aggiornamento anagrafico staff con validazioni e tracciamento delle modifiche tramite trigger esistente.
- Registrazione adesione da perfezionare, senza pagamento o tesseramento automatico.
- Script read-only RLS a due utenti fittizi, checklist SQL e test automatici.

## Non incluso
- Non sono state modificate le credenziali né le impostazioni Supabase/Vercel della produzione.
- Non è stato effettuato il deploy e non è stata eseguita la migrazione su un database reale.
- La Fase 3.1 non completa ancora il calendario avanzato, la didattica federale né il reporting contabile definitivo.
