# Changelog — Fase 3.3

- Nuova migrazione additiva `0005_calendario_economico.sql`.
- Gestione lezioni e corsie con operazioni transazionali SQL e annullamento logico.
- Filtro per piscina, agenda mensile/settimanale e matrice delle prenotazioni.
- Nuova funzione di riepilogo contabile SQL, visibile solo agli amministratori.
- Esportazioni CSV paginate con limite esplicito, senza tagli silenziosi.
- Notifiche interne di annullamento lezione.
- Esclusione lezioni annullate dai pannelli operativi.
- Test statici specifici su fuso orario italiano, sicurezza e coerenza SQL.

**Nota di rilascio:** codice pronto per prova in staging; la build completa Next.js e l'esecuzione SQL su Supabase devono ancora essere validate nel progetto di destinazione.
