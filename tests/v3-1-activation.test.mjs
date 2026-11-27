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
test('disposable QA activation remains opt-in and does not authorize remote access',async()=>{
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
 for(const name of ['readDashboardSnapshot','readMembersPage','readInventorySnapshot','readPersonOptions','readFinanceTotals','readAccountSnapshot','readCoursesPage','readCalendarSnapshot'])assert.equal(module[name](malformed),null);
 const result={enabled:false};
 assert.equal((await module.structuralRpc({rpc:async()=>({data:result,error:null})},'sc_perf_navigation',{})).enabled,false);
});

const release={SC_STRUCTURAL_RPC:'true',SC_STRUCTURAL_RPC_RELEASE:'true',SC_STRUCTURAL_RPC_RELEASE_ENV:'production',SC_STRUCTURAL_RPC_RELEASE_PROJECT_REF:'abcdefghijklmnopqrst',VERCEL_ENV:'production',SESTO_TEST_MODE:'false',NEXT_PUBLIC_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co'};
test('remote activation is separately opt-in, exact project and environment bound, default off',async()=>{
 for(const env of [
  {},...Object.keys(release).map(k=>({...release,[k]:undefined})),
  {...release,SC_STRUCTURAL_RPC:'false'},{...release,SC_STRUCTURAL_RPC_RELEASE:'false'},
  {...release,VERCEL_ENV:'preview'},{...release,VERCEL_ENV:'development'},
  {...release,QA_ISOLATED_ENV:'true'},{...release,QA_ISOLATED_ENV:'invalid'},{...release,SESTO_TEST_MODE:'true'},
  {...release,SC_STRUCTURAL_RPC_RELEASE_PROJECT_REF:'invalid'},
  ...['https://other.supabase.co','http://abcdefghijklmnopqrst.supabase.co','https://abcdefghijklmnopqrst.supabase.co:443','https://abcdefghijklmnopqrst.supabase.co/path','https://abcdefghijklmnopqrst.supabase.co?x=y','https://abcdefghijklmnopqrst.supabase.co.evil.example','https://user@abcdefghijklmnopqrst.supabase.co','http://127.0.0.1:54321'].map(NEXT_PUBLIC_SUPABASE_URL=>({...release,NEXT_PUBLIC_SUPABASE_URL}))
 ]){
  const module=load(env);let calls=0;
  assert.equal(module.structuralReleaseEnabled(),false);
  assert.equal(module.structuralQaEnabled(),false);
  assert.equal(await module.structuralRpc({rpc(){calls++;throw Error('must not call');}},'sc_perf_dashboard',{}),null);
  assert.equal(calls,0);
 }
 for(const env of [release,{...release,NEXT_PUBLIC_SUPABASE_URL:release.NEXT_PUBLIC_SUPABASE_URL+'/'},{...release,SC_STRUCTURAL_RPC_RELEASE_ENV:'preview',VERCEL_ENV:'preview'}]){
  const module=load(env);let calls=0;
  assert.equal(module.structuralReleaseEnabled(),true);
  assert.equal(module.structuralQaEnabled(),true);
  const result=await module.structuralRpc({async rpc(){calls++;return {data:{enabled:false},error:null};}},'sc_perf_navigation',{});
  assert.equal(result.enabled,false);assert.equal(calls,1);
  assert.equal(await module.structuralRpc({async rpc(){return {data:null,error:{message:'unavailable'}};}},'sc_perf_dashboard',{}),null);
  assert.equal(module.readDashboardSnapshot({count:1}),null);
 }
});
