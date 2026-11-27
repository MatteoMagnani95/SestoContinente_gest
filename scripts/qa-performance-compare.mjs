// Comparative browser benchmark; only synthetic local QA, no hosted endpoints.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {chromium,expect} from '@playwright/test';
import {summarizeNavigation} from './qa-navigation-summary.mjs';

const env=process.env;
assert.equal(env.QA_ISOLATED_ENV,'true');
assert.equal(env.SESTO_TEST_MODE,'true');
assert.equal(env.SESTO_EMAIL_MODE,'simulate');
const local=(value,port)=>{
 const url=new URL(value);
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.port===port);
 return url.origin;
};
local(env.NEXT_PUBLIC_SUPABASE_URL,'54321');
const baseline=local(env.QA_BASELINE_URL,'3315');
const candidate=local(env.QA_BASE_URL,'3314');
const work=resolve(env.QA_WORK_DIR);
assert.ok(work!==resolve('.')&&!work.startsWith(resolve('.')+'/'));
const fixtures=JSON.parse(await readFile(join(work,'fixtures.json'),'utf8'));
const id=value=>{assert.match(value,/^[0-9a-f-]{36}$/i);return value;};
const sampleCount=9;
const routes=[
 {role:'staff',path:'/gestionale'},
 {role:'staff',path:'/gestionale/soci?q=Benchmark&p=1',rows:25},
 {role:'staff',path:'/gestionale/soci?q=Benchmark&p=40',rows:25},
 {role:'staff',path:'/gestionale/corsi'},
 {role:'staff',path:'/gestionale/corsi/'+id(fixtures.edition)},
 {role:'staff',path:'/gestionale/calendario-visivo'},
 {role:'staff',path:'/gestionale/moduli/attrezzature',rows:30},
 {role:'staff',path:'/gestionale/moduli/tesseramenti'},
 {role:'staff',path:'/gestionale/incassi'},
 {role:'staff',path:'/gestionale/utenti'},
 {role:'member',path:'/area-personale?tab=notifiche'},
 {role:'instructor',path:'/istruttore'}
];
const median=values=>{const s=[...values].sort((a,b)=>a-b);return Math.round(s[Math.floor(s.length/2)]*100)/100;};
const percentile=(values,p)=>{const s=[...values].sort((a,b)=>a-b);return Math.round(s[Math.ceil(p*s.length)-1]*100)/100;};
async function chunks(dir){
 let bytes=0,gzip=0,count=0;
 async function visit(path){
  for(const entry of await readdir(path,{withFileTypes:true})){
   const full=join(path,entry.name);
   if(entry.isDirectory())await visit(full);
   else if(entry.name.endsWith('.js')){const b=await readFile(full);count++;bytes+=b.length;gzip+=gzipSync(b).length;}
  }
 }
 await visit(dir);return {count,bytes,gzipBytes:gzip};
}
const browser=await chromium.launch();
const contexts=[];
try{
 const results=[];
 for(const route of routes){
  const samples={baseline:[],candidate:[]};
  const measure=async(version,origin)=>{
   const ctx=await browser.newContext({baseURL:origin,storageState:join(work,route.role+'.json'),viewport:{width:1280,height:800}});
   try{
    // Observe the actual visible content in the browser, independently of
    // Playwright's polling cadence and of an early streamed response.
    await ctx.addInitScript(({rows})=>{
     window.__qaContentReady=new Promise(resolve=>{
      let observer,done=false,frame=0;
      const visible=element=>Boolean(element&&element.getClientRects().length&&getComputedStyle(element).visibility==='visible');
      const check=()=>{
       frame=0;if(done)return;
       const root=document.querySelector('#sc-main .sc-route-content');
       const heading=root?.querySelector('h1');
       if(!visible(heading))return;
       if(rows&&(!visible(root.querySelector('table'))||root.querySelectorAll('table tbody tr').length<rows))return;
       done=true;observer.disconnect();resolve(performance.now());
      };
      const schedule=()=>{if(!done&&!frame)frame=requestAnimationFrame(check);};
      observer=new MutationObserver(schedule);
      observer.observe(document,{subtree:true,childList:true,attributes:true,characterData:true});
      schedule();
     });
    },{rows:route.rows||0});
    const page=await ctx.newPage();
    const t=performance.now();
    const res=await page.goto(route.path,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(res.status(),200);
    assert.equal(new URL(page.url()).pathname,new URL(route.path,origin).pathname);
    const heading=page.getByRole('heading',{level:1}).first();
    await expect(heading).toBeVisible();
    if(route.rows)await expect(page.locator('table').first().locator('tbody tr')).toHaveCount(route.rows);
    const readyMs=performance.now()-t;
    const contentReadyMs=await page.evaluate(()=>Promise.race([window.__qaContentReady,new Promise((_,reject)=>setTimeout(()=>reject(Error('Visible route content not observed')),10000))]));
    await page.waitForLoadState('load');
    const data=await page.evaluate(()=>{
     const nav=performance.getEntriesByType('navigation')[0];
     const js=performance.getEntriesByType('resource').filter(r=>r.name.includes('/_next/static/')&&new URL(r.name).pathname.endsWith('.js'));
     return {ttfbMs:nav.responseStart-nav.requestStart,jsEncodedBytes:js.reduce((n,r)=>n+r.encodedBodySize,0),jsRequests:js.length,htmlBytes:nav.encodedBodySize};
    });
    return {heading:await heading.textContent(),readyMs,contentReadyMs,...data};
   }finally{await ctx.close();}
  };
  // Warm each route once, then alternate measurement order to limit warm-cache bias.
  const warmA=await measure('baseline',baseline),warmB=await measure('candidate',candidate);
  assert.equal(warmA.heading,warmB.heading,route.path);
  for(let i=0;i<sampleCount;i++){
   for(const [key,origin] of i%2?[['candidate',candidate],['baseline',baseline]]:[['baseline',baseline],['candidate',candidate]]){
    const sample=await measure(key,origin);assert.equal(sample.heading,warmA.heading);samples[key].push(sample);
   }
  }
  const summary=items=>({readyMedianMs:median(items.map(x=>x.readyMs)),readyP95Ms:percentile(items.map(x=>x.readyMs),.95),contentReadyMedianMs:median(items.map(x=>x.contentReadyMs)),contentReadyMaxMs:Math.round(Math.max(...items.map(x=>x.contentReadyMs))*100)/100,ttfbMedianMs:median(items.map(x=>x.ttfbMs)),jsEncodedBytes:median(items.map(x=>x.jsEncodedBytes)),jsRequests:median(items.map(x=>x.jsRequests)),htmlBytes:median(items.map(x=>x.htmlBytes))});
  results.push({role:route.role,path:route.path.replace(/\/[0-9a-f-]{36}/gi,'/[fixture]'),baseline:summary(samples.baseline),candidate:summary(samples.candidate),samples:sampleCount});
  console.log(JSON.stringify(results.at(-1)));
 }
 // Real sidebar navigation: each route and each repeat starts with a fresh context.
 const transitions=[
  {from:'/gestionale',to:'/gestionale/soci',group:'Soci e segreteria',link:'Schede soci',heading:'Soci e allievi',table:'Adesioni di soci e allievi'},
  {from:'/gestionale/soci',to:'/gestionale/corsi',group:'Corsi e didattica',link:'Gestione corsi',heading:'Gestione corsi'},
  {from:'/gestionale/corsi',to:'/gestionale/calendario-visivo',group:'Calendario e piscine',link:'Calendario visivo',heading:'Calendario piscine e corsie'},
  {from:'/gestionale/calendario-visivo',to:'/gestionale/incassi',group:'Pagamenti e contabilità',link:'Incassi e saldi',heading:'Incassi e saldi'},
  {from:'/gestionale/incassi',to:'/gestionale',link:'Panoramica',heading:'Centro operativo'}
 ];
 const navigationScenarios=[];
 for(const route of transitions){
  const navigation={baseline:[],candidate:[]};
  for(let i=0;i<sampleCount;i++){
   for(const [key,origin] of i%2?[['candidate',candidate],['baseline',baseline]]:[['baseline',baseline],['candidate',candidate]]){
    const ctx=await browser.newContext({baseURL:origin,storageState:join(work,'staff.json'),viewport:{width:1280,height:800}});
    try{
     const page=await ctx.newPage();
     await page.goto(route.from);
     await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
     const sidebar=page.locator('.sc-staff-sidebar');
     if(route.group){
      const group=sidebar.getByRole('button',{name:route.group,exact:true});
      if(await group.getAttribute('aria-expanded')!=='true')await group.click();
     }
     const link=sidebar.getByRole('link',{name:route.link,exact:true});
     await expect(link).toBeVisible();
     await page.evaluate(({to,heading,table})=>{
      window.__qaClientReady=new Promise(resolve=>{
       let started=null,frame=0;
       const observer=new MutationObserver(schedule);
       function check(){
        frame=0;
        const root=document.querySelector('#sc-main .sc-route-content');
        const h=root?.querySelector('h1');
        const grid=table?Array.from(root?.querySelectorAll('table')??[]).find(t=>t.getAttribute('aria-label')===table):null;
        if(started!==null&&location.pathname===to&&h?.textContent?.trim()===heading&&h.getClientRects().length&&(!table||grid?.getClientRects().length)){
         observer.disconnect();resolve(performance.now()-started);
        }else if(started!==null)schedule();
       }
       function schedule(){if(!frame)frame=requestAnimationFrame(check);}
       document.addEventListener('click',event=>{
        if(event.target instanceof Element&&event.target.closest('a')?.getAttribute('href')===to){
         started=performance.now();observer.observe(document,{childList:true,subtree:true,attributes:true});schedule();
        }
       },{capture:true,once:true});
      });
     },route);
     const start=performance.now();
     await link.click();
     await expect(page).toHaveURL(url=>url.pathname===route.to);
     await expect(page.getByRole('heading',{level:1,name:route.heading,exact:true})).toBeVisible();
     if(route.table)await expect(page.getByRole('table',{name:route.table})).toBeVisible();
     navigation[key].push({verifiedMs:performance.now()-start,contentReadyMs:await page.evaluate(()=>Promise.race([window.__qaClientReady,new Promise((_,reject)=>setTimeout(()=>reject(Error('Client navigation content not observed')),10000))]))});
    }finally{await ctx.close();}
   }
  }
  const metrics=Object.fromEntries(Object.entries(navigation).map(([key,times])=>[key,{medianMs:median(times.map(t=>t.verifiedMs)),p95Ms:percentile(times.map(t=>t.verifiedMs),.95),contentReadyMedianMs:median(times.map(t=>t.contentReadyMs)),contentReadyMaxMs:Math.round(Math.max(...times.map(t=>t.contentReadyMs))*100)/100,samples:times.length}]));
  navigationScenarios.push({from:route.from,to:route.to,...metrics});
  console.log(JSON.stringify({scenario:'client sidebar navigation',...navigationScenarios.at(-1)}));
 }
 const navigationComparison=navigationScenarios[0];
 const navigationSummary=summarizeNavigation(navigationScenarios);
 console.log(JSON.stringify({scenario:'navigation target summary',...navigationSummary}));
 // Measure generated static chunks separately from per-route transferred resources.
 const report={simulatedRttMs:Number(env.QA_DB_LATENCY_MS||0),scenario:'isolated comparative browser benchmark',baselineSha:'ebe1085b6dfd7b1b5660c3326baf8d4475819c5f',candidateSha:env.GITHUB_SHA||'local',metrics:results,navigation:navigationComparison,navigationScenarios,navigationSummary,staticChunks:{baseline:await chunks(join(env.QA_BASELINE_DIR,'.next/static/chunks')),candidate:await chunks('.next/static/chunks')},limitations:'9 alternating cold browser contexts per route; server warmed once; p95 is maximum at this sample size; content-ready measured in-browser at first animation frame with required visible DOM; not LCP/INP'};
 await writeFile(join(work,'performance-comparison.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
