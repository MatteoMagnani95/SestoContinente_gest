# Sesto Continente — Fase 3.3: calendario avanzato e rendiconto

Aggiornamento **incrementale** per la Fase 3.2 in produzione. Stack: Next.js 16, Supabase/PostgreSQL, GitHub, Vercel. Non ripetere le migrazioni 0001–0004.

## Cosa aggiunge

- `/gestionale/calendario-visivo`: calendario settimanale/mensile, filtro piscina, occupazione corsie in tabella.
- `/gestionale/calendario-visivo/[id]`: modifica titolo/orario/piscina/corsie e annullamento logico; conflitti risolti dal database.
- `/gestionale/economia`: rendiconto aggregato per anno, mese, categoria, accessibile **solo agli amministratori**.
- `Report e scadenze`: il totale entrate/uscite viene dal database anziché da un campione di 5.000 righe.
- CSV dei moduli: esportazione paginata in ordine stabile, fino a 50.000 righe, con errore esplicito se il limite è superato.
- Le lezioni annullate sono nascoste negli elenchi operativi di allievi, istruttori e segreteria, pur rimanendo nello storico.
- Un annullamento produce notifiche interne per allievi iscritti e istruttori assegnati (non garantisce automaticamente email inviate).

## Ordine corretto di installazione

1. Esegui un **backup verificabile** del database di produzione e salva il commit GitHub ora funzionante.
2. Crea una **branch di prova**. Aggiungi la patch mantenendo i percorsi, senza sovrascrivere `0001_fase1.sql` ... `0004_corsi_guidati.sql`.
3. Usa una **copia Supabase di test** che contenga le migrazioni 0001–0004. Apri **Supabase → SQL Editor** ed esegui **una sola volta** `supabase/migrations/0005_calendario_economico.sql`.
4. In Vercel crea una **Preview Deployment collegata alla copia Supabase di test**. Le variabili `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o la publishable key usata nel progetto) e le altre variabili devono puntare all'ambiente test, non a produzione.
5. Attendi `npm run build` senza errori; prova i casi sottostanti con soli dati fittizi.
6. Solo dopo le verifiche, applica `0005_calendario_economico.sql` al database di produzione, quindi pubblica su `main`.
7. Verifica di nuovo i permessi in produzione con account di prova. Se non funziona, torna al commit precedente; **non** eliminare alla cieca le nuove colonne o le funzioni SQL.

## Collaudo funzionale: 10 scenari

1. Crea un corso attivo con periodo che includa la data scelta e due corsie nella piscina di prova.
2. Programma una lezione lunedì alle 19:00, corsia 1: appare sul calendario e sulla tabella occupazioni.
3. Modifica il titolo: la lezione resta collegata al corso.
4. Sposta l'orario: si aggiornano le prenotazioni e parte la notifica interna.
5. Sposta da corsia 1 a corsia 2: la prima non deve risultare più occupata.
6. Prova a prenotare corsia 2 con altro corso nello stesso orario: il sistema rifiuta l'operazione, lasciando invariata la prenotazione precedente.
7. Annulla una lezione senza presenze: la corsia si libera e la lezione scompare dai calendari operativi; resta consultabile tramite il link diretto.
8. Se una lezione ha già presenze registrate, spostamento e annullamento devono essere bloccati.
9. Apri `/gestionale/economia` con account **amministratore**: verifica totali e categorie usando versamenti e movimenti di prova. Con account **segreteria** la pagina deve essere inaccessibile.
10. Scarica il CSV contabilità e confronta il numero delle righe esportate con le registrazioni in database (per dimensioni entro il limite pubblicato).

## Sicurezza e limiti dichiarati

- Ogni funzione di modifica usa `SECURITY INVOKER`, controlla `is_staff()` e rispetta le policy RLS. La funzione economica usa `is_admin()`.
- Le prenotazioni concorrenti sono protette dalla constraint `EXCLUDE` sulla tabella `prenotazioni_corsie` presente dalla Fase 2. Il controllo visivo è informativo, **non** garantisce la disponibilità contrattuale dell'impianto.
- Annullamento **non** equivale a cancellazione fisica: i dati storici e le presenze restano intatti.
- Date e ore sono interpretate come `Europe/Rome`; le ore inesistenti/ambigue al cambio tra ora solare e legale vengono rifiutate dal modulo.
- Il calendario limita la lettura a 1.000 lezioni / 2.000 prenotazioni per periodo e avverte se raggiunge quei limiti. Imposta filtri più ristretti per volumi maggiori.
- I contatori delle scadenze in `/gestionale/report` sono ancora una **vista parziale** e non devono essere usati come report ufficiali. Il rendiconto economico, invece, è aggregato nel database senza campionamento.
- Il CSV usa batch da 500 e interrompe esplicitamente oltre 50.000 righe (HTTP 413).
- L'email automatica richiede `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` e la configurazione cron già prevista nella Fase 2. **Non introdurre credenziali nei sorgenti.**

## Verifiche locali disponibili

`npm run test:static` verifica controlli strutturali, logiche su date e fuso, autorizzazioni e presenza della migrazione. Non prova l'esecuzione PostgreSQL reale né la build Next.js: entrambi vanno collaudati in staging.

## Prossimo lavoro suggerito

Consolidare pagamenti e scadenze: riepilogo quote preciso da SQL, riconciliazione finanziaria con ricevute, storico dei promemoria email e vista errori dello scheduler. Prima dell'attivazione su dati sanitari reali sono necessari privacy, ruoli, logging, backup e test RLS dedicati.
