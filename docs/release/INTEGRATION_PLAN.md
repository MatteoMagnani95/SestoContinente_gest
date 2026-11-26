# Piano di integrazione — Sesto Continente
Snapshot 2026-11-26. Stato: NO-GO al rilascio, nessuna integrazione applicativa eseguita.

## Baseline verificata
- main: 5444519045f46eeece6f5c8030c6acb9f8fbda81; ramo release creato da questo SHA.
- Vercel production READY: deployment dpl_4V58BNbY9DuoH3jk8x9PbF7yFhpv, ramo feature/gestionale-2.0-redesign, SHA 20ae6fcceb5307d58920aa1527a83e2d1cf938f4. La produzione non coincide con main.
- main e 2.0 divergono da eb25225ce7e538cf72486b48c4af2812c7492416. L'unico commit esclusivo di main modifica vercel.json; il contenuto è identico al 2.0 e disabilita i deployment Git automatici. Preservare questa configurazione.
- Base funzionale da preservare: 2.0 esattamente allo SHA in produzione. Nessuna modifica a Vercel o Supabase effettuata.

## Registro PR
| PR | Ramo | SHA verificato | Base | CI osservata | Decisione |
| --- | --- | --- | --- | --- | --- |
| 1 | fix/supbase | ac593c9 | main | storica | già merged, non ripetere |
| 2 | fix/0019-gestione-associazione | f5b0eb7 | main | storica | già merged, non ripetere |
| 3 | fix/0020-audit-flussi-e-sicurezza | 75b9781be2d4c075e4efd2f4c4732cd92ca77550 | main | success 45898172285 | portare selettivamente le correzioni mancanti su 2.0; non sostituire file interi |
| 4 | feature/gestionale-2.0-redesign | 20ae6fcceb5307d58920aa1527a83e2d1cf938f4 | main | success 45877104016 + 45877104090 | base funzionale già online; includere nel consolidamento senza ripubblicazione |
| 5 | fix/password-recovery-login | 7493e8d11c4bf1466ef96ca73100950f7a0769fa | 2.0 | in progress 45898643203 + 45898643074 | integrare dopo gate, coordinare auth con PR3 |
| 6 | feature/gestionale-3.0-ui-ux | 3fc4e1c4537211843b7a1aa80cf8fe145397b93f | 2.0 | queued 45898862122 | escluso dal rilascio funzionale; estrarre eventuali fix funzionali indipendenti solo dopo separazione e test |
| 7 | fix/account-common-navigation | d914e28a38245079e94b9e37eb5d17c0a0af218f | 2.0 | failure 45897939890 | blocco: test automatici falliti, build e browser saltati; job DB passato |
| 8 | fix/cda-componenti-save | e9e9ce5161fe473df594a5f6ea114ad2e6a7da8e | 2.0 | queued 45898651941 | integrare dopo gate e riproduzione UI con dati sintetici |

## Sovrapposizioni e incompatibilità
- PR3 e PR4: 26 dei 28 file cambiati in PR3 sono cambiati anche in PR4. Verifiche puntuali dei blob mostrano differenze in app/actions.ts, app/smista/page.tsx, lib/security.ts, lib/course-tools.ts, app/area-personale/certificato/actions.ts e components/CertificateUploadForm.tsx. La 2.0 contiene ancora l'instradamento senza gestione degli errori di lettura e dateValue senza la nuova funzione isCalendarDate. Non inferire da una sovrapposizione di file un conflitto testuale certo; usare diff a tre vie, mantenere il comportamento 2.0 e portare solo le correzioni mancanti.
- PR3/5: app/actions.ts, tests/v25-audit-flussi.test.mjs. Integrare login/password/recovery come unico flusso e testare.
- PR7/8: tests/browser/roles.spec.mjs. Unire le asserzioni.
- PR6/7: 5 file di shell/navigazione/test; PR6/8: EditForm e test browser. PR6/3: 6 file di corsi/moduli. Non unire PR6 nel rilascio funzionale.
- PR6 contiene anche supabase/migrations/20261126213000_deroga_istruttori_corsi.sql e tests/v48-course-instructor-override.test.mjs. La deroga istruttori è funzionale, non solo grafica: richiedere estrazione in un ramo dedicato da 2.0, con verifica autonoma SQL, RLS e test; non includerla automaticamente.
- PR4 contiene sette migrazioni successive alla 0019, fino a 20261126172500_serializza_prenotazioni_guidate.sql. Il codice in produzione non prova l'applicazione delle migrazioni: verificare schema effettivo e registro in modalità autorizzata, senza rieseguire SQL di produzione. PR3/5/7/8 non aggiungono migrazioni secondo il diff.
- PR6 dichiarava nessun DB change nella descrizione iniziale, ma il diff corrente include una migrazione. Far prevalere il diff verificato.

