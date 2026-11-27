// Full browser quorum / real Storage / Data API isolation on fresh local fixtures.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {Client} from 'pg';
import JSZip from 'jszip';
import {PDFDocument} from 'pdf-lib';
import {chromium,expect} from '@playwright/test';
const e=process.env, work=resolve(e.QA_WORK_DIR||'.'),root=resolve('.');
const api=new URL(e.NEXT_PUBLIC_SUPABASE_URL||'http://invalid'),app=new URL(e.QA_BASE_URL||'http://invalid'),dbUrl=new URL(e.QA_DB_URL||'http://invalid');
const local=u=>['localhost','127.0.0.1'].includes(u.hostname);
assert.ok(e.QA_ISOLATED_ENV==='true'&&e.SESTO_TEST_MODE==='true'&&e.SESTO_EMAIL_MODE==='simulate');
assert.equal(e.SC_STRUCTURAL_RPC,'false');assert.equal(e.SC_STRUCTURAL_RPC_RELEASE,'false');
assert.ok(local(api)&&api.port==='54321'&&local(app)&&app.port==='3314'&&local(dbUrl)&&dbUrl.port==='54322'&&dbUrl.pathname==='/postgres');
assert.ok(e.QA_WORK_DIR&&work!==root&&!work.startsWith(root+'/'));
const a=JSON.parse(await readFile(join(work,'accounts.json'),'utf8'));
for(const x of Object.values(a))assert.match(x.email,/@example\.invalid$/);
const auth={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false};
const admin=createClient(api.href,e.SUPABASE_SERVICE_ROLE_KEY,{auth});
const anonymous=createClient(api.href,e.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth});
const checked=(r,label)=>{assert.ok(!r.error,label+' '+(r.error?.code||''));return r.data;};
const login=async role=>{const c=createClient(api.href,e.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth});checked(await c.auth.signInWithPassword({email:a[role].email,password:a[role].password}),'login '+role);return c;};
const db=new Client({connectionString:dbUrl.href});await db.connect();
const browser=await chromium.launch();
const contexts=[];
async function open(role){
 const ctx=await browser.newContext({baseURL:app.href,viewport:{width:1280,height:900}});contexts.push(ctx);
 const page=await ctx.newPage();await page.goto('/accedi');await page.locator('input[name=email]').first().fill(a[role].email);await page.locator('input[name=password]').fill(a[role].password);await page.getByRole('button',{name:'Accedi',exact:true}).click();await page.waitForURL(u=>!['/accedi','/smista','/'].includes(u.pathname),{timeout:30000});return page;
}
const denied=async(promise,label)=>{const r=await promise;assert.ok(r.error||Array.isArray(r.data)&&r.data.length===0,label+' returned rows');if(r.error)assert.ok(['42501','PGRST301'].includes(r.error.code),label+' unexpected '+r.error.code);};
const count=async(table,id)=>Number((await db.query('select count(*)::int as n from public.'+table+' where verbale_id=$1',[id])).rows[0].n);
async function docx(text){
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml','<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+text+'</w:t></w:r></w:p></w:body></w:document>');
 return zip.generateAsync({type:'nodebuffer'});
}
try{
 const [staffApi,memberApi]=await Promise.all([login('staff'),login('member')]);
 // Verify real positive controls, then prove no anonymous disclosure for each view.
 const cert=await db.query("insert into public.certificati_medici(persona_id,rilasciato_il,scade_il) values($1,current_date,current_date+365) returning id",[a.unassigned.person]);
 assert.equal(cert.rowCount,1);
 for(const view of ['allievi_senza_certificato','saldi_quote','stato_certificati']){
  const positive=checked(await staffApi.from(view).select('*').limit(1),'positive '+view);assert.equal(positive.length,1,view+' fixture missing');
  await denied(anonymous.from(view).select('*').limit(10),'anon '+view);
  console.log('OK Data API anonymous denied '+view+' (positive staff control)');
 }
 await denied(memberApi.from('stato_certificati').select('id').eq('id',cert.rows[0].id),'unrelated certificate view');
 // Two eligible board accounts: one already seeded, the other explicitly
 // assigned solely for this synthetic test. No production role changes.
 await db.query("insert into public.ruoli_utente(utente_id,ruolo) values($1,'consigliere_cda')",[a.instructor.id]);
 await db.query("insert into public.cda_componenti(persona_id,carica,dal,al) values($1,'Consigliere',current_date,(current_date+interval '4 years')::date)",[a.instructor.person]);
 const [staff,first,second,outsider]=await Promise.all(['staff','board','instructor','member'].map(open));
 const subject='Verbale audit '+randomUUID(),date=(await db.query('select current_date::text as d')).rows[0].d;
 const buffer=await docx('Verbale sintetico di collaudo, prima versione.');
 await staff.goto('/organi-sociali?tab=sedute');
 await staff.getByRole('button',{name:'Nuova seduta e verbale',exact:true}).click();
 const form=staff.getByRole('dialog',{name:'Nuova seduta e verbale'});
 await form.locator('input[name=data_consiglio]').fill(date);
 await form.locator('input[name=oggetto]').fill(subject);
 await form.locator('select[name=tipo]').selectOption('Gestione Ordinaria / Altro');
 await form.locator('input[name=documento]').setInputFiles({name:'sintetico.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer});
 await form.getByRole('button',{name:'Carica bozza',exact:true}).click();await expect(staff).toHaveURL(/msg=bozza_ok/);
 const initial=checked(await admin.from('cda_verbali').select('id,stato,percorso_docx').eq('oggetto',subject).single(),'created draft');assert.equal(initial.stato,'bozza');
 const article=(page,id)=>page.locator('#verbale-'+id);
 const preview=id=>'/organi-sociali/documento/'+id+'?tipo=anteprima';
 const get=async(page,path)=>page.context().request.get(path,{maxRedirects:0});
 await staff.goto('/organi-sociali?tab=bozze');
 await article(staff,initial.id).getByRole('button',{name:'Apri votazione'}).click();
 const approval=staff.getByRole('dialog',{name:'Apri votazione · '+subject});
 await approval.getByRole('button',{name:'Conferma apertura votazione'}).click();await expect(staff).toHaveURL(/msg=avviata/);
 assert.equal(await count('cda_votanti',initial.id),2);assert.equal(await count('cda_voti',initial.id),0);
 const forbidden=await get(outsider,preview(initial.id));assert.ok([301,302,303,307,308,401,403,404].includes(forbidden.status()));
 await denied(memberApi.from('cda_verbali').select('id').eq('id',initial.id),'ordinary member board');
 const boardApi=await login('board');
 const forge=await boardApi.rpc('leggi_versione_cda',{p_verbale:initial.id,p_docx:initial.percorso_docx,p_utente:a.board.id});assert.ok(forge.error,'direct reading attestation must be denied');
 await denied(boardApi.from('cda_letture').select('*').eq('verbale_id',initial.id),'board direct reading table');
 async function vote(page,id,msg){
  await page.goto('/organi-sociali?tab=votazioni');
  await article(page,id).getByRole('button',{name:'Approva verbale'}).click();
  await expect(page).toHaveURL(new RegExp('msg='+msg));
 }
 async function read(page,id){
  const res=await get(page,preview(id));assert.equal(res.status(),200);assert.match(res.headers()['cache-control'],/no-store/);await PDFDocument.load(await res.body());
 }
 await vote(first,initial.id,'lettura');assert.equal(await count('cda_voti',initial.id),0);assert.equal(await count('cda_letture',initial.id),0);
 await read(first,initial.id);assert.equal(await count('cda_letture',initial.id),1);
 await vote(first,initial.id,'voto_ok');assert.equal(await count('cda_voti',initial.id),1);
 assert.equal(checked(await admin.from('cda_verbali').select('stato').eq('id',initial.id).single(),'partial quorum').stato,'in_approvazione');
 // Replace before quorum: old votes remain historical, no new votes/read receipts.
 await staff.goto('/organi-sociali?tab=votazioni');await article(staff,initial.id).getByRole('button',{name:'Sostituisci documento'}).click();
 const replace=staff.getByRole('dialog',{name:'Sostituisci documento'});
 await replace.locator('input[name=documento]').setInputFiles({name:'sintetico-v2.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:await docx('Verbale sintetico di collaudo, seconda versione.')});
 await replace.getByRole('button',{name:'Sottoponi la nuova versione'}).click();await expect(staff).toHaveURL(/msg=avviata/);
 const revised=checked(await admin.from('cda_verbali').select('id,stato,percorso_docx').eq('precedente_id',initial.id).single(),'revision');assert.equal(revised.stato,'in_approvazione');
 assert.equal(checked(await admin.from('cda_verbali').select('stato').eq('id',initial.id).single(),'old state').stato,'sostituito');
 assert.equal(await count('cda_voti',initial.id),1);assert.equal(await count('cda_voti',revised.id),0);assert.equal(await count('cda_letture',revised.id),0);
 await vote(first,revised.id,'lettura');
 await Promise.all([read(first,revised.id),read(second,revised.id)]);assert.equal(await count('cda_letture',revised.id),2);
 await vote(first,revised.id,'voto_ok');await vote(second,revised.id,'approvato');
 assert.equal(await count('cda_voti',revised.id),2);
 const final=checked(await admin.from('cda_verbali').select('stato,percorso_pdf,approvato_il').eq('id',revised.id).single(),'final');assert.equal(final.stato,'approvato');assert.ok(final.approvato_il&&final.percorso_pdf);
 const pdf=checked(await admin.storage.from('sesto-cda').download(final.percorso_pdf),'final PDF');await PDFDocument.load(await pdf.arrayBuffer());
 const signed=await get(second,'/organi-sociali/documento/'+revised.id+'?tipo=pdf');assert.equal(signed.status(),307);assert.match(signed.headers()['cache-control'],/no-store/);
 const blocked=await get(outsider,'/organi-sociali/documento/'+revised.id+'?tipo=pdf');assert.ok([301,302,303,307,308,401,403,404].includes(blocked.status()));
 // A rejected outsider must not receive a signed storage URL.
 if(blocked.headers().location)assert.ok(!blocked.headers().location.includes('/storage/'));
 console.log('OK UI board draft upload, vote without reading denied, direct attestation denied, version replacement resets quorum, unanimous approval and PDF, outsider denied');
}finally{for(const c of contexts)await c.close();await browser.close();await db.end();}
