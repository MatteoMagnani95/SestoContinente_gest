// Actual UI screenshots, isolated synthetic accounts only. No storage state or tokens exported.
import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {waitForBrandImages} from './qa-marine-images.mjs';
const e=process.env;
for(const key of ['QA_ISOLATED_ENV','SESTO_TEST_MODE'])assert.equal(e[key],'true');
for(const key of ['SC_STRUCTURAL_RPC','SC_STRUCTURAL_RPC_RELEASE'])assert.equal(e[key],'false');
assert.equal(e.SESTO_EMAIL_MODE,'simulate');
const app=new URL(e.QA_BASE_URL),db=new URL(e.NEXT_PUBLIC_SUPABASE_URL);
assert.equal(app.origin,'http://127.0.0.1:3314');
assert.ok(['127.0.0.1','localhost'].includes(db.hostname)&&db.port==='54321');
const out=resolve(e.QA_MARINE_PRIVATE_DIR),temp=resolve(e.RUNNER_TEMP),work=resolve(e.QA_WORK_DIR);
assert.ok(out.startsWith(temp+'/')&&!out.startsWith(work+'/')&&out!==work);
assert.ok(work.startsWith(temp+'/sesto-qa.'));
await mkdir(out,{recursive:true});
const fixtures=JSON.parse(await readFile(join(work,'fixtures.json'),'utf8'));
for(const key of ['person','edition','lesson','equipment'])assert.match(fixtures[key],/^[0-9a-f-]{36}$/i,key);
const routes=[
 ['staff','01-dashboard','/gestionale'],['staff','02-soci','/gestionale/soci'],
 ['staff','03-corsi','/gestionale/corsi'],['staff','04-calendario','/gestionale/calendario-visivo'],
 ['staff','05-incassi','/gestionale/incassi'],['staff','06-attrezzature','/gestionale/moduli/attrezzature'],
 ['staff','07-richieste','/gestionale/richieste'],['staff','08-utenti','/gestionale/utenti'],
 ['secretary','09-segreteria','/gestionale'],['member','10-area-personale','/area-personale'],
 ['member','11-area-soci','/area-soci'],['member','12-documenti','/documenti'],
 ['instructor','13-istruttore','/istruttore'],['board','14-organi-sociali','/organi-sociali'],
 ['staff','15-scheda-socio','/gestionale/soci/'+fixtures.person],
 ['staff','16-anagrafiche','/gestionale/moduli/anagrafiche'],
 ['staff','17-dettaglio-corso','/gestionale/corsi/'+fixtures.edition],
 ['staff','18-dettaglio-lezione','/gestionale/calendario-visivo/'+fixtures.lesson],
 ['staff','19-scheda-attrezzatura','/gestionale/attrezzature/'+fixtures.equipment],
 ['staff','20-revisioni','/gestionale/moduli/revisioni'],
 ['staff','21-consegne','/gestionale/moduli/consegne'],
 ['staff','22-eventi','/gestione-eventi'],
 ['staff','23-corsi-tabella','/gestionale/corsi?vista_corsi=tabella'],
 ['staff','24-archivio-incassi','/gestionale/archivio-incassi'],
 ['staff','25-contabilita','/gestionale/moduli/contabilita'],
 ['staff','26-economia','/gestionale/economia'],
 ['staff','27-incassi-corsi','/gestionale/incassi?tab=corso'],
 ['member','28-profilo','/area-personale/profilo'],
 ['member','29-corsi-personali','/area-personale/corsi'],
 ['member','30-quote-personali','/area-personale?tab=quote'],
 ['member','31-notifiche-personali','/area-personale?tab=notifiche'],
 ['member','32-notifiche-account','/notifiche'],
 ['member','33-certificato','/area-personale/certificato?persona='+fixtures.person],
 ['instructor','34-lezioni-istruttore','/istruttore?tab=lezioni&edizione='+fixtures.edition],
 ['instructor','35-presenze-istruttore','/istruttore?tab=presenze&edizione='+fixtures.edition+'&lezione='+fixtures.lesson],
 ['board','36-componenti-cda','/organi-sociali?tab=componenti'],
 ['board','37-archivio-cda','/organi-sociali/archivio'],
 ['board','38-riepilogo-cda','/organi-sociali/riepilogo'],
 ['staff','39-documenti-staff','/documenti'],
 ['member','40-documenti-soci','/area-soci?tab=documenti'],
];
const browser=await chromium.launch();
try{
 for(const [role,name,path] of routes){
  const ctx=await browser.newContext({baseURL:app.origin,storageState:join(work,role+'.json')});
  try{
   const page=await ctx.newPage();
   const response=await page.goto(path);
   assert.equal(response?.status(),200,name);assert.equal(new URL(page.url()).pathname,new URL(path,app.origin).pathname,name);
   await expect(page.locator('#sc-main.sc-marine-private')).toBeVisible();
   if(name==='23-corsi-tabella'){
    await expect(page.getByRole('link',{name:'Tabella',exact:true})).toHaveAttribute('aria-current','page');
    await expect(page.getByRole('table',{name:'Edizioni dei corsi'})).toBeVisible();
   }
   if(name==='31-notifiche-personali'||name==='32-notifiche-account'){
    await expect(page.getByText('Notifica visuale sintetica',{exact:true})).toBeVisible();
    await expect(page.locator('.sc-notification-list .timeline-item button').first()).toBeVisible();
   }
   for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:width>=1024?900:844});
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
    if(path==='/gestionale'){
     const heading=page.locator('.sc-dashboard-compact-heading');
     await expect(heading).toBeVisible();
     await expect(page.locator('.sc-route-content > .sc-page-header-marine')).toHaveCount(0);
     const box=await heading.boundingBox();
     assert.ok(box&&box.height<=88,name+' oversized dashboard heading '+width);
    }
    const compact=page.locator('.sc-route-content > .sc-page-header.sc-page-header-marine');
    if(await compact.count()){
     assert.equal(await compact.first().evaluate(el=>getComputedStyle(el).boxShadow),'none',name+' decorative header');
     assert.equal(await compact.first().evaluate(el=>getComputedStyle(el,'::before').content),'none',name+' decorative overlay');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),name+' overflow '+width);
    await expect(page.getByRole('button',{name:'Esci dal gestionale'})).toBeVisible();
    if(width<=1000){
     const brand=await page.locator('.sc-site-header .brand strong').evaluate(el=>{
      const r=document.createRange();r.selectNodeContents(el);
      return {lines:new Set([...r.getClientRects()].filter(x=>x.width&&x.height).map(x=>Math.round(x.top))).size,width:el.getBoundingClientRect().width};
     });
     assert.ok(brand.lines>0&&brand.lines<=2&&brand.width>=80,name+' header '+width+': '+JSON.stringify(brand));
    }
    const operational=await page.locator('.sc-calendar-filter,.payment-filters,.sc-operational-filters,.sc-instructor-filter').evaluateAll(forms=>forms.flatMap(form=>[...form.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,button[type=submit]')].filter(el=>el.getClientRects().length).map(el=>({tag:el.tagName,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))));
    for(const control of operational)assert.ok(control.width>=44&&control.height>=44,name+' undersized control '+width+' '+JSON.stringify(control));
    const metrics=await page.locator(':is(.sc-finance-kpis,.sc-equipment-kpis,.sc-loan-kpis,.sc-board-kpis,.sc-personal-metrics) .sc-metric-value').evaluateAll(items=>items.map(el=>({width:el.clientWidth,scroll:el.scrollWidth})));
    for(const m of metrics)assert.ok(m.scroll<=m.width+1,name+' clipped KPI '+width);
    const textSizes=await page.locator('.sc-marine-private .timeline-item p:not(.tiny)').evaluateAll(items=>items.filter(el=>el.getClientRects().length).map(el=>parseFloat(getComputedStyle(el).fontSize)));
    for(const size of textSizes)assert.ok(size>=14,name+' unreadable timeline text '+width+' '+size);
    const inlineEmphasis=await page.locator('.sc-marine-private .timeline-item p strong').evaluateAll(items=>items.filter(el=>el.getClientRects().length).map(el=>getComputedStyle(el).display));
    for(const display of inlineEmphasis)assert.equal(display,'inline',name+' broken inline emphasis');
    if(width===390||width===1440){await waitForBrandImages(page);await page.screenshot({path:join(out,name+'-'+width+'.png'),fullPage:true,animations:'disabled',caret:'hide'});}
   }
   console.log('OK visual '+name+' '+role+' (5 viewports)');
  }finally{await ctx.close();}
 }
 // Open the actual editors without submitting or modifying any records.
 const editors=[
  ['41-editor-anagrafica','/gestionale/moduli/anagrafiche','Aggiungi persona'],
  ['42-editor-attrezzatura','/gestionale/moduli/attrezzature','Aggiungi attrezzatura'],
  ['43-editor-lezione','/gestionale/calendario-visivo','Nuova lezione'],
  ['44-editor-cda','/organi-sociali?tab=componenti','Aggiungi componente'],
 ];
 for(const [name,path,label] of editors){
  const ctx=await browser.newContext({baseURL:app.origin,storageState:join(work,'staff.json')});
  try{
   const page=await ctx.newPage();
   for(const width of [320,390,768,1024,1440]){
    const height=width>=1024?900:844;
    await page.setViewportSize({width,height});
    const response=await page.goto(path);assert.equal(response?.status(),200,name);
    await page.getByRole('button',{name:label,exact:true}).or(page.getByRole('link',{name:label,exact:true})).first().click();
    const dialog=page.getByRole('dialog',{name:label,exact:true});
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('form').first()).toBeVisible();
    const bounds=await dialog.boundingBox();assert.ok(bounds,name+' missing bounds');
    assert.ok(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,name+' editor outside viewport '+width);
    if(width>=1024)assert.ok(bounds.width>=700&&bounds.width>bounds.height,name+' editor not landscape '+width);
    if(width<=600)assert.ok(bounds.width>=width-2,name+' mobile editor not full width '+width);
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),name+' editor horizontal overflow '+width);
    await expect(dialog.getByRole('button',{name:'Chiudi pannello'})).toBeVisible();
    const colors=await dialog.locator('.sc-editor-header').evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(colors,'rgb(244, 248, 250)',name+' portal styling inactive');
    if(width===390||width===1440)await page.screenshot({path:join(out,name+'-'+width+'.png'),animations:'disabled',caret:'hide'});
    await dialog.getByRole('button',{name:'Chiudi pannello'}).click();await expect(dialog).toHaveCount(0);
   }
   console.log('OK visual editor '+name+' (5 viewports, no submission)');
  }finally{await ctx.close();}
 }
 // Public/auth/applicant pages must not accidentally pick up the private presentation scope.
 const guest=await browser.newContext({baseURL:app.origin});
 try{const p=await guest.newPage();for(const path of ['/','/accedi','/registrati']){await p.goto(path);await expect(p.locator('#sc-main.sc-marine-private')).toHaveCount(0);}}finally{await guest.close();}
}finally{await browser.close();}
