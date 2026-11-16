# Sesto Continente v12 — Ripristino struttura sorgenti

## Perché fallisce la build

Nel log del 16/11/2026 compaiono 19 file `page (N).tsx`/`route (N).ts` nella radice del repository. Questi duplicati non appartengono alla struttura Next.js e TypeScript prova a compilarli. Mancano anche moduli/import richiesti dalla v12.

Questo archivio è una **patch incrementale** di 52 file con i percorsi corretti (27 nuovi + 25 modificati), derivata dalla v12 BuildFix e confrontata con il repository allegato `SestoContinente_gest-main.zip`. **Non è un aggiornamento GitHub automatico**: non basta caricare questo ZIP su GitHub, bisogna estrarre le cartelle e copiarne il contenuto nella radice del repository.

## Procedura consigliata (PC Windows, GitHub Desktop)

1. Clona/apri il repository attualmente collegato a Vercel e crea una branch di riparazione. Non lavorare direttamente su `main`.
2. Verifica e conserva una copia della situazione attuale (commit/branch). Non sovrascrivere `.env.local` e non committare credenziali.
3. Estrai questo ZIP in una cartella temporanea e copia **i file e le sottocartelle contenuti** nella radice del repository (dove si trova `package.json`), conservando i percorsi e sovrascrivendo i file corrispondenti. Non copiare una cartella contenitrice aggiuntiva.
4. Nella radice del repository **solo**, identifica e rimuovi i file `page (NUMERO).tsx`, `route (NUMERO).ts` e analoghi. Non cancellare alcun `app/**/page.tsx` o `app/**/route.ts`.
5. Verifica con `npm run check:source`, `npm run test:static`, `npm run typecheck` e `npm run build` su un ambiente locale con dipendenze installate.
6. Esegui commit e push della branch; verifica la Preview Vercel prima del merge.

In PowerShell dalla radice della working copy Git, per vedere prima i soli duplicati alla radice:

```powershell
Get-ChildItem -File | Where-Object { $_.Name -match '^(page|route) \(\d+\)\.tsx?$' } | Select-Object Name
```

Se l'elenco corrisponde ai duplicati del log, per eliminarli:

```powershell
Get-ChildItem -File | Where-Object { $_.Name -match '^(page|route) \(\d+\)\.tsx?$' } | Remove-Item
```

Quindi verificare:

```powershell
npm install
npm run check:source
npm run test:static
npm run typecheck
npm run build
git status
```

**Non eseguire SQL o migrazioni:** questa riparazione interviene solo sui file sorgenti. Non sostituisce il collaudo completo e il test delle RLS sulla copia di Supabase.

## File critici ripristinati

- `lib/security.ts` con export `requireBoard`
- `app/organi-sociali/actions.ts` e `app/organi-sociali/page.tsx`
- `lib/cda-pdf.ts`, `lib/pdf-registro.ts`, `lib/importazione.ts`, `lib/codice-fiscale.ts`
- `scripts/check-v12-build-integrity.mjs`

**Attenzione:** prima di sovrascrivere i file modificati, controllare se nel repository online sono state apportate modifiche successive allo ZIP di partenza (16/11/2026). In tal caso occorre un merge a tre vie, non una sovrascrittura cieca.
