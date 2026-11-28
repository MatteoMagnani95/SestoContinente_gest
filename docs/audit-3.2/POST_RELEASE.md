# Audit post-release 3.2 — 28 novembre 2026

Baseline produzione 2bc0701193b1ca07dd0da90af349d99c0e120964. Utente conferma Deploy to production OFF su Supabase; da verificare salvataggio prima di qualsiasi aggiornamento main. Nessun deploy, merge, scrittura DB, upgrade o RPC strutturale.

| ID | Difetto dimostrato dal sorgente | Correzione candidata | Stato |
|---|---|---|---|
| POST-001 | Import CSV solo virgola, file semicolon italiani rifiutati pur essendo CSV | Rilevamento delimitatore da intestazioni complete, quoting e limiti preservati | CI da eseguire |
| POST-002 | Registro PDF wrapping 98 caratteri, parole non spezzate e titolo non misurato | Misura font reale e wrapping anche titoli e parole lunghe | CI da eseguire |
| POST-003 | Notifica letta: RPC errore trasporto + stato persistito letto produce falso errore | Esito persistito sotto controllo proprietà, coerente area personale | CI da eseguire |
| POST-004 | Cron seleziona 50 prime notifiche; destinatari non idonei monopolizzano la selezione | Keyset stabile (creata_il,id), scansione fino a 500 e 40s, max 50 tentativi invio, contatori espliciti | CI da eseguire; mitigazione limitata, non garanzia oltre budget |

Test nuovi tests/post-release-3.2.test.mjs. Cron mock senza rete/invio, prova 51 non idonei e successivo idoneo. Non modificato stato email o configurazione live; non noto se invio automatico sia abilitato. Ulteriori rischi: oltre 500 notifiche non idonee o scadenza budget resta possibile starvation, richiede strategia persistente separata; export offset in presenza di scritture concorrenti; cancellazione documenti multi-sistema, da approfondire senza dati reali. Nessun difetto di questi ultimi dichiarato corretto. Modello ufficiale import XLSX, CSV semicolon è compatibilità con formato comune non promessa di roundtrip completo export/import.

Log Vercel ultime 30 min senza error/fatal raggruppati; retention piano non permette interrogazione richiesta 1h. Nessun collaudo autenticato live.
