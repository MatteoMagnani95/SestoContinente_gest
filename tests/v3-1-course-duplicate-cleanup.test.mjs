import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=readFileSync(new URL('../lib/course-errors.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={};new Function('exports',js)(mod);
const id='00000000-0000-4000-8000-000000000001';
test('Duplicate warning and link are returned before write; malformed IDs never become links',async()=>{
 const good={rpc:async()=>({data:id,error:null})},bad={rpc:async()=>({data:'invalid',error:null})};
 assert.equal((await mod.findCourseDuplicate(good,'edizioni_corsi',{})).href,'/gestionale/corsi/'+id);
 assert.equal(await mod.findCourseDuplicate(bad,'edizioni_corsi',{}),undefined);
 assert.deepEqual(await mod.courseDuplicate(bad,'edizioni_corsi',{}, {code:'23505',details:''}),{error:'Questo corso esiste già',field:'nome'});
 assert.equal((await mod.courseDuplicate(bad,'edizioni_corsi',{}, {code:'P3419',details:'invalid'})).href,undefined);
});
test('Only cancelled edition uses narrow atomic deletion RPC',async()=>{
 for(const stato of ['annullato','attivo','concluso']){
  const calls=[],q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{stato},error:null})};
  const db={from:()=>q,rpc:async(name,args)=>{calls.push({name,args});return {error:null};}};
  await mod.removeCourseEdition(db,id);
  assert.deepEqual(calls,stato==='annullato'?[{name:'elimina_edizione_annullata_vuota',args:{p_id:id}}]:[{name:'rimuovi_record_gestionale',args:{p_tabella:'edizioni_corsi',p_id:id}}]);
 }
});
