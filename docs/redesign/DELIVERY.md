# Consegna tecnica Sesto Continente 2.0 — 26 novembre 2026

**Implementazione consegnata sul feature branch; NO-GO produzione finché i gate residui non sono soddisfatti.** PR #4 in bozza, main `eb25225ce7e538cf72486b48c4af2812c7492416` invariato. Nessuna migrazione reale, nessun invio email reale e nessun merge.

## Evidenze verificate
- [CI 45867611269](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45867611269), SHA b14dfa75: entrambi job success; 230/230 automatici, 62/62 browser pubblici, lint, TS, build, audit dipendenze runtime, 26 migrazioni canoniche, test PostgreSQL, backup/ripristino con audit, impronte dati e RLS. Include cinque gare concorrenti multicorsia in ordine inverso senza deadlock.
- [QA 45866765359](https://github.com/MatteoMagnani95/SestoContinente_gest/actions/runs/45866765359), SHA faac486, job 140071575306 success: nove account sintetici, 142/142 test autenticati Chromium/WebKit, isolamento JWT/Storage, tutore, istruttore non assegnato, revoca account. Mutazioni UI: notifica, recapiti, consenso e revoca, eventi, presenze, richiesta corso/contatto emergenza, versamento/saldo/rettifica, revisione/prestito/restituzione, certificato oltre 3 MiB con verifica byte e rimozione transito, quarantena CSV.
- QA benchmark locale: 2.000 persone, 2.000 quote, 500 attrezzature, 2.000 notifiche. Pagine soci campionate 250/196/193 ms; report 382 ms; dashboard 247 ms; notifiche 223 ms. Non sono SLA di produzione. Lockfile versionato e npm ci; audit runtime 0 vulnerabilità al checkpoint a74efbc.
- Il collaudo esteso signup/recovery e importazione positiva/anomalia fuori pagina non è ancora confermato. I run 45867115106 e 45867611264 si fermano prima delle prove Auth per config.toml assente: CLI 3.4 genera config.jsonc. Correzione 5c70727 + 1075f9a usa conversione ufficiale e rifiuta configurazioni concorrenti, da verificare in CI. Riferimento: https://supabase.com/docs/guides/local-development/cli/config-formats.

## Gate residui prima del rilascio
| Gate | Stato |
|---|---|
| G1 CI | Superata al checkpoint b14dfa75; ripetere sul candidato finale |
| G2 Migrazioni | 26 collaudate su DB effimero; audit e rollback su copia autorizzata aperti |
| G3 Auth/RLS/Storage | QA locale positiva per faac486; signup/recovery e nuovo candidato da confermare |
| G4 Accessibilità | Chromium/WebKit e viewport emulati positivi; dispositivi fisici e screen reader aperti |
| G5 Integrità funzionale | DB e numerose mutazioni UI verificate; importazione positiva/filtro e nuovi test da confermare |
| G6 Testi/configurazione | Approvazione testi ufficiali e regole associative/rappresentanza; configurazione reale |
| G7 Performance | Benchmark sintetico locale positivo; validazione su ambiente e volumi concordati |
| G8 Preview/rollback | Vercel build-rate-limit; staging isolato e prova rollback applicazione/Storage |
| G9 Autorizzazione | Non concessa per merge/deploy o SQL reale |

## Ordine di rilascio da seguire dopo autorizzazione
1. Congelare SHA e verificare CI completa, incluse prove residue; niente nuove modifiche estranee durante il collaudo.
2. Approvare documenti/regole ufficiali; eseguire matrice manuale di RESPONSIVE_ACCESSIBILITY.md.
3. Preparare staging separato, dati sintetici o copia autorizzata minimizzata, backup verificato. Controllare storico migrazioni effettivamente applicate e F5_HISTORICAL_AUDIT.sql in sola lettura.
4. Le 7 nuove migrazioni successive alla 0019 sono elencate in F5_CLOSURE.md. Applicare solo quelle mancanti e nell'ordine documentato dopo prova su staging. Mai rieseguire in blocco tutte le migrazioni su produzione.
5. Ottenere preview Vercel sul candidato e verificarne l'isolamento. Eseguire ripristino su staging, inclusi Auth/Storage e compatibilità client.
6. Richiedere GO esplicito, poi pianificare rilascio con backup e strategia di rollback. Non è autorizzato da questa consegna.

Riferimenti: MASTER_SPEC.md, IMPLEMENTATION_TRACKER.md, F5_CLOSURE.md, F7_RELEASE_GATE.md, RELEASE_NOTES.md e RESPONSIVE_ACCESSIBILITY.md.
