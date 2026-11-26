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

test('nomi in maiuscolo normalizzati soltanto nella presentazione e iniziali del titolare',()=>{
 assert.equal(nav.accountFirstName([{nome:'ROBERTA MARIA'}]),'Roberta Maria');
 assert.equal(nav.initials({...nav.guestAccess,enabled:true,firstName:'Roberta',lastInitial:'m'}),'RM');
});
const uid='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',edition='00000000-0000-4000-8000-000000000003';
function harness({roles=[],enabled=true,signed=true,roleError=false,failTable}={}){
 const calls=[];
 const rows={
  ruoli_utente:roles.map(ruolo=>({ruolo})),
  persone:[{id:uid,nome:'Anna',cognome:'Rossi'}],
  gest_elenco_iscrizioni_corsi:[{id:other,persona_id:uid,sort_nome:'Anna',sort_cognome:'Rossi',stato:'iscritto'}],
  edizioni_corsi:[{id:edition,nome:'Corso Anna'},{id:other,nome:'Corso non assegnato'}],
  attrezzature:[{id:uid,codice:'Anna',categoria:'GAV',marca:'Marca',modello:'Modello'}],
  eventi_soci:[{id:uid,titolo:'Evento Anna',responsabile_id:uid},{id:other,titolo:'Evento altrui',responsabile_id:other}],
  documenti:[{id:uid,nome:'Documento Anna',ambito:'associazione',visibilita:'soci'},{id:other,nome:'Documento personale',ambito:'personale',visibilita:'proprietario'}],
  collegamenti_persone:[{persona_id:uid,utente_id:uid}],
  assegnazioni_istruttori:[{edizione_id:edition,persona_id:uid}]
 };
 const client={auth:{getUser:async()=>({data:{user:signed?{id:uid}:null},error:null})},rpc:async name=>{calls.push(['rpc',name]);return {data:enabled,error:null};},from(table){
  calls.push(['from',table]);let data=[...(rows[table]??[])];
  const api={select(...args){calls.push([table,'select',...args]);return api;},eq(key,value){calls.push([table,'eq',key,value]);if(key!=='utente_id'||table==='collegamenti_persone')data=data.filter(r=>r[key]===value);return api;},in(key,values){calls.push([table,'in',key,values]);data=data.filter(r=>values.includes(r[key]));return api;},ilike(){return api;},or(){return api;},order(){return api;},limit(n){calls.push([table,'limit',n]);data=data.slice(0,n);return api;},then(resolve,reject){return Promise.resolve({data,error:table===failTable||table==='ruoli_utente'&&roleError?{code:'error'}:null}).then(resolve,reject);}};return api;
 }};
 const {globalSearch}=load('app/global-search-actions.ts',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/global-search':search});
 return {globalSearch,calls};
}
test('azione reale: anonimo, disabilitato e errore ruoli non interrogano entità',async()=>{
 for(const config of [{signed:false},{enabled:false},{roleError:true}]){
  const m=harness(config);const out=await m.globalSearch('Anna');assert.equal(out.denied,true);assert.equal(out.results.length,0);
  assert.ok(m.calls.filter(c=>c[0]==='from').every(c=>c[1]==='ruoli_utente'));
 }
});
test('azione reale: staff, socio e istruttore hanno scope distinti',async()=>{
 const staff=harness({roles:['segreteria']});const a=await staff.globalSearch('Anna');assert.equal(new Set(a.results.map(r=>r.category)).size,6);
 assert.ok(a.results.some(r=>r.href==='/gestionale/soci/'+uid+'?tab=corsi'));
 assert.ok(!a.results.some(r=>r.label==='Documento personale'));
 const member=harness();const b=await member.globalSearch('Anna');assert.deepEqual(b.results.map(r=>r.category),['Documenti']);
 assert.deepEqual(member.calls.filter(c=>c[0]==='from').map(c=>c[1]),['ruoli_utente','documenti']);
 const instructor=harness({roles:['istruttore']});const c=await instructor.globalSearch('Anna');assert.deepEqual(c.results.map(r=>r.category),['Corsi','Eventi','Documenti']);
 assert.equal(c.results.find(r=>r.category==='Corsi').href,'/istruttore?tab=lezioni&edizione='+edition);
 assert.equal(c.results.find(r=>r.category==='Eventi').href,'/gestione-eventi/'+uid);
 assert.ok(!instructor.calls.some(x=>x[0]==='from'&&['persone','gest_elenco_iscrizioni_corsi','attrezzature'].includes(x[1])));
});
test('azione reale: errori di una categoria sono dichiarati, non presentati come assenza certa',async()=>{
 const m=harness({roles:['segreteria'],failTable:'attrezzature'});const r=await m.globalSearch('Anna');
 assert.equal(r.partial,true);assert.ok(r.results.some(x=>x.category==='Corsi'));assert.ok(!r.results.some(x=>x.category==='Attrezzature'));
});
