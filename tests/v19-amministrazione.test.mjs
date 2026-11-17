import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261117234500_amministrazione_account_dati.sql');
const actions=read('app/gestionale/utenti/actions.ts');
const editor=read('app/gestionale/utenti/[id]/page.tsx');
test('Account: lista da Auth, anche senza ruoli, Cognome/Nome prima di OFFSET/LIMIT e nessun campo segreto',()=>{
 const fragment=sql.split('CREATE OR REPLACE FUNCTION public.admin_elenco_account')[1].split('-- Conta i riferimenti')[0];
 assert.match(fragment,/IF NOT public\.is_admin\(\)/);assert.match(fragment,/FROM auth\.users u/);assert.match(fragment,/LEFT JOIN LATERAL/);assert.match(fragment,/ORDER BY lower\(b\.cognome\)[\s\S]*OFFSET[\s\S]*LIMIT/);assert.doesNotMatch(fragment,/encrypted_password|refresh_token|raw_user_meta_data/);
 assert.match(read('app/gestionale/utenti/page.tsx'),/admin_elenco_account/);assert.match(read('app/gestionale/utenti/page.tsx'),/Nessun ruolo assegnato/);
});
test('Auth admin: segreto server-only, verifica ruolo prima di mutare, nessun test-only bypass',()=>{
 const helper=read('lib/supabase/admin.ts');assert.match(helper,/import 'server-only'/);assert.match(helper,/process\.env\.SUPABASE_SERVICE_ROLE_KEY/);assert.doesNotMatch(helper,/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(actions,/createAccount\(form:FormData\)[\s\S]*requireAdmin\(\)[\s\S]*admin\.auth\.admin\.createUser/);assert.match(actions,/manageAccount\(form:FormData\)[\s\S]*requireAdmin\(\)[\s\S]*admin\.auth\.admin\.updateUserById/);assert.doesNotMatch(actions,/SESTO_TEST_MODE|SESTO_TEST_USER_IDS/);
});
test('Auth: due tipi di rimozione, doppia conferma, protezione degli account amministrativi e delle dipendenze',()=>{
 assert.match(actions,/conferma_testo.*!=='RIMUOVI'/);assert.match(actions,/deleteUser\(id,op==='soft_delete'\)/);assert.match(actions,/id===user\.id/);assert.match(actions,/target\.ruoli\.includes\('amministratore'\)/);assert.match(actions,/admin_fk_dipendenze/);
 assert.match(sql,/BEFORE DELETE OR UPDATE OF banned_until,deleted_at ON auth\.users/);assert.match(sql,/Revocare prima il ruolo amministratore/);assert.match(sql,/confrelid='auth\.users'::regclass/);assert.match(sql,/pg_advisory_xact_lock\(7300413\)/);assert.match(sql,/r\.utente_id<>OLD\.utente_id/);
 assert.match(editor,/Elimina definitivamente/);assert.match(editor,/Rimuovi conservando lo storico/);assert.match(editor,/action=\{unlinkAccount\}/);
});
test('Account non abilitati: RLS restrittiva, verifica nelle pagine, blocco scritture delle RPC',()=>{
 assert.match(sql,/deleted_at IS NULL AND \(u\.banned_until IS NULL OR u\.banned_until<=now\(\)\)/);assert.match(sql,/AS RESTRICTIVE FOR ALL TO authenticated/);assert.match(sql,/verifica_account_scrittura_0015 BEFORE INSERT OR UPDATE OR DELETE/);assert.match(read('lib/security.ts'),/rpc\('account_corrente_abilitato'\)/);
});
test('Rettifica incassi: blocco del debito, copia originale, cancellazioni atomiche, protezione idempotenza',()=>{
 assert.match(sql,/admin_rettifica_incasso[\s\S]*IF NOT public\.is_admin\(\)/);assert.match(sql,/quote_associative WHERE id=p\.quota_id FOR UPDATE/);assert.match(sql,/INSERT INTO public\.rettifiche_incassi[\s\S]*DELETE FROM public\.movimenti_economici[\s\S]*DELETE FROM public\.pagamenti/);assert.match(sql,/NEW\.idempotency_key IS NOT NULL[\s\S]*pagamento_originale->>'idempotency_key'/);assert.match(read('app/gestionale/incassi/[id]/page.tsx'),/non per un rimborso reale/);
});
test('Eventi: rimozione admin serializzata sullo stesso evento, nessuna cascata su iscrizioni',()=>{
 assert.match(sql,/admin_rimuovi_evento[\s\S]*IF NOT public\.is_admin\(\)[\s\S]*WHERE id=p_evento FOR UPDATE/);assert.match(sql,/IF EXISTS\(SELECT 1 FROM public\.eventi_soci_iscrizioni WHERE evento_id=p_evento\) THEN RAISE/);assert.match(sql,/DELETE FROM public\.eventi_soci_iscrizioni WHERE evento_id=p_evento AND id=p_iscrizione/);assert.match(read('app/gestione-eventi/page.tsx'),/action=\{removeEventRecord\}/);
});
test('Menu e dati aggiuntivi: accesso amministrativo, modifica nella scheda, gestione vincoli e moduli',()=>{
 assert.match(read('components/StaffNav.tsx'),/isAdmin&&<>[\s\S]*Amministrazione dati/);
 assert.match(read('app/gestionale/amministrazione-dati/page.tsx'),/requireAdmin\(\)/);assert.match(read('app/gestionale/amministrazione-dati/actions.ts'),/requireAdmin\(\)/);assert.match(read('app/gestionale/calendario-visivo/[id]/page.tsx'),/<RemoveRecord moduleKey="calendario"/);assert.match(read('app/gestionale/moduli/[modulo]/page.tsx'),/Visualizza dati collegati/);assert.match(read('app/gestionale/programmi-didattici/actions.ts'),/\.insert\(\{pre_id,tipo,codice,titolo,descrizione\}\)/);
});
