import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,deps={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>deps[id]??require(id));return exports;
}
const tools=load('lib/course-tools.ts');
test('Date reali: febbraio bisestile, mesi e giorno zero',()=>{
 for(const d of ['2024-02-29','2026-11-26'])assert.equal(tools.isCalendarDate(d),true);
 for(const d of ['2025-02-29','2026-04-31','2026-13-01','2026-11-00','0000-01-01',''])assert.equal(tools.isCalendarDate(d),false);
 const f=new FormData();f.set('date','2026-02-31');assert.throws(()=>tools.dateValue(f,'date'),/Data non valida/);
});
test('Oggi a Roma: mezzanotte italiana in inverno ed estate',()=>{
 assert.equal(tools.todayRome(new Date('2026-11-26T23:30:00Z')),'2026-11-27');
 assert.equal(tools.todayRome(new Date('2026-07-26T22:30:00Z')),'2026-07-27');
});
test('Certificato: validazione reale prima del caricamento sul client e sul server',()=>{
 const client=read('components/CertificateUploadForm.tsx'),server=read('app/area-personale/certificato/actions.ts');
 assert.ok(client.indexOf('if(!isCalendarDate(dal)')>=0);
 assert.ok(client.indexOf('if(!isCalendarDate(dal)')<client.indexOf('const ticket=await preparaCaricamento'));
 assert.match(server,/!isCalendarDate\(dal\)\|\|!isCalendarDate\(al\)\|\|al<dal\|\|dal>todayRome\(\)/);
});
const redirect=path=>{throw new Error('redirect:'+path);};
async function route(results,expected,expectedQueries){
 const calls=[];
 const supabase={from(table){
  calls.push(table);
  const query={select:()=>query,eq:()=>query,maybeSingle:async()=>results[table],then:(resolve,reject)=>Promise.resolve(results[table]).then(resolve,reject)};
  return query;
 }};
 const {default:smista}=load('app/smista/page.tsx',{'next/navigation':{redirect},'@/lib/security':{requireUser:async()=>({supabase,user:{id:'test'}})}});
 await assert.rejects(smista(),e=>e.message==='redirect:'+expected);
 assert.deepEqual(calls,expectedQueries);
}
test('Instradamento: errore DB non equivale a nessun ruolo, pratica o collegamento',async()=>{
 const roles={data:[],error:null},request={data:null,error:null};
 await route({ruoli_utente:{error:{code:'DB'}}},'/?msg=instradamento',['ruoli_utente']);
 await route({ruoli_utente:roles,richieste:{error:{code:'DB'}}},'/?msg=instradamento',['ruoli_utente','richieste']);
 await route({ruoli_utente:roles,richieste:request,collegamenti_persone:{count:null,error:null}},'/?msg=instradamento',['ruoli_utente','richieste','collegamenti_persone']);
 await route({ruoli_utente:roles,richieste:request,collegamenti_persone:{count:0,error:null}},'/richiesta/nuova',['ruoli_utente','richieste','collegamenti_persone']);
 await route({ruoli_utente:roles,richieste:request,collegamenti_persone:{count:1,error:null}},'/area-personale',['ruoli_utente','richieste','collegamenti_persone']);
});
test('Instradamento: istruttori e consiglieri non dipendono dalla richiesta di adesione',async()=>{
 for(const [ruolo,path] of [['istruttore','/istruttore'],['consigliere_cda','/organi-sociali'],['segreteria','/gestionale'],['amministratore','/gestionale']])
  await route({ruoli_utente:{data:[{ruolo}],error:null}},path,['ruoli_utente']);
});
test('Messaggi: chiavi arbitrarie non restituiscono proprietà del prototipo',()=>{
 const security=load('lib/security.ts',{'next/navigation':{redirect},'@/lib/supabase/server':{},'@/lib/structural-qa':load('lib/structural-qa.ts',{'server-only':{}})});
 for(const key of ['__proto__','constructor','toString','unknown'])assert.equal(security.queryMessage(key),'');
 assert.match(security.queryMessage('instradamento'),/Accesso effettuato/);
 assert.equal(security.formatDate('2026-11-26T23:30:00Z'),'27/11/2026');
 assert.equal(security.formatDate('non valida'),'—');
});
