# Sesto Continente v12 — Consegna e checklist

Data: 2026-11-16  
Base: archivio allegato **SestoContinente_gest-main.zip** (non una ricostruzione).

## Esito della consegna

- **35/35** specifiche MOD considerate, con implementazione locale predisposta per tutte; **3 con limitazioni funzionali** (MOD-14, MOD-18, MOD-20).
- **16/16** record PRE nel file SQL di seed idempotente, **non ancora importati nel database online**.
- **47 test statici riusciti (47/47)**; 75 file TS/TSX controllati sintatticamente, nessun parsing error.
- **Non eseguiti**: `npm run typecheck`, `npm run build`, migrazioni in Supabase, test RLS con utenti effettivi, test E2E, deployment su Vercel. Il tentativo npm non ha completato l'installazione delle dipendenze.
- **Produzione non modificata**. Nessun database live è stato collegato da questa sessione.

## Checklist MOD-01 — MOD-35

| ID | Stato | Implementazione e note |
|---|---|---|
| MOD-01 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Campi anagrafici provincia di nascita.  |
| MOD-02 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Campi anagrafici stato di nascita.  |
| MOD-03 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Campi anagrafici provincia di residenza.  |
| MOD-04 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Campi anagrafici stato di residenza.  |
| MOD-05 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Data di versamento sincronizzata con registrazione guidata.  |
| MOD-06 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Canale pagamento Bonifico Bancario / Cassa / POS.  |
| MOD-07 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Validatore CF con checksum e confronto anagrafico; override motivato.  |
| MOD-08 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Calcolo CF da dati di nascita e codice catastale verificato.  |
| MOD-09 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Dichiarazione Statuto obbligatoria e versionata.  |
| MOD-10 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Presa visione informativa privacy obbligatoria e versionata.  |
| MOD-11 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Consenso immagini facoltativo, indipendente.  |
| MOD-12 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Costo corso da listino dinamico con importo libero.  |
| MOD-13 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Elenco istruttori qualificati (non anagrafiche globali).  |
| MOD-14 | PARZIALE (da completare / verificare) | Pulsante Annulla non-submit nei form principali e recupero automatico nei form legacy. I form legacy sono gestiti tramite un fallback client; è necessaria verifica manuale di tutte le schermate. |
| MOD-15 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Area Organi Sociali, componenti da anagrafiche.  |
| MOD-16 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Cariche CdA da enum UI e vincolo DB.  |
| MOD-17 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Quadriennio calcolato e verificato nel DB.  |
| MOD-18 | PARZIALE (da completare / verificare) | Upload e archivio privato delle bozze DOCX (non .doc legacy). Il formato Word binario .doc non è gestito: upload e conversione disponibili solo per .docx. |
| MOD-19 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Quorum completo e voti nominativi registrati per seduta.  |
| MOD-20 | PARZIALE (da completare / verificare) | PDF definitivo creato dopo unanimità; trascrizione testuale (non layout Word). Il PDF contiene il testo ma non conserva necessariamente grafica, tabelle o impaginazione DOCX. |
| MOD-21 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Archivio didattico di moduli riutilizzabili.  |
| MOD-22 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Composizione modulare con riordinamento drag&drop.  |
| MOD-23 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Registro firme lezione piscina PDF.  |
| MOD-24 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Registro firme lezione teoria PDF.  |
| MOD-25 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Programma corso completo PDF.  |
| MOD-26 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Wizard Excel/CSV soci, anteprima e quarantena CF; attestazione documentale. I flag storici sono registrati come accettati soltanto con attestazione di base documentale: non inventare consensi GDPR. |
| MOD-27 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Wizard storico corsi Access, associazione tramite CF senza duplicazioni.  |
| MOD-28 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Download modelli XLSX per entrambi i tracciati.  |
| MOD-29 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Tipologie verbale adesioni/ordinaria/misto.  |
| MOD-30 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Adesioni associate alla seduta, attivazione atomica post-approvazione.  |
| MOD-31 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Data delibera CdA nella scheda unificata con collegamento al verbale.  |
| MOD-32 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Vista SQL minima per istruttore + calendario/presenze dei soli propri corsi.  |
| MOD-33 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Ruolo consigliere con votazione CdA, report aggregato e nessuna vista sanitaria.  |
| MOD-34 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Area socio: propri dati, certificato privato e materiali dei propri corsi.  |
| MOD-35 | IMPLEMENTATO NEL CODICE (da collaudare su Supabase) | Separazione amministratore/segreteria con gestione ruoli solo admin.  |

**Interpretazione degli stati:** “Implementato nel codice” non equivale a “migrato e collaudato sul database reale”. Le protezioni RLS, lo storage e i workflow devono superare prove in un clone Supabase prima dell'uso con dati di soci.

## Dati didattici PRE-01 — PRE-16

| ID | Stato | Destinazione |
|---|---|---|
| PRE-01 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-02 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-03 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-04 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-05 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-06 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-07 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-08 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-09 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-10 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-11 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-12 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-13 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-14 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-15 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |
| PRE-16 | Incluso in `0009_precaricamento_didattica.sql`, idempotente | `public.moduli_didattici` |

## File aggiunti (23)

