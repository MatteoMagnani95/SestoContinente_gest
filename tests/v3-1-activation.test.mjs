import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../lib/structural-qa.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const enabled={SC_STRUCTURAL_RPC:'true',QA_ISOLATED_ENV:'true',SESTO_TEST_MODE:'true',SESTO_EMAIL_MODE:'simulate',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321'};
function load(env){
 const exports={};
 runInNewContext(compiled,{exports,URL,process:{env},require(name){assert.equal(name,'server-only');return {};},console:{log(){}}});
 return exports;
}
test('structural activation is opt-in and impossible outside disposable QA',async()=>{
 const denied=[{},...Object.keys(enabled).map(k=>({...enabled,[k]:undefined})),...['https://example.supabase.co','http://example.invalid:54321','https://127.0.0.1:54321','http://127.0.0.1:54322','invalid'].map(NEXT_PUBLIC_SUPABASE_URL=>({...enabled,NEXT_PUBLIC_SUPABASE_URL})),{...enabled,SC_STRUCTURAL_RPC:'false'}];
 for(const env of denied){
  const module=load(env);let calls=0;
  assert.equal(module.structuralQaEnabled(),false);
  assert.equal(await module.structuralRpc({rpc(){calls++;throw Error('must not call');}},'sc_perf_dashboard',{}),null);
  assert.equal(calls,0);
 }
 assert.equal(load(enabled).structuralQaEnabled(),true);
});
test('RPC error, rejection, null and malformed result fall back without fabricated data',async()=>{
 const module=load(enabled);
 for(const rpc of [async()=>({data:null,error:null}),async()=>({data:{count:1},error:{message:'unavailable'}}),async()=>({data:[1],error:null}),async()=>{throw Error('unavailable');}]){
  assert.equal(await module.structuralRpc({rpc},'sc_perf_dashboard',{}),null);
 }
 const malformed=await module.structuralRpc({rpc:async()=>({data:{count:1},error:null})},'sc_perf_dashboard',{});
 for(const name of ['readDashboardSnapshot','readMembersPage','readInventorySnapshot','readPersonOptions','readFinanceTotals','readAccountSnapshot'])assert.equal(module[name](malformed),null);
 const result={enabled:false};
 assert.equal((await module.structuralRpc({rpc:async()=>({data:result,error:null})},'sc_perf_navigation',{})).enabled,false);
});