## Ordine di integrazione
1. Congelare snapshot SHA delle attività quando ciascuna chat dichiara completato il proprio lavoro. Rieseguire censimento per eventuali nuovi rami e PR.
2. Integrare nel ramo release la baseline 2.0 esattamente in produzione, mantenendo la storia di main e il divieto di deploy Git automatici. Non fare merge su main. Verificare che il diff applicativo iniziale equivalga alla produzione, salvo documentazione.
3. Trasporre PR3 con revisione a tre vie e mappa requisito -> file -> test, mantenendo i miglioramenti 2.0. Evitare duplicazione di workflow o test e regressioni sui permessi.
4. Integrare PR5 dopo CI e QA locale email verdi; verificare login senza falso errore, password con spazi, conferma, recovery, callback e redirect consentiti.
5. Integrare PR7 dopo correzione della CI, poi PR8 dopo collaudo; preservare i test browser comuni. Testare ruoli, logout mobile/desktop e salvataggio CdA.
6. Integrare ulteriori fix indipendenti, inclusi corsi, soltanto dopo separazione dal 3.0 e collaudo. Nessun redesign 3.0.
7. Gate finale su SHA consolidato: lint, TypeScript, unit/static, build, browser desktop/mobile, QA Supabase locale isolato, migrazioni e compatibilità RLS/RPC/Storage, concorrenza, backup/ripristino sintetico, audit dipendenze; validare con staging non produttivo e account sintetici. Verificare separatamente schema reale, piano SQL differenziale e rollback prima di autorizzare il rilascio.
8. Aprire una sola PR finale release/gestionale-consolidato -> main quando gate superati; mantenere PR sorgenti finché le relative modifiche risultano coperte e tracciate. Non chiudere PR3-8 ora. Nessun merge, pubblicazione o SQL produzione senza approvazione esplicita.

## Stato
- [x] Creato ramo release da main.
- [x] Censiti nove rami preesistenti, otto PR (sei aperte, due già merged).
- [x] Verificata baseline Vercel e CI ai commit indicati.
- [x] Analizzate sovrapposizioni dei file e dipendenze.
- [ ] Integrazione baseline e fix (fase successiva).
- [ ] Collaudo complessivo e PR unica.

## Checkpoint coordinamento anti-regressione — 26 novembre, aggiornamento successivo
- PR #5, SHA 7493e8d11c4bf1466ef96ca73100950f7a0769fa: entrambe le CI 45898643203 e 45898643074 completate con successo.
- PR #8, nuovo SHA f136cbd6dcd846a3bc5d26f44fa566e9eb2fee0b: CI 45899125174 completata con successo. Ora include anche pannelli centrati orizzontali; verificare compatibilità con il 3.0 senza imporne il layout.
- PR #7, SHA d914e28a38245079e94b9e37eb5d17c0a0af218f: 237/238 test superati; fallimento inventario route in tests/v43-release-gates.test.mjs, route mancante app/notifiche/page.tsx. Build e browser saltati. Correggere inventario reale e rifare tutti i gate, senza indebolire il test.
- PR #6, SHA 5205ba294171134360c3280beb2be7a787644e08: verificati il documento docs/redesign/REGRESSION_TRACKER.md con REG-001–015 e il blocco F4; run 45899921780 e 45899921809 in corso al rilevamento. F4 resta bloccata fino a gate esteso verde e sincronizzazione con release funzionale approvata. Il registro deve conservare i test comportamentali di ogni correzione, anche dopo adeguamenti di layout.
- Il ramo release contiene ancora solo documentazione rispetto a main: nessuna approvazione implicita all'importazione nel 3.0. Prossimo passo: integrare baseline 2.0 e patch verdi sul release, tenere PR7 bloccata e richiedere estrazione indipendente della deroga istruttori. Nessun merge su main, modifica DB produzione o deploy.
