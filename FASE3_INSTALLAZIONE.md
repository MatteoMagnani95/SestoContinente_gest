# Sesto Continente — Fase 3.1: dossier soci unificato

Questa consegna **non sostituisce** il progetto online: aggiunge una scheda dettagliata e un elenco soci paginato alla Fase 2 già funzionante. Il pacchetto incrementale è preferibile al progetto intero per ridurre il rischio di sovrascrivere modifiche esistenti.

## Funzioni incluse

- `/gestionale/soci`: elenco paginato lato database (25 righe), ricerca nome/cognome/CF, filtri stagione e stato, link alla scheda.
- `/gestionale/soci/[id]`: anagrafica, storico adesioni e tessere, corsi, quote e versamenti, certificati (solo stato amministrativo), brevetti, documenti collegati, qualifiche/assegnazioni istruttore, attrezzature assegnate, tutori/minori.
- Rettifica dell'anagrafica da staff autorizzato, con validazioni server e audit preesistente della Fase 2.
- Nuova adesione di stagione registrata **da perfezionare**, non automaticamente attiva o pagata.
- View SQL `schede_soci` con `security_invoker=true` che usa i permessi RLS esistenti.
- Test statici, controlli SQL in sola lettura e script opzionale per verificare le RLS con due account fittizi.

## Procedura sicura di aggiornamento

1. **GitHub:** assicurati che la versione corrente sia funzionante. Conserva il commit attuale. Crea una branch `feature/schede-soci-fase3` dal ramo attuale.
2. **Supabase:** prepara un progetto di **test separato**, con lo schema 0001 e 0002 già applicato. Esegui **una volta** `supabase/migrations/0003_schede_soci.sql`. Non eseguire di nuovo 0001 o 0002 e non cancellare alcuna tabella.
3. **Codice:** copia i file della patch mantenendo identiche le cartelle. Se il repository è stato modificato rispetto al pacchetto Fase 2, **confronta le differenze** prima di sovrascrivere i file esistenti.
4. **Vercel:** crea una Preview Deployment della branch di test con variabili che puntano al **Supabase di test**, mai quello con dati reali. Prima di pubblicare su `main`, verifica `npm install`, `npm run typecheck`, `npm run test:static`, `npm run build`.
5. **Verifiche SQL:** esegui `supabase/verifiche/fase3_verifiche_sola_lettura.sql` e conferma RLS, view e bucket privato.
6. **Test con due utenti di prova:** crea due account non amministratori con persone fittizie distinte. Verifica con `npm run test:rls` che l'account A non possa leggere l'anagrafica e i certificati di B, e viceversa. Le credenziali di test vanno SOLO nelle variabili d'ambiente locali, mai su GitHub.
7. Prova la modifica di un recapito da segreteria e verifica `registro_operazioni`; prova una nuova adesione e conferma che sia `da_perfezionare` senza pagamento.
8. Solo dopo esito positivo e backup **verificato** del database, applica 0003 al database previsto per la produzione e integra la branch in `main`.

### Dove caricare le modifiche

La patch contiene i seguenti percorsi da copiare nella radice del repository:

- `app/gestionale/soci/page.tsx` (sostituisce l'elenco precedente)
- `app/gestionale/soci/[id]/page.tsx` (nuova pagina)
- `app/gestionale/soci/actions.ts` (nuove azioni)
- `components/StaffNav.tsx` (cambia l'etichetta menu)
- `app/globals.css` (aggiunge lo stile; attenzione a fondere se modificato)
- `supabase/migrations/0003_schede_soci.sql` (nuova migrazione)
- `supabase/verifiche/fase3_verifiche_sola_lettura.sql` (diagnostica)
- `scripts/test-rls-due-soci.mjs` (test RLS facoltativo)
- `tests/phase3.test.mjs` (test statici)
- `package.json` (versione 0.3.0 e script `test:rls`)

### Limiti e note

- Non è stato effettuato un deploy sulla tua istanza Vercel né un'esecuzione SQL sul tuo Supabase.
- In questo ambiente l'installazione dei pacchetti npm non è disponibile (`EAI_AGAIN` dal registro); i test statici e la sintassi TypeScript/TSX sono verificabili, ma **la build Next.js completa e il typecheck sulle dipendenze reali devono essere eseguiti su Vercel o in locale**.
- La scheda mostra fino a 50 documenti, brevetti, certificati, pagamenti e fino a 100 iscrizioni/adesioni. Per l'intero archivio usare i moduli generali. Non spacciare i contatori dei 50 ultimi record per statistiche globali.
- Non tutti i documenti caricati dall'account hanno già un `persona_id`, quindi potrebbero essere visibili nell'archivio generale ma non nella scheda.
- Il pagamento della quota non implica automaticamente lo stato «attiva»; la competenza per l'approvazione delle adesioni deve essere coerente con lo statuto.
- **Le precedenti credenziali amministrative condivise in chat devono essere cambiate.** Configura MFA per gli amministratori prima di trattare dati reali.
- La Fase 3.1 è focalizzata sui soci; calendario avanzato, didattica definitiva, email transazionali e reporting contabile completo restano attività successive.
