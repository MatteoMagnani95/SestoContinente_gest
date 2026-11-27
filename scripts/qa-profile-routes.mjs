import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
const env=process.env;
assert.equal(env.QA_ISOLATED_ENV,'true');
assert.equal(env.SESTO_TEST_MODE,'true');
assert.equal(env.SESTO_EMAIL_MODE,'simulate');
const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL);assert.ok(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)&&url.port==='54321');
const work=env.QA_WORK_DIR;
const routes=[
 {path:'/gestionale',role:'staff',heading:'Centro operativo'},
 {path:'/gestionale/soci',role:'staff',heading:'Soci e allievi'},
 {path:'/gestionale/corsi',role:'staff',heading:'Gestione corsi'},
 {path:'/gestionale/calendario-visivo',role:'staff',heading:'Calendario piscine e corsie'},
 {path:'/gestionale/incassi',role:'staff',heading:'Incassi e saldi'},
 {path:'/istruttore',role:'instructor',heading:'I miei corsi'}
];
const read=async file=>{try{return (await readFile(file,'utf8')).trim().split('\n').filter(Boolean).map(s=>JSON.parse(s));}catch(e){if(e.code==='ENOENT')return [];throw e;}};
const browser=await chromium.launch();
const report=[];
try{
 for(const [version,port] of [['baseline',3317],['candidate',3318]]){
  const file=join(work,'fetch-profile-'+version+'.ndjson');
  for(const route of routes){
   const ctx=await browser.newContext({baseURL:'http://127.0.0.1:'+port,storageState:join(work,route.role+'.json'),viewport:{width:1280,height:800}});
   try{
    const before=(await read(file)).length;
    const page=await ctx.newPage();
    await page.route('**/*',r=>{const h=r.request().headers();if(h['next-router-prefetch']||h.purpose==='prefetch'||h['sec-purpose']?.includes('prefetch'))return r.abort();return r.continue();});
    const response=await page.goto(route.path,{waitUntil:'load'});
    assert.equal(response.status(),200);
    await expect(page.getByRole('heading',{level:1,name:route.heading,exact:true})).toBeVisible();
    await ctx.close();
    const rows=(await read(file)).slice(before);
    assert.ok(rows.length>0,version+' '+route.path+' profile missing');
    const groups={};
    for(const row of rows){
     assert.match(row.category,/^(auth|rpc|rest)$/);assert.match(row.endpoint,/^[a-zA-Z_]+$/);
     assert.ok(Number.isFinite(row.ms)&&row.ms>=0);
     const key=row.category+'/'+row.endpoint;
     const group=groups[key]??={calls:0,sumMs:0,maxMs:0,errors:0};
     group.calls++;group.sumMs+=row.ms;group.maxMs=Math.max(group.maxMs,row.ms);if(row.status<200||row.status>=400)group.errors++;
    }
    report.push({version,path:route.path,calls:rows.length,endpoints:groups});
   }finally{await ctx.close();}
  }
 }
 await writeFile(join(work,'fetch-profile-summary.json'),JSON.stringify({limitations:'separate diagnostic servers; one direct visit per route; prefetch blocked; summed request durations may overlap, not critical path or browser latency',report},null,2));
 console.log(JSON.stringify({scenario:'isolated fetch profile',report}));
}finally{await browser.close();}
