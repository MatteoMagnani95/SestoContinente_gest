# Sesto Continente v12 — correzione errori TypeScript in build

## Diagnosi verificata sul pacchetto consegnato

Gli errori segnalati da Vercel (`TS2305`, `TS2307`, `TS7006`, `TS2339`) sono coerenti con **file del repository di deploy incompleti o rinominati**. In particolare i log riportano `page (40).tsx`, `page (45).tsx`, `page (46).tsx`, `route (17).ts`, `route (24).ts`, `route (44).ts`, nomi che **non compaiono** nello ZIP completo originale. Se questi sono nomi realmente presenti nel repository, TypeScript li compila perché `tsconfig.json` include `**/*.tsx` e `**/*.ts` anche fuori dalle cartelle corrette.

Nel pacchetto sorgente ricevuto, invece, sono presenti:

| Import chiamato in errore | File corretto e nome esportato |
| --- | --- |
| `recordAttendance` | `app/istruttore/actions.ts` |
| `requireBoard` | `lib/security.ts` |
| `salvaComponente`, `caricaBozza`, `avviaApprovazione`, `approvaVerbale` | `app/organi-sociali/actions.ts` |
| `markNotification` | `app/area-personale/actions.ts` |
| `updateContact` | `app/area-personale/profilo/actions.ts` |
| `makeRegister` | `lib/pdf-registro.ts` |
| `headings` | `lib/importazione.ts` |

**Se GitHub contiene altri file o una versione parziale, la sostituzione deve ripristinare la struttura delle directory.** Non basta caricare solo le pagine `page.tsx` e `route.ts`.

## Modifiche apportate in questo hotfix

1. `app/organi-sociali/page.tsx`: tipi espliciti per membri CdA, verbali, progressi, votanti, persone e adesioni. Evita `implicit any` e il tipo `{}` nelle statistiche dei voti.
2. `scripts/check-v12-build-integrity.mjs`: controllo automatico dei file indispensabili, degli export, di 121 import locali, della sintassi TypeScript/TSX e dei nomi duplicati `page (N).tsx` / `route (N).ts`.
3. `package.json`: aggiunge `npm run check:source` e `prebuild`, in modo da eseguire il controllo di integrità prima di `next build`.
4. `tests/v12-build-integrity.test.mjs`: test automatici aggiuntivi per verificare la struttura e il controllo prebuild.

Le migrazioni SQL, i dati precaricati PRE e le regole RLS **non sono stati modificati** da questo hotfix.

## Installazione corretta su GitHub (Windows / PowerShell)

**Non caricare semplicemente il file `.zip` nel repository:** Vercel non lo estrae. Usa Git / GitHub Desktop e rispetta i percorsi.

1. Clona o apri la cartella locale del **vero repository collegato a Vercel**. Conserva lo stato attuale con un commit / tag e crea una branch:
   ```powershell
   git switch -c fix/v12-build
   ```
2. Estrai `SestoContinente_v12_BuildFix_Progetto_Completo.zip` in una cartella temporanea. Copia **il contenuto interno** della cartella `SestoContinente_gest-main` nella radice del repository, mantenendo `app/`, `lib/`, `components/`, `scripts/`, `supabase/`, `tests/`. Non toccare `.git`, `.env.local` né il database.
3. Cerca i file duplicati/erroneamente rinominati, **valutandoli prima di eliminarli**:
   ```powershell
   Get-ChildItem -Recurse -File | Where-Object { $_.Name -match '\s\(\d+\)\.(ts|tsx|js|jsx)$' } | Select-Object FullName
   ```
   Se risultano copie duplicate di file che ora esistono già nei percorsi corretti, rimuovi solo le copie spurie dal repository. Non cancellare materiale non identificato.
4. Nella root del repository esegui:
   ```powershell
   npm install
   npm run check:source
   npm run test:static
   npm run typecheck
   npm run build
   ```
5. Esegui il commit **solo dopo la verifica**:
   ```powershell
   git add -A
   git commit -m "Fix v12 TypeScript exports and build source integrity"
   git push -u origin fix/v12-build
   ```
6. Verifica il deploy di anteprima su Vercel usando un progetto Supabase **di test**, con le migrazioni previste. Non applicare nuove migrazioni al database di produzione per correggere errori di compilazione.

## Test eseguiti sul pacchetto aggiornato

- `node scripts/check-v12-build-integrity.mjs`: **OK**, 75 sorgenti e 121 import locali verificati.
- `node --test tests/*.test.mjs`: **49/49 test superati**.
- Parsing TypeScript/TSX: **OK** nel controllo di integrità.
- `npm run typecheck` e `npm run build`: **non verificati in questo ambiente**, perché le dipendenze npm non hanno potuto essere installate. La sintassi e i test statici non equivalgono a una build Next.js completata.

Nessuna modifica è stata applicata a GitHub, Vercel o Supabase in questa operazione. Questo hotfix non costituisce collaudo delle nuove policy RLS né delle migrazioni v12 su un database reale.
