// Comparative browser benchmark; only synthetic local QA, no hosted endpoints.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {chromium,expect} from '@playwright/test';

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
const routes=[
 {role:'staff',path:'/gestionale'},
 {role:'staff',path:'/gestionale/soci?q=Benchmark&p=1',rows:25},
 {role:'staff',path:'/gestionale/soci?q=Benchmark&p=40',rows:25},
 {role:'staff',path:'/gestionale/corsi'},
 {role:'staff',path:'/gestionale/corsi/'+id(fixtures.edition)},
 {role:'staff',path:'/gestionale/calendario-visivo'},
 {role:'staff',path:'/gestionale/moduli/attrezzature',rows:30},
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
    const page=await ctx.newPage();
    const t=performance.now();
    const res=await page.goto(route.path,{waitUntil:'domcontentloaded',timeout:30000});
    assert.equal(res.status(),200);
    assert.equal(new URL(page.url()).pathname,new URL(route.path,origin).pathname);
    const heading=page.getByRole('heading',{level:1}).first();
    await expect(heading).toBeVisible();
    if(route.rows)await expect(page.locator('table').first().locator('tbody tr')).toHaveCount(route.rows);
    const readyMs=performance.now()-t;
    await page.waitForLoadState('load');
    const data=await page.evaluate(()=>{
     const nav=performance.getEntriesByType('navigation')[0];
     const js=performance.getEntriesByType('resource').filter(r=>r.name.includes('/_next/static/')&&new URL(r.name).pathname.endsWith('.js'));
     return {ttfbMs:nav.responseStart-nav.requestStart,jsEncodedBytes:js.reduce((n,r)=>n+r.encodedBodySize,0),jsRequests:js.length,htmlBytes:nav.encodedBodySize};
    });
    return {heading:await heading.textContent(),readyMs,...data};
   }finally{await ctx.close();}
  };
  // Warm each route once, then alternate measurement order to limit warm-cache bias.
  const warmA=await measure('baseline',baseline),warmB=await measure('candidate',candidate);
  assert.equal(warmA.heading,warmB.heading,route.path);
  for(let i=0;i<5;i++){
   for(const [key,origin] of i%2?[['candidate',candidate],['baseline',baseline]]:[['baseline',baseline],['candidate',candidate]]){
    const sample=await measure(key,origin);assert.equal(sample.heading,warmA.heading);samples[key].push(sample);
   }
  }
  const summary=items=>({readyMedianMs:median(items.map(x=>x.readyMs)),readyP95Ms:percentile(items.map(x=>x.readyMs),.95),ttfbMedianMs:median(items.map(x=>x.ttfbMs)),jsEncodedBytes:median(items.map(x=>x.jsEncodedBytes)),jsRequests:median(items.map(x=>x.jsRequests)),htmlBytes:median(items.map(x=>x.htmlBytes))});
  results.push({role:route.role,path:route.path.replace(/\/[0-9a-f-]{36}/gi,'/[fixture]'),baseline:summary(samples.baseline),candidate:summary(samples.candidate),samples:5});
  console.log(JSON.stringify(results.at(-1)));
 }
 // Measure generated static chunks separately from per-route transferred resources.
 const report={scenario:'isolated comparative browser benchmark',baselineSha:'ebe1085b6dfd7b1b5660c3326baf8d4475819c5f',candidateSha:env.GITHUB_SHA||'local',metrics:results,staticChunks:{baseline:await chunks(join(env.QA_BASELINE_DIR,'.next/static/chunks')),candidate:await chunks('.next/static/chunks')},limitations:'5 alternating cold browser contexts per route; server warmed once; p95 is maximum at this sample size; no field INP/LCP claim'};
 await writeFile(join(work,'performance-comparison.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser.close();}
