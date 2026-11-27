// Dedicated functional audit. Only ephemeral local database, synthetic fixture accounts.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {Client} from 'pg';
import {chromium,webkit,expect} from '@playwright/test';
const e=process.env, work=resolve(e.QA_WORK_DIR||'.'), root=resolve('.');
const api=new URL(e.NEXT_PUBLIC_SUPABASE_URL||'http://invalid');
const dbUrl=new URL(e.QA_DB_URL||'http://invalid');
const base=new URL(e.QA_BASE_URL||'http://invalid');
const local=u=>['localhost','127.0.0.1'].includes(u.hostname);
assert.ok(e.QA_ISOLATED_ENV==='true'&&e.SESTO_TEST_MODE==='true'&&e.SESTO_EMAIL_MODE==='simulate');
assert.equal(e.SC_STRUCTURAL_RPC,'false');assert.equal(e.SC_STRUCTURAL_RPC_RELEASE,'false');
assert.ok(local(api)&&api.port==='54321'&&local(dbUrl)&&dbUrl.port==='54322'&&dbUrl.pathname==='/postgres'&&local(base)&&base.port==='3314');
assert.ok(e.QA_WORK_DIR&&work!==root&&!work.startsWith(root+'/'));
const accounts=JSON.parse(await readFile(join(work,'accounts.json'),'utf8'));
const fixtures=JSON.parse(await readFile(join(work,'fixtures.json'),'utf8'));
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
for(const a of Object.values(accounts)){assert.match(a.email,/@example\.invalid$/);assert.match(a.id,uuid);}
const modules=['anagrafiche','adesioni','tesseramenti','stagioni','corsi','edizioni','iscrizioni','istruttori','qualifiche','brevetti','certificati','programmi','versioni','piscine','corsie','calendario','prenotazioni','presenze','attrezzature','revisioni','consegne','quote','addebiti','pagamenti','listino','contabilita','comunicazioni','promemoria'];
const deniedStatus=[301,302,303,307,308,401,403];
const db=new Client({connectionString:dbUrl.href});await db.connect();
const guardianId=accounts.guardian.id;
const roles=async()=> (await db.query('select ruolo::text from public.ruoli_utente where utente_id=$1 order by ruolo',[guardianId])).rows.map(r=>r.ruolo);
const add=role=>db.query('insert into public.ruoli_utente(utente_id,ruolo) values($1,$2)',[guardianId,role]);
const remove=role=>db.query('delete from public.ruoli_utente where utente_id=$1 and ruolo=$2',[guardianId,role]);
async function allowed(page,path,destination=path.split('?')[0]){
 const res=await page.goto(path,{waitUntil:'domcontentloaded'});
 assert.equal(res?.status(),200,path);
 await expect(page).toHaveURL(u=>u.pathname===destination);
 await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
}
async function forbidden(page,path){
 await page.goto(path,{waitUntil:'domcontentloaded'});
 await expect(page).toHaveURL(u=>u.pathname!==path.split('?')[0]&&u.pathname!=='/accedi'&&u.searchParams.get('msg')==='permessi');
}
async function forbiddenApi(ctx,path){
 const response=await ctx.request.get(path,{maxRedirects:0});
 assert.ok(deniedStatus.includes(response.status()),path+' unexpected '+response.status());
 assert.ok(!/attachment/i.test(response.headers()['content-disposition']||''),path+' returned attachment');
}
async function context(browser,role){
 return browser.newContext({baseURL:base.href,storageState:join(work,role+'.json'),viewport:{width:390,height:844}});
}
try{
 assert.deepEqual(await roles(),['tutore']);
 for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await browserType.launch();
  try{
   const guardian=await context(browser,'guardian');
   try{
    const page=await guardian.newPage();
    await allowed(page,'/area-personale');
    await expect(page.getByRole('region',{name:'Persone rappresentate'})).toContainText('Minore Sintetico');
    await allowed(page,'/area-personale/certificato?persona='+accounts.guardian.represented);
    const select=page.locator('select[name=persona_id]');
    await expect(select).toHaveValue(accounts.guardian.represented);
    await expect(select.locator('option[value="'+accounts.member.person+'"]')).toHaveCount(0);
    await allowed(page,'/area-personale/certificato?persona='+accounts.member.person);
    await expect(select.locator('option[value="'+accounts.member.person+'"]')).toHaveCount(0);
    for(const path of ['/area-personale/profilo','/area-personale/corsi','/documenti','/notifiche'])await allowed(page,path);
    for(const path of ['/gestionale','/organi-sociali','/istruttore'])await forbidden(page,path);
    await forbiddenApi(guardian,'/gestionale/esporta/attrezzature');
    await forbiddenApi(guardian,'/gestionale/importazione/modello?tipo=soci');
    await forbiddenApi(guardian,'/gestionale/corsi/'+fixtures.edition+'/stampe?tipo=programma');
    // Keep same browser context: server-side grants and revocations must be immediate.
    await add('segreteria');await add('consigliere_cda');
    await allowed(page,'/gestionale');await allowed(page,'/organi-sociali');await allowed(page,'/area-personale');
    await forbidden(page,'/gestionale/utenti');
    const csv=await guardian.request.get('/gestionale/esporta/attrezzature',{maxRedirects:0});
    assert.equal(csv.status(),200);assert.match(csv.headers()['content-type'],/text\/csv/);assert.match(csv.headers()['cache-control'],/no-store/);
    await forbiddenApi(guardian,'/gestionale/esporta/contabilita');
    await remove('segreteria');
    await forbidden(page,'/gestionale');await forbiddenApi(guardian,'/gestionale/esporta/attrezzature');
    await allowed(page,'/organi-sociali');
    await remove('consigliere_cda');
    await forbidden(page,'/organi-sociali');await allowed(page,'/area-personale');
    console.log('OK '+engine+' guardian / combinations / live revocation / restricted exports');
   }finally{await remove('segreteria');await remove('consigliere_cda');await guardian.close();}
   assert.deepEqual(await roles(),['tutore']);
   const disabled=await context(browser,'memberB');
   try{
    const page=await disabled.newPage();
    for(const path of ['/area-personale','/notifiche','/documenti','/area-personale/profilo']){
     await page.goto(path,{waitUntil:'domcontentloaded'});
     await expect(page).toHaveURL(u=>u.pathname==='/accedi');
    }
    await forbiddenApi(disabled,'/gestionale/esporta/attrezzature');
    console.log('OK '+engine+' disabled account stale browser session');
   }finally{await disabled.close();}
   const staff=await context(browser,'staff');
   try{
    const page=await staff.newPage();
    const errors=[];page.on('pageerror',err=>errors.push(err.name));
    for(const module of modules){
     const path='/gestionale/moduli/'+module;
     await allowed(page,path,module==='pagamenti'?'/gestionale/incassi':path);
     await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
     console.log('OK '+engine+' archive '+module);
    }
    for(const path of ['/gestionale/utenti','/gestionale/amministrazione-dati','/gestionale/report','/gestionale/programmi-didattici','/gestionale/importazione','/gestione-eventi','/gestione-eventi/'+fixtures.event,'/gestionale/attrezzature/'+fixtures.equipment,'/gestionale/corsi/'+fixtures.edition,'/gestionale/calendario-visivo/'+fixtures.lesson]){
     await allowed(page,path);console.log('OK '+engine+' route '+path.split('/').slice(0,3).join('/'));
    }
    assert.deepEqual(errors,[],'uncaught browser errors in archive sweep');
    const off=await staff.request.get('/gestionale/incassi/person-options?q=test',{maxRedirects:0});assert.equal(off.status(),404);
   }finally{await staff.close();}
  }finally{await browser.close();}
 }
}finally{await db.end();}
console.log('OK extended functional audit, all local-only scenarios completed');
