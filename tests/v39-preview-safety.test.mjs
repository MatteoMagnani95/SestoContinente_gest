import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
function load(path,dependencies={}){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
test('Anteprima Vercel: invio reale non consentito anche se configurato',()=>{
 const {mailMode}=load('lib/email-tools.ts');
 assert.equal(mailMode({SESTO_EMAIL_MODE:'live',VERCEL_ENV:'preview'}),'simulate');
 assert.equal(mailMode({SESTO_EMAIL_MODE:'live',VERCEL_ENV:'development'}),'simulate');
 assert.equal(mailMode({SESTO_EMAIL_MODE:'live',VERCEL_ENV:'production'}),'live');
 assert.equal(mailMode({SESTO_EMAIL_MODE:'live',VERCEL_ENV:'production',SESTO_TEST_MODE:'true'}),'simulate');
 assert.equal(mailMode({SESTO_EMAIL_MODE:'test',VERCEL_ENV:'preview'}),'test');
});
test('Cron: anteprima e collaudo non raggiungono il database, nemmeno con secret valido',async()=>{
 const vars=['CRON_SECRET','VERCEL_ENV','SESTO_TEST_MODE','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
 const old=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
 let calls=0;
 const {GET}=load('app/api/cron/promemoria/route.ts',{
  'next/server':{NextResponse:{json:(data,options)=>Response.json(data,options)}},
  '@supabase/supabase-js':{createClient:()=>{calls++;throw Error('Database non consentito');}},
  '@/lib/email-service':{},'@/lib/email-tools':{}
 });
 try{
  Object.assign(process.env,{CRON_SECRET:'test-local-only',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake-local-key'});
  const request=new Request('http://localhost/api/cron/promemoria',{headers:{authorization:'Bearer test-local-only'}});
  for(const [env,mode] of [['preview','false'],['development','false'],['production','true']]){
   process.env.VERCEL_ENV=env;process.env.SESTO_TEST_MODE=mode;
   assert.equal((await GET(request)).status,403);
  }
  assert.equal((await GET(new Request(request.url))).status,401);
  assert.equal(calls,0);
 }finally{
  for(const k of vars){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
 }
});

test('Notifica letta: nessun successo se la RPC void non ha modificato una notifica propria',async()=>{
 const id='00000000-0000-4000-8000-000000000001',calls=[];
 let row=null,readError=null,rpcError=null;
 const query={select:()=>query,eq:(key,value)=>{calls.push([key,value]);return query;},maybeSingle:async()=>({data:row,error:readError})};
 const {markNotification}=load('app/area-personale/actions.ts',{
  '@/lib/security':{requireUser:async()=>({user:{id:'account-proprio'},supabase:{from:()=>query,rpc:async()=>({error:rpcError})}})},
  '@/lib/course-ui':{},'next/cache':{revalidatePath:()=>{}},
  'next/navigation':{redirect:href=>{throw Error('REDIRECT '+href);}}
 });
 const form=new FormData();form.set('id',id);
 await assert.rejects(markNotification(form),/msg=notifica_errore$/);
 assert.ok(calls.some(([k,v])=>k==='utente_id'&&v==='account-proprio'));
 row={letta_il:'2026-11-26T16:00:00Z'};rpcError={code:'NETWORK'};
 await assert.rejects(markNotification(form),/msg=letta$/);
 readError={code:'NETWORK'};
 await assert.rejects(markNotification(form),/msg=notifica_errore$/);
 form.set('id','non-valido');await assert.rejects(markNotification(form),/msg=notifica_errore$/);
});
