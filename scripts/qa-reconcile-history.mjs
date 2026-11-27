import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Client} from 'pg';
const e=process.env;
assert.equal(e.QA_ISOLATED_ENV,'true');
assert.equal(e.SESTO_TEST_MODE,'true');
assert.equal(e.SESTO_EMAIL_MODE,'simulate');
assert.ok(!e.SUPABASE_ACCESS_TOKEN);
const u=new URL(e.QA_DB_URL), api=new URL(e.NEXT_PUBLIC_SUPABASE_URL);
assert.ok(['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='54322'&&u.pathname==='/postgres');
assert.ok(['127.0.0.1','localhost'].includes(api.hostname)&&api.port==='54321');
const work=e.QA_WORK_DIR;
assert.ok(work);
const files=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')).sort();
const versions=files.map(x=>x.split('_')[0]);
assert.equal(versions.length,29);
const missing=['20261125223000','20261126160000','20261126162500','20261126163000','20261126163410','20261126163420','20261126171000','20261126172500','20261126213000'];
const alias='20261127091403', canonical=missing.at(-1), pending=versions.slice(-2);
assert.deepEqual(pending,['20261127122235','20261127125108']);
const historical=versions.slice(0,-2);
const divergence=historical.filter(v=>!missing.includes(v)).concat(alias).sort();
assert.equal(divergence.length,19);
const reportPath=join(work,'reconciliation-evidence.json');
const mode=process.argv[2];
const db=new Client({connectionString:u.href});
await db.connect();
const list=async()=> (await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(x=>x.version);
const rpcCount=async()=>Number((await db.query("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'sc_perf_%'")).rows[0].count);
async function fingerprint(){
 const sql=[
 "select n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') order by 1,2",
 "select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid),p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth','storage') and p.prokind='f' and p.proname not like 'sc_perf_%' order by 1,2,3",
 "select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','auth','storage') order by 1,2,3",
 "select n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid),k.convalidated from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') order by 1,2,3",
 "select n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid),t.tgenabled from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') and not t.tgisinternal order by 1,2,3"
 ];
 const h=createHash('sha256');
 for(const q of sql)h.update(JSON.stringify((await db.query(q)).rows));
 return h.digest('hex');
}
try{
 if(mode==='simulate'){
  assert.deepEqual(await list(),historical);
  assert.equal(await rpcCount(),0);
  const before=await fingerprint();
  const old=(await db.query('select name,statements from supabase_migrations.schema_migrations where version=$1',[canonical])).rows[0];
  assert.ok(old&&old.statements?.length);
  await db.query('begin');
  try{
   await db.query('update supabase_migrations.schema_migrations set version=$1 where version=$2',[alias,canonical]);
   await db.query('delete from supabase_migrations.schema_migrations where version=any($1::text[])',[missing.slice(0,-1)]);
   await db.query('commit');
  }catch(err){await db.query('rollback');throw err;}
  assert.deepEqual(await list(),divergence);
  assert.equal(await fingerprint(),before);
  writeFileSync(reportPath,JSON.stringify({syntheticOnly:true,releaseSha:'fb14535f9c234388158215b530daa65f5688370e',historyBefore:19,schemaFingerprint:before,initialRpcCount:0,simulation:true},null,2));
 }else{
  const report=JSON.parse(readFileSync(reportPath,'utf8'));
  if(mode==='repaired'){
   assert.deepEqual(await list(),historical);
   assert.equal(await fingerprint(),report.schemaFingerprint);
   assert.equal(await rpcCount(),0);
   report.repairHistoryCount=27;report.schemaUnchanged=true;
  }else if(mode==='dry-run'){
   assert.deepEqual(await list(),historical);
   const output=readFileSync(join(work,'dry-run.txt'),'utf8');
   const mentioned=[...new Set(output.match(/\b\d{14}_[a-zA-Z0-9_]+\.sql\b/g)||[])].sort();
   assert.deepEqual(mentioned,files.slice(-2));
   report.pendingMigrations=mentioned;
  }else if(mode==='final'){
   assert.deepEqual(await list(),versions);
   assert.equal(await rpcCount(),9);
   assert.equal(await fingerprint(),report.schemaFingerprint);
   report.finalHistoryCount=29;report.rpcCount=9;report.historicalSchemaUnchanged=true;
  }else throw Error('unexpected mode');
  writeFileSync(reportPath,JSON.stringify(report,null,2));
 }
 console.log('OK reconciliation stage: '+mode);
}finally{await db.end();}
