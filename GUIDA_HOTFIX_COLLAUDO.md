# Sesto Continente — Hotfix post-collaudo (12 novembre 2026)

**Base:** progetto Fase 3.3 già funzionante su Vercel. Aggiornamento incrementale: non sostituisce database e non modifica record esistenti.

## Cosa corregge

1. **Ruolo nel menu laterale:** per un account con ruolo `amministratore`, la testata mostra **Amministrazione**; per l'account `segreteria`, mostra **Segreteria**. La verifica resta lato server con la tabella `ruoli_utente`.
2. **Conflitto prenotazioni:** quando PostgreSQL segnala `23P01` per sovrapposizione di prenotazioni, compare un messaggio che indica corsia e fascia richiesta (se reperibili), ad esempio: «Corsia 1 già prenotata dalle 07/12/2026, 18:00 alle 07/12/2026, 19:00. Scegli un'altra corsia o modifica l'orario.» In caso di duplicato sulla stessa lezione (`23505`) compare un messaggio distinto. Non vengono esposti errori SQL grezzi.

## File da aggiornare (solo questi)

- `app/gestionale/layout.tsx`
- `app/module-actions.ts`
- `app/gestionale/moduli/[modulo]/page.tsx`
- `tests/collaudo-hotfix.test.mjs` (nuovo test; facoltativo ma consigliato)

**Non è necessaria alcuna migrazione SQL**. Non rieseguire `0001`–`0005` e non modificare Supabase, password o variabili d'ambiente.

## Installazione sicura

1. Sul repository GitHub, salva il riferimento all'ultimo commit funzionante della Fase 3.3.
2. Crea una branch di prova e copia i file della patch, rispettando le cartelle. Se hai modificato manualmente quei file dopo la Fase 3.3, confrontali con il file `.diff` allegato invece di sovrascrivere indiscriminatamente.
3. Apri una **Preview Deployment** di Vercel. Le due modifiche sono di sola interfaccia; per verificare l'effettivo blocco della sovrapposizione usa preferibilmente un Supabase di test, non dati reali.
4. Controlla che il deploy esegua `npm run build` senza errori di TypeScript.
5. Collaudo amministratore: accedi con il tuo account amministratore e verifica che la barra laterale riporti **Amministrazione** e la gestione utenti continui ad essere accessibile.
6. Collaudo segreteria: con un account di segreteria di prova, verifica **Segreteria** nel menu e l'assenza di funzioni admin-only.
7. Collaudo prenotazioni: nel database di test crea due lezioni che richiedono la stessa corsia in orari sovrapposti. Il secondo inserimento deve essere bloccato; in `/gestionale/moduli/prenotazioni` deve comparire il messaggio con corsia e fascia richiesta. Controlla che sia rimasta **una sola prenotazione confermata**.
8. Per un errore non legato all'occupazione della corsia (per esempio campo obbligatorio mancante), deve rimanere un messaggio appropriato, non «Corsia occupata».
9. Solo dopo verifica positiva, unisci la branch su `main` e controlla il nuovo deploy Vercel.

## Stato dei test eseguiti prima della consegna

- Test statici del progetto inclusi nella Fase 3.3 e nuovi test hotfix: **33/33 superati**.
- Analisi della sintassi TS/TSX: **54 file controllati, 0 errori di sintassi**.
- **Build completa Next.js NON eseguita in locale**: la risoluzione DNS verso `registry.npmjs.org` ha impedito l'installazione delle dipendenze (`EAI_AGAIN`). Esegui la build su Vercel.
- **Non testato con Supabase reale**: il collaudo funzionale deve essere ripetuto nell'ambiente di prova.

## Cosa NON fa questo hotfix

Non crea account di prova, non invia email, non esegue migrazioni, non pulisce i record `TEST-COLLAUDO` rimasti dal test precedente e non attesta la sicurezza delle aree non collaudate. Questi interventi sono separati e vanno fatti su database di test isolato.

Per il rollback, riporta il repository al commit funzionante precedente. Non è necessaria alcuna operazione di rollback sul database.
