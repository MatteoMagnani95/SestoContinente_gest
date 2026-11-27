// Isolated before/after reproduction: no real medical files or accounts.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {Client} from 'pg';
import {chromium,expect} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';
const e=process.env, work=resolve(e.QA_WORK_DIR||'.'),root=resolve('.');
const api=new URL(e.NEXT_PUBLIC_SUPABASE_URL||'http://invalid'),dbUrl=new URL(e.QA_DB_URL||'http://invalid'),app=new URL(e.QA_BASE_URL||'http://invalid');
const local=u=>['localhost','127.0.0.1'].includes(u.hostname);
assert.ok(e.QA_ISOLATED_ENV==='true'&&e.SESTO_TEST_MODE==='true'&&e.SESTO_EMAIL_MODE==='simulate');
assert.equal(e.SC_STRUCTURAL_RPC,'false');assert.equal(e.SC_STRUCTURAL_RPC_RELEASE,'false');
assert.ok(local(api)&&api.port==='54321'&&local(dbUrl)&&dbUrl.port==='54322'&&dbUrl.pathname==='/postgres'&&local(app)&&app.port==='3314');
assert.ok(e.QA_WORK_DIR&&work!==root&&!work.startsWith(root+'/'));
const accounts=JSON.parse(await readFile(join(work,'accounts.json'),'utf8'));
const auth={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false};
const admin=createClient(api.href,e.SUPABASE_SERVICE_ROLE_KEY,{auth});
const checked=(r,label)=>{assert.ok(!r.error,label+': '+(r.error?.code||r.error?.message||''));return r.data;};
const login=async a=>{assert.match(a.email,/@example\.invalid$/);const c=createClient(api.href,e.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth});checked(await c.auth.signInWithPassword({email:a.email,password:a.password}),'login');return c;};
const [owner,other,staff]=await Promise.all([login(accounts.member),login(accounts.guardian),login(accounts.staff)]);
const db=new Client({connectionString:dbUrl.href});await db.connect();
const browser=await chromium.launch();
try{
 const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
 const med=randomUUID(),normal=randomUUID(),unknown=randomUUID();
 const paths={med:accounts.member.id+'/documenti/'+med+'.pdf',normal:accounts.member.id+'/documenti/'+normal+'.pdf'};
 for(const [key,id,category] of [['med',med,'Certificato medico'],['normal',normal,'Collaudo']]){
  checked(await admin.from('documenti').insert({id,nome:'Documento sintetico AUD006',categoria:category,ambito:'personale',visibilita:'proprietario',utente_id:accounts.member.id,persona_id:accounts.member.person,percorso_storage:paths[key],mime:'application/pdf',dimensione_bytes:bytes.length,caricato_da:accounts.member.id}),'synthetic metadata');
  checked(await admin.storage.from('sesto-documenti').upload(paths[key],bytes,{contentType:'application/pdf',upsert:false}),'synthetic file');
 }
 const classify=(c,id)=>c.rpc('documento_sanitario',{p_id:id});
 const pathClass=(c,p)=>c.rpc('percorso_sanitario',{p_percorso:p});
 const visibility=async(c,id)=>checked(await c.from('documenti').select('id').eq('id',id),'metadata visibility').length;
 const verifyAccess=async()=>{
  assert.equal(await visibility(other,med),0);assert.equal(await visibility(owner,med),1);assert.equal(await visibility(staff,med),1);
  assert.equal(await visibility(owner,normal),1);
  for(const c of [owner,other,staff])assert.ok((await c.storage.from('sesto-documenti').download(paths.med)).error,'direct medical storage must remain denied');
  checked(await owner.storage.from('sesto-documenti').createSignedUrl(paths.normal,60),'ordinary file signed URL');
  for(const role of ['member','guardian','staff']){
   const ctx=await browser.newContext({baseURL:app.href,storageState:join(work,role+'.json')});
   try{
    const response=await ctx.request.get('/documenti/'+med+'?download=1',{maxRedirects:0});
    if(role==='guardian')assert.equal(response.status(),404);
    else{assert.equal(response.status(),200);assert.deepEqual(await response.body(),bytes);assert.match(response.headers()['cache-control'],/no-store/);}
   }finally{await ctx.close();}
  }
  assert.ok((await admin.from('documenti').update({categoria:'Collaudo'}).eq('id',med)).error,'medical metadata immutable even for privileged update');
 };
 await verifyAccess();
 // Positive reproduction: the unrelated account cannot read metadata but can
 // distinguish a known medical UUID / legacy path from a normal or absent one.
 assert.equal(checked(await classify(other,med),'baseline classification'),true);
 assert.equal(checked(await classify(other,unknown),'baseline absent'),false);
 assert.equal(checked(await pathClass(other,paths.med),'baseline path classification'),true);
 assert.equal(checked(await pathClass(other,paths.normal),'baseline ordinary path'),false);
 console.log('REPRODUCED AUD-006: unauthorized classification of synthetic UUID and legacy path; content still denied');
 const migration=process.argv[2];assert.ok(migration&&resolve(migration).startsWith(root+'/supabase/migrations/'));
 await db.query('begin');
 try{await db.query(await readFile(migration,'utf8'));await db.query('commit');}catch(err){await db.query('rollback');throw err;}
 // Wait for PostgREST to refresh its schema cache; don't treat transient errors as a pass.
 await expect.poll(async()=>{const r=await classify(owner,med);return !r.error&&r.data===true;},{timeout:20000}).toBe(true);
 assert.equal(checked(await classify(other,med),'guarded classification'),false);
 assert.equal(checked(await classify(other,unknown),'guarded missing classification'),false);
 assert.equal(checked(await classify(staff,med),'authorized classification'),true);
 assert.equal(checked(await classify(owner,normal),'ordinary classification'),false);
 await expect.poll(async()=>{const r=await pathClass(other,paths.med);return r.error?.code;},{timeout:20000}).toBe('PGRST202');
 const hidden=await other.schema('sesto_internal').rpc('documento_sanitario',{p_id:med});
 assert.equal(hidden.error?.code,'PGRST106','internal schema must not be exposed');
 await verifyAccess();
 console.log('PASS AUD-006: classification blocked for unrelated user; authorized route, RLS, ordinary Storage and immutable medical metadata preserved');
}finally{await browser.close();await db.end();}
