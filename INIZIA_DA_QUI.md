# Inizia da qui — Aggiornamento della tua app Vercel

Questa consegna aggiorna **un gestionale Fase 1 già operativo**. Non creare una nuova istanza Supabase e non cancellare i dati presenti.

1. Leggi `GUIDA_AGGIORNAMENTO_VERCEL_SUPABASE.md`.
2. Fai una copia/backup di database e repository prima di toccare l'ambiente pubblicato.
3. Applica la migrazione **0002** a un ambiente di test basato su una copia dei dati fittizi.
4. Carica i file aggiornati nel repository collegato a Vercel (senza `.env.local`).
5. Aggiungi le variabili necessarie in Vercel e verifica il deploy.
6. Testa ogni ruolo con dati inventati, poi verifica le autorizzazioni RLS prima di usare l'app con persone reali.

**Non** ri-eseguire `0001_fase1.sql` sul database già configurato. **Non** copiare le password dell'account amministratore negli script.
