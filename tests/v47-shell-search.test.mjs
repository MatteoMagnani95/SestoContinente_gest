import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(p,'utf8');
function load(path,imports={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};new Function('exports','require',js)(exports,n=>{if(n in imports)return imports[n];throw Error(n);});return exports;
}
const nav=load('lib/navigation.ts'),search=load('lib/global-search.ts');
test('saluto usa solo il titolare univoco, mai email o persona rappresentata',()=>{
 assert.equal(nav.accountFirstName([{nome:' Anna Maria '}]),'Anna Maria');assert.equal(nav.accountFirstName([{nome:'a@b.it'}]),undefined);assert.equal(nav.accountFirstName([{nome:'Anna'},{nome:'Luca'}]),undefined);
 assert.equal(nav.greeting(nav.guestAccess),'Ciao');assert.equal(nav.greeting({...nav.guestAccess,enabled:true,firstName:'Roberta'}),'Ciao, Roberta');
 assert.match(read('lib/navigation-access.ts'),/\.eq\('relazione','titolare'\)\.limit\(2\)/);
});
test('destinazioni mobile e ricerca rispettano il ruolo e non espongono pagine pubbliche',()=>{
 const enabled={...nav.guestAccess,signedIn:true,enabled:true};
 assert.equal(nav.mobileDestinations('/gestionale',nav.guestAccess).length,0);
 assert.deepEqual(nav.mobileDestinations('/gestionale',{...enabled,staff:true}).map(d=>d.href),['/gestionale','/gestionale/soci','/gestionale/corsi','/gestionale/calendario-visivo']);
 assert.ok(!nav.mobileDestinations('/istruttore',{...enabled,instructor:true}).some(d=>d.href.startsWith('/gestionale')));
 for(const p of ['/','/accedi','/registrati','/registrati/informativa-test','/nuova-password','/richiesta/stato'])assert.equal(nav.searchVisible(p,enabled),false);
 assert.equal(nav.searchVisible('/gestionale',{...enabled,staff:true}),true);
});
test('query limitate e prive di sintassi PostgREST arbitraria; link generati solo da UUID',()=>{
 assert.deepEqual(search.searchWords('a'),[]);assert.deepEqual(search.searchWords('Anna, Rossi %_()'),['Anna','Rossi']);assert.equal(search.searchWords('x'.repeat(300)).length,0);
 assert.throws(()=>search.searchOr(['nome'],'%,id.eq.1'));assert.equal(search.resultLink('Corsi','//bad','x'),null);
 const id='00000000-0000-4000-8000-000000000001';assert.equal(search.resultLink('Corsi',id,'Corso','instructor').href,'/istruttore?tab=lezioni&edizione='+id);
});
test('ricerca verifica sessione e abilitazione prima delle tabelle, scope staff/istruttore e documenti',()=>{
 const s=read('app/global-search-actions.ts');
 assert.match(s,/auth\.getUser\(\)/);assert.match(s,/account_corrente_abilitato/);assert.match(s,/if\(roleError\)return/);assert.match(s,/if\(staff\)\{/);assert.match(s,/else if\(instructor\)/);assert.match(s,/\.eq\('responsabile_id',user\.id\)/);assert.match(s,/\.in\('persona_id',ids\)/);assert.match(s,/\.eq\('ambito','associazione'\)\.eq\('visibilita','soci'\)/);assert.doesNotMatch(s,/createAuthAdmin|service_role|percorso_storage|certificato|\.select\('\*'\)/);
});
test('dialog ricerca e navigazione conservano primitive native e protezione dirty form',()=>{
 const s=read('components/GlobalSearch.tsx'),shell=read('components/AppShell.tsx'),staff=read('components/StaffNav.tsx');
 assert.match(s,/showModal\(\)/);assert.match(s,/300\)/);assert.match(s,/serial\.current/);assert.match(s,/ArrowDown/);assert.match(s,/onCancel=/);assert.match(s,/prefetch=\{false\}/);
 assert.match(shell,/<GlobalCancelButtons\/>/);assert.match(shell,/sc-bottom-navigation/);assert.match(staff,/expanded\.path===pathname/);
});
