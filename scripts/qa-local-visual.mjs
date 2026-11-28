// F7: real rendering using ONLY isolated synthetic QA; never export sessions.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium,webkit,expect} from '@playwright/test';
const env=process.env,root=resolve('.');
const app=new URL(env.QA_BASE_URL||'http://invalid'),api=new URL(env.NEXT_PUBLIC_SUPABASE_URL||'http://invalid'),db=new URL(env.QA_DB_URL||'http://invalid');
const loopback=u=>['127.0.0.1','localhost'].includes(u.hostname);
assert.ok(env.QA_ISOLATED_ENV==='true'&&env.SESTO_TEST_MODE==='true'&&env.SESTO_EMAIL_MODE==='simulate');
assert.ok([app,api,db].every(loopback)&&api.port==='54321'&&db.port==='54322'&&db.pathname==='/postgres');
assert.ok(env.QA_WORK_DIR&&env.QA_VISUAL_DIR&&env.RUNNER_TEMP);
const work=resolve(env.QA_WORK_DIR),out=resolve(env.QA_VISUAL_DIR),temp=resolve(env.RUNNER_TEMP);
for(const p of [work,out])assert.ok(p!==root&&!p.startsWith(root+'/')&&p.startsWith(temp+'/'));
assert.ok(out!==work&&!out.startsWith(work+'/')&&!work.startsWith(out+'/'),'Evidenze separate da sessioni e credenziali');
await mkdir(out,{recursive:true,mode:0o700});
const f=JSON.parse(await readFile(join(work,'fixtures.json'),'utf8'));
for(const k of ['person','edition','pool','lessonDay'])assert.ok(f[k], 'Fixture '+k+' mancante');
const openPerson=async page=>{
 await page.getByRole('navigation',{name:'Azioni principali'}).getByRole('link',{name:'Nuova persona'}).click();
 await expect(page.getByRole('dialog',{name:'Aggiungi persona'})).toBeVisible();
};
const cases=[
 ['01-dashboard','staff','/gestionale','Centro operativo'],
 ['02-elenco-soci','staff','/gestionale/soci','Soci e allievi'],
 ['03-form-anagrafico','staff','/gestionale','Centro operativo',openPerson],
 ['04-scheda-socio','staff','/gestionale/soci/'+f.person,null],
 ['05-gestione-corsi','staff','/gestionale/corsi',null],
 ['06-scheda-corso','staff','/gestionale/corsi/'+f.edition+'?tab=panoramica',null],
 ['07-calendario-piscine-corsie','staff','/gestionale/calendario-visivo?'+new URLSearchParams({giorno:f.lessonDay,vista:'settimana',piscina:f.pool}),null],
 ['08-incassi-saldi','staff','/gestionale/incassi','Incassi e saldi'],
 ['09-inventario-attrezzature','staff','/gestionale/moduli/attrezzature',null],
 ['10-eventi','staff','/gestione-eventi',null],
 ['11-organi-sociali','staff','/organi-sociali',null],
 ['12-archivio-documenti','staff','/documenti',null],
 ['13-area-personale','member','/area-personale','La tua associazione'],
 ['14-area-istruttori','instructor','/istruttore','I miei corsi'],
 ['14b-registro-presenze','instructor','/istruttore?tab=presenze&edizione='+f.edition,'I miei corsi'],
 ['15a-login','guest','/accedi','Accedi'],
 ['15b-registrazione','guest','/registrati','Crea il tuo account'],
 ['16-mobile-area-personale','member','/area-personale','La tua associazione'],
 ['extra-comunicazioni-corso','staff','/comunicazioni/corsi/'+f.edition,null],
 ['extra-comunicazioni-socio','staff','/comunicazioni/soci/'+f.person,null],
];
const sizes=[{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:1024,height:768},{width:1440,height:900},{width:1920,height:1080}];
const report={schema:1,headCommit:env.QA_HEAD_SHA||null,checkoutCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workflowCommit:env.GITHUB_SHA||null,environment:'local synthetic only',checks:[],errors:[],limitations:['Reflow widths are not a browser-zoom 200% test','Checks do not certify WCAG 2.2 AA','Mockup similarity requires human inspection of screenshots','No physical device or production preview']};
for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch({headless:true});
 try{
  for(const [name,role,path,heading,prepare] of cases){
   const context=await browser.newContext({baseURL:app.origin,viewport:{width:1440,height:900},reducedMotion:'reduce',...(role==='guest'?{}:{storageState:join(work,role+'.json')})});
   await context.route('**/*',route=>{const u=new URL(route.request().url());return [app.origin,api.origin].includes(u.origin)?route.continue():route.abort();});
   const page=await context.newPage();
   try{
    const response=await page.goto(path,{waitUntil:'domcontentloaded'});
    assert.ok(response&&response.ok(),'HTTP unsuccessful');
    const expected=new URL(path,app.origin);
    assert.equal(new URL(page.url()).pathname,expected.pathname,'Unexpected redirect');
    await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
    if(heading)await expect(page.getByRole('heading',{level:1,name:heading,exact:true})).toBeVisible();
    if(prepare)await prepare(page);
    await page.evaluate(async()=>{
     await document.fonts.ready;
     const images=[...document.querySelectorAll('img[src*="/brand/"]')];
     for(const image of images)image.loading='eager';
     await Promise.all(images.map(image=>image.decode()));
     if(images.some(image=>!image.complete||image.naturalWidth===0))throw Error('Missing local brand asset');
    });
    for(const size of sizes){
     await page.setViewportSize(size);
     const m=await page.evaluate(()=>{
      const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[inert]');
      const inputs=[...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')].filter(visible);
      const controls=[...document.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea')].filter(visible);
      const smallFields=inputs.filter(e=>parseFloat(getComputedStyle(e).fontSize)<16).map(e=>({tag:e.tagName.toLowerCase(),name:e.getAttribute('name'),font:parseFloat(getComputedStyle(e).fontSize)}));
      const smallActions=controls.filter(e=>e.matches('button,a.sc-button,a.button,select,textarea,input:not([type=checkbox]):not([type=radio])')).filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44;}).map(e=>({tag:e.tagName.toLowerCase(),type:e.getAttribute('type'),className:typeof e.className==='string'?e.className.slice(0,120):'',width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)}));
      return {width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,main:document.querySelectorAll('main').length,h1:document.querySelectorAll('h1').length,visibleInputs:inputs.map(e=>parseFloat(getComputedStyle(e).fontSize)),smallFields,smallActions,unlabelledInputs:inputs.filter(e=>!(e.labels?.length||e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.getAttribute('title'))).length,smallTargets:controls.filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44;}).length};
     });
     const row={engine,name,role,viewport:size,overflow:m.scrollWidth>m.width+1,main:m.main,h1:m.h1,smallInput:size.width<=600&&m.visibleInputs.some(x=>x<16),unlabelledInputs:m.unlabelledInputs,smallTargets:m.smallTargets,smallFields:m.smallFields,smallActions:m.smallActions};
     report.checks.push(row);
     if(row.overflow||row.smallInput||row.main!==1||row.h1!==1||row.unlabelledInputs!==0||row.smallActions.length!==0)report.errors.push({engine,name,viewport:size,reason:'reflow/input/landmark/action-target check',row});
     if(size.width===390||size.width===1440){
      const image=engine+'-'+name+'-'+size.width+'.png';
      await page.screenshot({path:join(out,image),fullPage:true,animations:'disabled',caret:'hide'});row.screenshot=image;
     }
    }
   }catch(e){report.errors.push({engine,name,reason:e instanceof Error?e.name:'failure'});await page.screenshot({path:join(out,engine+'-'+name+'-failure.png'),fullPage:true,animations:'disabled',caret:'hide'}).catch(()=>{});}
   finally{await context.close();}
  }
 }finally{await browser.close();}
}
await writeFile(join(out,'visual-manifest.json'),JSON.stringify(report,null,2),{mode:0o600});
console.log('F7 local capture: '+report.checks.length+' viewport checks; '+report.errors.length+' issues');
if(report.errors.length)process.exitCode=1;