- `app/area-personale/certificato/actions.ts`
- `app/area-personale/certificato/page.tsx`
- `app/gestionale/corsi/[id]/stampe/route.ts`
- `app/gestionale/importazione/actions.ts`
- `app/gestionale/importazione/modello/route.ts`
- `app/gestionale/importazione/page.tsx`
- `app/gestionale/programmi-didattici/page.tsx`
- `app/organi-sociali/actions.ts`
- `app/organi-sociali/documento/[id]/route.ts`
- `app/organi-sociali/page.tsx`
- `app/organi-sociali/riepilogo/page.tsx`
- `components/CodiceFiscaleAssist.tsx`
- `components/GlobalCancelButtons.tsx`
- `components/LessonComposer.tsx`
- `lib/cda-pdf.ts`
- `lib/codice-fiscale.ts`
- `lib/importazione.ts`
- `lib/pdf-registro.ts`
- `supabase/migrations/0007_ruolo_cda.sql`
- `supabase/migrations/0008_v12_sicurezza_organi_didattica_import.sql`
- `supabase/migrations/0009_precaricamento_didattica.sql`
- `supabase/migrations/0010_v12_riepilogo_cda_certificati.sql`
- `tests/v12.test.mjs`

## File modificati (25)

- `.env.example`
- `app/actions.ts`
- `app/area-personale/corsi/page.tsx`
- `app/area-personale/page.tsx`
- `app/gestionale/corsi/[id]/page.tsx`
- `app/gestionale/corsi/actions.ts`
- `app/gestionale/corsi/nuovo/page.tsx`
- `app/gestionale/incassi/actions.ts`
- `app/gestionale/incassi/page.tsx`
- `app/gestionale/moduli/[modulo]/page.tsx`
- `app/gestionale/soci/[id]/page.tsx`
- `app/gestionale/soci/actions.ts`
- `app/gestionale/utenti/actions.ts`
- `app/gestionale/utenti/page.tsx`
- `app/istruttore/page.tsx`
- `app/layout.tsx`
- `app/module-actions.ts`
- `app/smista/page.tsx`
- `components/ApplicationForm.tsx`
- `components/StaffNav.tsx`
- `lib/modules.ts`
- `lib/security.ts`
- `next.config.ts`
- `package.json`
- `tests/phase32.test.mjs`

## File rimossi (0)

Nessuno.

## Misure di sicurezza e privacy

1. L'accesso alle anagrafiche e ai dati sanitari è limitato con **RLS** e funzioni RPC controllate; il solo filtraggio delle schermate non viene considerato sufficiente.
2. Il PDF approvato dal CdA è in un bucket privato e non viene sovrascritto tramite le policy previste.
3. I documenti sanitari restano privati, il caricamento del socio non conferma l'idoneità senza controllo della segreteria.
4. Nell'import storico, l'attestazione della documentazione è **obbligatoria** prima di registrare la presa visione dello Statuto e la consegna dell'informativa. Non è giuridicamente lecito attribuire automaticamente un consenso non prestato.
5. L'informativa privacy è una dichiarazione di presa visione, non un generico consenso obbligatorio a tutti i trattamenti; il consenso immagini è opzionale.
6. Configurare e verificare le versioni reali di Statuto e informative. La presenza di flag e RLS **non certifica da sola conformità GDPR**: verificare base giuridica, minimizzazione, retention, accessi e procedure di esercizio dei diritti.

## Installazione in ambiente di test, NON produzione

1. Creare un **backup verificato e ripristinabile** di dati e file Storage e un clone Supabase di test separato dalla produzione. Conservare un tag del repository attuale.
2. Dal repository base esistente con migrazioni 0001–0006 già applicate, eseguire `0007_ruolo_cda.sql` **in una transazione distinta** e attendere il COMMIT. Poi `0008_v12_sicurezza_organi_didattica_import.sql`, `0009_precaricamento_didattica.sql`, `0010_v12_riepilogo_cda_certificati.sql` in quest'ordine. Non rieseguire le migrazioni storiche 0001–0006.
3. Verificare che `0009` inserisca 16 `pre_id` senza duplicati (es. `select count(*) from public.moduli_didattici where pre_id like 'PRE-%'`).
4. Aggiornare variabili d'ambiente dai nomi in `.env.example`, in particolare `NEXT_PUBLIC_STATUTO_URL`, `NEXT_PUBLIC_PRIVACY_URL`, `STATUTO_VERSION`, `PRIVACY_VERSION`. Non pubblicare password o service-role key.
5. In un ambiente con accesso al registro npm eseguire `npm install`, `npm run test:static`, `npm run typecheck`, `npm run build`; correggere ogni errore prima del merge.
6. Pubblicare una **Preview Vercel** collegata al database *di test*. Provare con almeno cinque account fittizi, uno per ruolo, chiamate API dirette, upload privati, due voti CdA, quarantena duplicati, import/rollback, e PDF dei registri.
7. Esaminare manualmente l'aspetto dei DOCX convertiti: al momento è garantita solo la trascrizione del testo, non il layout Word. Per Word `.doc` legacy è necessaria una conversione preliminare esterna in `.docx`.
8. Solo dopo il verbale di collaudo RLS e una seconda verifica del backup, pianificare la distribuzione su produzione; non sono state eseguite modifiche live da questa conversazione.

## Limiti residui

- Le macro o i report di Microsoft Access non vengono importati direttamente: sono supportati **Excel/CSV** esportati da Access; gli ID delle edizioni devono essere riconciliati prima della migrazione.
- Il wizard non offre editing inline delle righe in quarantena: correggere e ricaricare il file di partenza.
- Il fallback Annulla per i form legacy va collaudato pagina per pagina.
- Il formato `.doc` binario è escluso; il DOCX viene convertito in PDF tramite ricostruzione del solo testo.
- Il collaudo multi-utente e la verifica effettiva dei trigger/RLS richiedono un database Supabase di prova configurato.
