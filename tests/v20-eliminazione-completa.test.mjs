import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261118001500_eliminazione_completa_account.sql');
const action=read('app/gestionale/utenti/[id]/elimina/actions.ts');
const preview=read('app/gestionale/utenti/[id]/elimina/page.tsx');
test('Purge is admin-only; no self or sitting admin deletion, strict explicit confirmation and stale plan check',()=>{
 for(const name of ['admin_piano_eliminazione_0016','admin_anteprima_eliminazione_account','admin_avvia_eliminazione_account','admin_file_eliminazione_pendente','admin_verifica_file_eliminazione','admin_concludi_eliminazione_account']){
  const body=sql.split(`FUNCTION public.${name}(`)[1].split('END; $$;')[0];
  assert.match(body,/NOT public\.is_admin\(\).*p_utente=auth\.uid\(\)/);
 }
 assert.match(sql,/ruolo='amministratore'\) THEN RAISE/);
 assert.match(sql,/p_conferma IS DISTINCT FROM 'ELIMINA DEFINITIVAMENTE'/);
 assert.match(sql,/p_hash IS DISTINCT FROM v->>'hash'/);
 assert.match(action,/requireAdmin\(\)/);assert.match(action,/confirm!=='ELIMINA DEFINITIVAMENTE'/);
});
test('Scope: exclusive holder or own approved application; no deletion of another account’s profiles',()=>{
 assert.match(sql,/c\.relazione='titolare'/);assert.match(sql,/NOT EXISTS\(SELECT 1 FROM public\.collegamenti_persone c WHERE c\.persona_id=p\.id AND c\.utente_id<>p_utente\)/);
 assert.match(sql,/NOT EXISTS\(SELECT 1 FROM public\.richieste q WHERE q\.persona_id=p\.id AND q\.utente_id<>p_utente\)/);
 assert.match(sql,/profili_conservati/);assert.match(preview,/Profili condivisi o amministrati come tutore/);
});
test('Preview and deletion have exactly the same whitelist and predicates, dependency order is leaf-first',()=>{
 const [a,b]=[...sql.matchAll(/FOR r IN SELECT \* FROM \(VALUES\n([\s\S]*?)\n \) AS t\(/g)].map(x=>x[1]);
 const parse=s=>s.trim().split('\n').map(row=>row.trim().replace(/^\(\d+,/,'(').replace(/,$/,''));
 assert.deepEqual(parse(a),parse(b));
 const order=parse(b).map(row=>row.match(/^\('([^']+)'/)[1]);
 for(const [leaf,parent] of [['movimenti_economici','pagamenti'],['pagamenti','addebiti_corsi'],['pagamenti','quote_associative'],['addebiti_corsi','iscrizioni_corsi'],['presenze','iscrizioni_corsi'],['certificati_medici','documenti'],['tesseramenti','adesioni'],['cda_adesioni','adesioni'],['eventi_pratica','richieste'],['richieste','persone'],['collegamenti_persone','persone']]) assert.ok(order.indexOf(leaf)<order.indexOf(parent));
 assert.equal(order.at(-1),'persone');
 for(const shared of ['corsi','edizioni_corsi','lezioni','attrezzature','eventi_soci','cda_verbali','cda_voti','cda_votanti','importazioni_batch'])assert.ok(!order.includes(shared));
});
test('Deletion blocks shared official votes and active course responsibility; preserves events by reassignment and actor refs by nulling',()=>{
 assert.match(sql,/FROM public\.cda_votanti WHERE utente_id=p_utente OR persona_id=ANY\(persone\)/);
 assert.match(sql,/v\.stato='in_approvazione'\) THEN blocchi/);
 assert.match(sql,/persona_id=ANY\(persone\) AND ruolo='responsabile'/);
 assert.match(sql,/UPDATE public\.eventi_soci SET responsabile_id=auth\.uid\(\) WHERE responsabile_id=p_utente/);
 assert.match(sql,/UPDATE public\.eventi_pratica SET attore_id=NULL/);
 assert.match(sql,/UPDATE public\.pagamenti SET registrato_da=NULL/);
});
test('Persistent retry queue, ban before storage/Auth, no direct Storage deletes, no global trigger disabling',()=>{
 assert.match(sql,/CREATE TABLE public\.eliminazioni_account_pendenti/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/UPDATE auth\.users SET banned_until=now\(\)\+interval '100 years'[\s\S]*INSERT INTO public\.eliminazioni_account_pendenti/);
 assert.match(sql,/NOT EXISTS\(SELECT 1 FROM public\.eliminazioni_account_pendenti e WHERE e\.utente_id=auth\.uid\(\)\)/);
 assert.match(sql,/IF FOUND THEN RETURN existing/);assert.match(sql,/admin_fk_dipendenze\('auth','users',p_utente\)/);
 assert.doesNotMatch(sql,/DELETE FROM storage\.objects|DISABLE TRIGGER|DELETE FROM auth\.users|TRUNCATE\s/i);
 assert.match(action,/admin_avvia_eliminazione_account[\s\S]*admin_file_eliminazione_pendente[\s\S]*storage\.from\('sesto-documenti'\)\.remove[\s\S]*admin_verifica_file_eliminazione[\s\S]*deleteUser\(id,false\)[\s\S]*admin_concludi_eliminazione_account/);
 assert.match(action,/f\.bucket!=='sesto-documenti'/);assert.match(action,/return back\('pendente'\)/);
});
test('No client-supplied targets or Storage paths; internal planner is not public; queued paths cannot be relinked',()=>{
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.admin_piano_eliminazione_0016\(uuid\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.admin_avvia_eliminazione_account\(uuid,text,text\) TO authenticated/);
 assert.match(sql,/CREATE TRIGGER proteggi_file_in_eliminazione_0016/);
 assert.match(action,/const files=data as FileEntry\[\]/);assert.doesNotMatch(action,/form\.get\(['"](?:path|bucket|tabella|sql)/);
});
test('Delete feature is inside edit pages; pending jobs can be resumed even if Auth row no longer exists',()=>{
 assert.match(read('app/gestionale/utenti/[id]/page.tsx'),/Elimina account e dati collegati/);
 assert.match(read('app/gestionale/soci/[id]/page.tsx'),/isAdmin===true&&Boolean\(accountLinks\?\.length\)/);
 assert.match(read('app/gestionale/utenti/page.tsx'),/Eliminazioni da completare/);
 assert.match(preview,/Riprova/);assert.match(preview,/ELIMINA DEFINITIVAMENTE/);
 assert.match(preview,/non annulla obblighi di conservazione/);
});
