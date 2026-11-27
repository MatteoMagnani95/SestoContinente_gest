# Sesto Continente 3.1 — migrazione e attivazione controllata
Stato: NO-GO produzione. Migrazione generata da Supabase CLI 3.4.0, run 45998093460, nome `20261127122235_structural_read_snapshots.sql`.
## Perimetro
Sette funzioni additive di sola lettura. Non si modificano tabelle, dati, RLS, trigger, permessi delle tabelle, storage, utenti o cron. Tutte SECURITY INVOKER, STABLE, search_path vuoto. L'account viene verificato con auth.getUser e controlli server esistenti. Nessuna cache condivisa.
## Attivazione (solo CI locale)
1. Supabase locale effimero: sequenza normale delle migrazioni, verifica migration list --local e firme/ACL.
2. Avviare il candidato con SC_STRUCTURAL_RPC=true, QA_ISOLATED_ENV=true, SESTO_TEST_MODE=true, SESTO_EMAIL_MODE=simulate, endpoint Supabase HTTP loopback:54321. Senza tutte le condizioni il codice resta sul percorso precedente.
3. Verificare parità, ruolo staff, isolamento account, anonimo e socio, salvataggi, logout e benchmark con marker di utilizzo effettivo.
4. Spegnere l'attivazione impostando SC_STRUCTURAL_RPC=false o rimuovendo la variabile. Nessun dato da ripristinare: le RPC leggono soltanto.
## Vincoli
Non eseguire db push, link, reset remoto o apply_migration. Non modificare variabili Vercel o database di produzione. Non distribuire su Vercel. Il flag è volutamente impossibile da attivare su endpoint non locale; un futuro rilascio richiederà approvazione separata e gate di staging/produzione.

## Gate di disattivazione
Test di modulo: tutte le condizioni obbligatorie, URL remoto e malformato, errore RPC e payload non valido. QA browser: stesso build con SC_STRUCTURAL_RPC=false, cinque pagine staff e endpoint ricerca 404, assenza marker. Restore: confronto delle definizioni, proprietà e ACL delle sette funzioni. Nessuna modifica al perimetro di attivazione.
