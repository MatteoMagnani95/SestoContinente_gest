# Sesto Continente — Fase 3.4: incassi e saldi controllati

**Base di partenza:** archivio completo Fase 3.3 + hotfix post-collaudo, che il retest del 12/11/2026 ha confermato nei due casi esaminati.  
**Compatibilità prevista:** Next.js 16, Supabase PostgreSQL, Vercel, GitHub.  
**Stato:** patch sorgente verificata staticamente; non installata sul sito, **non collaudata su Supabase reale**.

## Cosa introduce

- `/gestionale/incassi`: elenco di quote associative e addebiti corsi per stagione, stato, con paginazione e filtro facoltativo sul socio.
- Saldi dovuto/versato/residuo aggregati direttamente nel database (`saldi_quote`, nuova vista `saldi_corsi`).
- Registrazione di un versamento dalla stessa schermata, con conferma esplicita, data, metodo, riferimento e nota.
- RPC `registra_pagamento_guidato` (solo amministratore/segreteria), che conserva l'integrazione già esistente con i movimenti contabili.
- Controllo preventivo del pagamento: non può superare il residuo del debito specifico.
- Protezione dal doppio invio **dello stesso modulo** tramite UUID di idempotenza; un nuovo inserimento intenzionale rimane possibile se esiste ancora un residuo.
- Righe contabili e pagamenti esistenti non sono cancellati o riscritti.
- Le scritture dirette a `pagamenti` da account autenticati vengono bloccate da RLS: dopo l'applicazione della migrazione la precedente pagina generica rimanda a quella nuova.
- Modifica dell'importo dovuto bloccata se scenderebbe sotto i pagamenti già contabilizzati.

**Non include ancora:** storni autorizzati, rimborsi, riconciliazione bancaria automatica, ricevute fiscali o invio automatico email. Sono sviluppi successivi. La contabilità resta interna, non sostituisce quella ufficiale.

## Installazione sicura

1. **Backup/branch:** conserva il commit GitHub funzionante e crea una branch `fase3-4-incassi`. Salva un backup verificabile del database esistente.
2. **Test isolato:** prepara un progetto Supabase di test, con dati fittizi e utente staff di prova. Configura una Preview Vercel **collegata solo al progetto Supabase di test**.
3. **Controllo preliminare:** nel SQL Editor del progetto di test esegui `supabase/verifiche/fase34_verifiche_sola_lettura.sql`. Se restituisce anomalie, analizzale prima di proseguire; la migrazione non corregge lo storico automaticamente.
4. **Migrazione:** esegui **una sola volta, in ordine** `supabase/migrations/0006_incassi_controllati.sql`. Non rieseguire migrazioni 0001–0005 già applicate. La migrazione aggiunge colonne e una vista e aggiorna trigger, RLS e una RPC.
5. **Codice:** estrai la ZIP PATCH nella radice del repository di test, preservando percorsi e le eventuali personalizzazioni successive al codice Fase 3.3 + hotfix. Prima di applicare controlla le differenze.
6. **Test di codice:** `npm install` e poi `npm run test:static`, `npm run typecheck`, `npm run build`.
7. **Preview:** apri `/gestionale/incassi` su Vercel Preview con account amministratore/segretaria di test e completa i casi descritti di seguito. Verifica tutte le RLS con account socio e istruttore separati.
8. **Produzione:** soltanto dopo prove positive, backup e verifica dei saldi storici, applica 0006 al database reale e pubblica il codice corretto. Non utilizzare dati o pagamenti reali durante il collaudo.

## Collaudo funzionale con dati fittizi

Usa una quota fittizia di **100,00 €** su persona/stagione fittizie, **nel database di test**.

| Test | Azione | Esito atteso |
|---|---|---|
| P01 | Apri `/gestionale/incassi` come segreteria | Visualizzi posizioni e saldi per stagione |
| P02 | Registra 40,00 € sulla quota test | Versato 40,00 €, residuo 60,00 €; un movimento di entrata da 40,00 € |
| P03 | Invia nuovamente **lo stesso modulo** con identica chiave | Nessun secondo pagamento né nuovo movimento |
| P04 | Tentativo di registrare 60,01 € | Operazione rifiutata; saldi invariati |
| P05 | Registra 60,00 € con nuovo modulo | Saldo 0,00 €, stato pagata; due movimenti (40+60) |
| P06 | Tenta un terzo pagamento | Nessun pulsante disponibile; RPC rifiuta la scrittura eccedente |
| P07 | Prova a ridurre la quota a 99,99 € | Il database deve bloccare la modifica |
| P08 | Crea addebito fittizio corso e registra versamento | Saldo corsi e movimento economico corretti |
| P09 | Accedi come socio e istruttore | Nessun accesso alla pagina gestionale né invocazione RPC autorizzata |
| P10 | Riesegui query SQL sola lettura e confronta rendiconto | Nessun versamento senza contabilità, importi coerenti |

**Controllo importante:** se il sito mostra un errore di rete dopo aver premuto *Registra definitivamente*, verifica prima la cronologia dei versamenti, anziché ripetere con un nuovo modulo: l'operazione potrebbe essere già arrivata al database.

## Rischi e limitazioni

- La migrazione cambia il metodo di scrittura dei pagamenti. **Codice e SQL devono essere distribuiti in modo coordinato**: non aggiornare il database di produzione se l'applicazione corrente usa ancora la pagina generica di inserimento.
- L'RPC impedisce il doppio invio **della stessa richiesta**, non può dedurre automaticamente se due versamenti distinti di pari importo e data siano entrambi reali.
- Non è stata eseguita la build completa in questo ambiente per l'errore di rete `EAI_AGAIN` verso npm. Sono passati 40 test statici; 60 file TS/TSX hanno superato l'analisi sintattica, **non un typecheck completo**.
- Le migrazioni SQL e il workflow end-to-end devono ancora essere verificati nel database Supabase di test. Il collaudo fornito in precedenza non verificava i pagamenti.
- Evita di modificare o eliminare i record `TEST-COLLAUDO` lasciati nei precedenti test finché non è stato concordato un piano di pulizia delle dipendenze.

## File principali della patch

- `supabase/migrations/0006_incassi_controllati.sql`
- `supabase/verifiche/fase34_verifiche_sola_lettura.sql`
- `app/gestionale/incassi/page.tsx`
- `app/gestionale/incassi/actions.ts`
- `lib/payment-tools.ts`
- `components/StaffNav.tsx`, `app/module-actions.ts`, `app/gestionale/moduli/[modulo]/page.tsx`, `app/gestionale/page.tsx`, `app/gestionale/soci/[id]/page.tsx`, `app/globals.css`
- `tests/phase34.test.mjs`
