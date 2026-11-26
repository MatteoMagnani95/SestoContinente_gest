# Gestionale Sesto Continente 2.0 — Fase 0
Data: 2026-11-26. Base esatta: `ea97e2663a3999527b2e3f868c19dfd5b4f646eb`. Ramo: `feature/gestionale-2.0-redesign`.
Nessun merge, modifica applicativa o SQL produzione in questa fase.

# Audit funzionale e database — analisi preliminare dei sorgenti
## Base e precedenti
main eb25225ce7e538cf72486b48c4af2812c7492416 (PR #2 merged 2026-11-26 09:37:42 UTC). PR #1 merged. PR #3 aperta: head ea97e2663a3999527b2e3f868c19dfd5b4f646eb, 14 commit ahead, 0 behind. La 0020 non contiene nuove migrazioni. Vercel status success e due workflow CI conclusi success al commit base. Non equivale a collaudo staging. Ramo produzione Vercel da verificare.

## Priorità e dipendenze
| ID | Evidenza | Priorità | Azione / dipendenza |
|---|---|---|---|
| SC-06.1/06.2/36.1 | layout staff solo sotto /gestionale, menu wrap <=1000 e nessun active | P1 | Shell role-aware e client nav; non ampliare privilegi |
| SC-06.6 | GlobalCancelButtons inietta DOM con MutationObserver e window.location.assign, non misura dirty | P1 | sostituzione progressiva dopo migrazione form |
| SC-07.1/07.3 | CRUD Editor in td/details e testi generici | P1 | portale drawer + metadati semantici in lib/modules |
| SC-12/23/39 | limit 100 domande, 150 documenti, 200 eventi e select reference limitati | P1 | paginazione stabile server, selector asincrono; conteggi separati |
| SC-21.2 | link nuova lezione porta a elenco corsi | P1 | riuso LessonComposer/crea_lezione_guidata |
| SC-29.2 | ruolo senza scelta vuota | P0 | placeholder + verificare RPC/trigger e ruoli effettivi |
| SC-10.2/18.1/19.2 | SQL 0019 contiene scelte, emergenza, controlli identità e direttore | P0 | preservare; testare tutti i percorsi, no dedup storica automatica |
| SC-17/24/25 | saldi_quote/saldi_corsi, registra_pagamento_guidato, contabilizza_pagamento, admin_rettifica_incasso | P0 | unica via autorevole; test atomici, no doppio pagamento |
| SC-26/27/28 | trigger revisione, sincronizza_stato_assegnazione, controlla_consegna | P0 | verificare transizioni e race; sospetti A001 solo indagine |
| SC-22/23/38 | verbali per versione, file medico, RLS e storage | P0 | verificare ruolo, file e voti su staging; nessun dato reale |
| SC-31 | notifiche, genera_promemoria, cron /api/cron/promemoria | P0 | non inviare mail reali da preview; separazione ambiente |

## Migrazioni (ordine canonico)
1. `supabase/migrations/20261111210100_fase1.sql`
2. `supabase/migrations/20261111210200_gestionale_completo.sql`
3. `supabase/migrations/20261111210300_schede_soci.sql`
4. `supabase/migrations/20261111210400_corsi_guidati.sql`
5. `supabase/migrations/20261111210500_calendario_economico.sql`
6. `supabase/migrations/20261111210600_incassi_controllati.sql`
7. `supabase/migrations/20261116100700_ruolo_cda.sql`
8. `supabase/migrations/20261116100800_v12_sicurezza_organi_didattica_import.sql`
9. `supabase/migrations/20261116100900_precaricamento_didattica.sql`
10. `supabase/migrations/20261116101000_v12_riepilogo_cda_certificati.sql`
11. `supabase/migrations/20261117190000_archivio_cda_anagrafica.sql`
12. `supabase/migrations/20261117201500_corsi_rimozione_quote_attive.sql`
13. `supabase/migrations/20261117210000_iscrizioni_rimozioni_ordinamento.sql`
14. `supabase/migrations/20261117223000_area_soci_eventi.sql`
15. `supabase/migrations/20261117234500_amministrazione_account_dati.sql`
16. `supabase/migrations/20261118001500_eliminazione_completa_account.sql`
17. `supabase/migrations/20261118004000_fix_ambiguita_eliminazione_account.sql`
18. `supabase/migrations/20261118090000_comunicazioni_email.sql`
19. `supabase/migrations/20261125223000_patch_0019.sql`

Le copie SQL root non vanno rieseguite in aggiunta alla directory canonica. Ho censito e letto strutturalmente le 19 migrazioni, non eseguite. Applicazione 0019 in produzione riferita dal committente, non verificata in DB. Nessuna migrazione 0020.

## Mappa logica (non schema DB live)
- identità: ruoli_utente, persone, collegamenti_persone, relazioni_tutori; richieste → adesioni → stagione/tesseramenti/quote. eventi_pratica e registro_operazioni audit. requireUser verifica getUser + account_corrente_abilitato; requireStaff amministratore/segreteria, requireBoard include consigliere_cda, requireAdmin is_admin; istruttori e soci hanno controlli contestuali SQL. Proxy rinnova sessione, non sostituisce autorizzazione.
- didattica: corsi → edizioni_corsi → iscrizioni_corsi, assegnazioni_istruttori, lezioni → presenze e prenotazioni_corsie; programmi/versioni/moduli; 0019 controlla identità/direttore e firma brevetti. RPC crea_lezione_guidata, modifica_lezione_e_corsie, annulla_lezione_guidata, iscrivi_con_contatto.
- economia: quote_associative/addebiti_corsi → pagamenti → movimenti_economici, saldi_quote/saldi_corsi, rettifiche_incassi, riepilogo_contabile_periodo; trigger vincoli residui e contabilizzazione.
- attrezzature: attrezzature → revisioni_attrezzature/assegnazioni_attrezzature; trigger aggiornamento revisione e prestito.
- organi: cda_componenti/cda_verbali/cda_votanti/cda_voti/cda_adesioni/cda_versioni_bozze/cda_letture; RPC voto, finalizzazione, sostituzione e lettura versioni.
- eventi: eventi_soci/eventi_soci_iscrizioni, area_soci_posti/iscrivi/decidi/partecipanti; responsabilità e capienza da testare concorrente.
- documenti e consensi: documenti, certificati_medici, scelte_iscrizione, contatti_emergenza; storage privato, legge_certificato, documento_sanitario, proteggi_file_medico; RLS da validare con matrice ruoli e due persone distinte.
- amministrazione: eliminazioni_account_pendenti, admin_piano_eliminazione_0016, proteggi_ruolo_admin_0015, admin_fk_dipendenze; importazioni_batch/righe; notifiche e comunicazioni.

## Rischi / limiti
Audit statico mirato, non revisione riga per riga di tutti i sorgenti né prova delle policy live. Duplicati storici, quote e revisioni sospette non verificabili senza accesso read-only a staging. Prima dei test autenticati servono Supabase separato, utenti sintetici, bucket privati, testi ufficiali, email sandbox e Vercel preview isolata. Non alterare segreti o produzione.

## Secondo passaggio di audit statico: confini server
| Sorgente | Funzioni / meccanismo rilevato | Controllo da collaudare |
|---|---|---|
| app/actions.ts | register/login/recover/newPassword, salva_domanda_v19, prendi_in_carico, valuta_domanda | sessioni e transizioni |
| app/module-actions.ts | saveModuleRecord, deleteModuleRecord, rimuovi_record_gestionale; requireStaff | whitelist modulo, adminOnly, percorsi alternativi |
| app/gestionale/corsi/actions.ts | createEdition/updateEdition/addEnrollment, iscrivi_con_contatto, crea_lezione_guidata, presenze, rimuovi_record_gestionale | unicità, idoneità, direzione, concorrenza |
| app/gestionale/incassi/actions.ts | requireStaff/requireAdmin; registra_pagamento_guidato/admin_rettifica_incasso | idempotenza e rettifica |
| app/gestionale/calendario-visivo/actions.ts | modifica_lezione_e_corsie, annulla_lezione_guidata | collisioni e atomicità |
| app/gestionale/utenti/actions.ts | requireStaff/requireAdmin, assegnazione/revoca ruolo e collega_account_a_persona | escalation e dipendenze |
| app/gestionale/utenti/[id]/elimina/actions.ts | requireAdmin e RPC avvio/verifica/conclusione eliminazione + storage remove | conservazione e ripresa da errore |
| app/documenti/actions.ts, [id]/route.ts | requireUser; upload/edit/delete; documento_sanitario/legge_certificato; download e signed URL | autorizzazione metadati, storage e IDOR |
| app/organi-sociali/actions.ts, documento/[id]/route.ts | requireBoard/requireStaff; approva_versione_cda, finalizza, sostituisci, leggi_versione_cda | accessi, voto per versione, immutabilità |
| app/area-soci/actions.ts | requireUser/requireAdmin, area_soci_iscrivi/decidi/salva_evento | ultimo posto e responsabilità |
| app/istruttore/actions.ts | requireUser; recordAttendance | scope istruttore e RLS |
| app/gestionale/importazione/actions.ts | requireStaff, stageImport/commitImport, conferma_importazione | dry run e rollback |
| app/api/cron/promemoria/route.ts | CRON_SECRET; genera_promemoria, genera_promemoria_organizzativi, genera_promemoria_tessere | autorizzazione, idempotenza, mail sandbox |
| app/gestionale/esporta/[modulo]/route.ts | requireStaff | admin-only, RLS, formula injection |

La presenza di una guard nel file non garantisce che sia invocata in ogni percorso: verificare singole funzioni, chiamate RPC e policy prima di marcare verificato.

## F0 — decisione conservativa
Conservare le route già paginate e le RPC esistenti; audit ulteriore in PAGE_REQUIREMENTS. Per i ruoli non assumere che requireUser da solo autorizzi operazioni: verificare controllo interno e policy. Fase 1 non modifica auth, RLS, RPC o DB. Configurazione staging e testi ufficiali non verificabili da GitHub.

## Inventario SQL dettagliato
[SQL_AUDIT.md](SQL_AUDIT.md) raccoglie i riferimenti testuali alle policy, funzioni, FK e altri costrutti sensibili delle 19 migrazioni. È un indice di audit statico, non una verifica delle autorizzazioni effettive.
