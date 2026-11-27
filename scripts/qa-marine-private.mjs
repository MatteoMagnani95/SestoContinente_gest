// Actual UI screenshots, isolated synthetic accounts only. No storage state or tokens exported.
import assert from 'node:assert/strict';
import {resolve,join} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
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
const routes=[
 ['staff','01-dashboard','/gestionale'],['staff','02-soci','/gestionale/soci'],
 ['staff','03-corsi','/gestionale/corsi'],['staff','04-calendario','/gestionale/calendario-visivo'],
 ['staff','05-incassi','/gestionale/incassi'],['staff','06-attrezzature','/gestionale/moduli/attrezzature'],
 ['staff','07-richieste','/gestionale/richieste'],['staff','08-utenti','/gestionale/utenti'],
 ['secretary','09-segreteria','/gestionale'],['member','10-area-personale','/area-personale'],
 ['member','11-area-soci','/area-soci'],['member','12-documenti','/documenti'],
 ['instructor','13-istruttore','/istruttore'],['board','14-organi-sociali','/organi-sociali'],
];
const browser=await chromium.launch();
try{
 for(const [role,name,path] of routes){
  const ctx=await browser.newContext({baseURL:app.origin,storageState:join(work,role+'.json')});
  try{
   const page=await ctx.newPage();
   const response=await page.goto(path);
   assert.equal(response?.status(),200,name);assert.equal(new URL(page.url()).pathname,path,name);
   await expect(page.locator('#sc-main.sc-marine-private')).toBeVisible();
   for(const width of [320,390,768,1024,1440]){
    await page.setViewportSize({width,height:width>=1024?900:844});
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),name+' overflow '+width);
    await expect(page.getByRole('button',{name:'Esci dal gestionale'})).toBeVisible();
    if(width<=1000){
     const brand=await page.locator('.sc-site-header .brand strong').evaluate(el=>{
      const r=document.createRange();r.selectNodeContents(el);
      return {lines:new Set([...r.getClientRects()].filter(x=>x.width&&x.height).map(x=>Math.round(x.top))).size,width:el.getBoundingClientRect().width};
     });
     assert.ok(brand.lines>0&&brand.lines<=2&&brand.width>=80,name+' header '+width+': '+JSON.stringify(brand));
    }
    if(width===390||width===1440)await page.screenshot({path:join(out,name+'-'+width+'.png'),fullPage:true,animations:'disabled',caret:'hide'});
   }
   console.log('OK visual '+name+' '+role+' (5 viewports)');
  }finally{await ctx.close();}
 }
 // Public/auth/applicant pages must not accidentally pick up the private presentation scope.
 const guest=await browser.newContext({baseURL:app.origin});
 try{const p=await guest.newPage();for(const path of ['/','/accedi','/registrati']){await p.goto(path);await expect(p.locator('#sc-main.sc-marine-private')).toHaveCount(0);}}finally{await guest.close();}
}finally{await browser.close();}
