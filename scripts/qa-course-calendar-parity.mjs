// Read-only parity of optimized and legacy rendering on the same local build/database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
const env=process.env;
assert.equal(env.QA_ISOLATED_ENV,'true');
assert.equal(env.SESTO_TEST_MODE,'true');
assert.equal(env.SESTO_EMAIL_MODE,'simulate');
const local=(value,port)=>{
 const url=new URL(value);
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.protocol==='http:'&&url.port===port);
 return url.origin;
};
local(env.NEXT_PUBLIC_SUPABASE_URL,'54321');
const active=local(env.QA_BASE_URL,'3314'),disabled=local('http://127.0.0.1:3316','3316');
const fixtures=JSON.parse(await readFile(join(env.QA_WORK_DIR,'fixtures.json'),'utf8'));
for(const key of ['edition','secondEdition','pool','lesson'])assert.match(fixtures[key],/^[a-f0-9-]{36}$/i);
assert.match(fixtures.lessonDay,/^\d{4}-\d{2}-\d{2}$/);
const routes=[
 {path:'/gestionale/corsi',kind:'course',expectLesson:false,expectEdition:true},
 {path:'/gestionale/corsi?vista_corsi=tabella',kind:'course',expectEdition:true},
 {path:'/gestionale/corsi?q=Edizione&disciplina=APNEA&ordine=nome_desc&vista_corsi=tabella',kind:'course',expectEdition:true},
 {path:'/gestionale/corsi?disciplina=ARA&livello=5',kind:'course'},
 {path:'/gestionale/corsi?p=999&vista_corsi=tabella',kind:'course'},
 ...['giorno','settimana','mese','agenda'].map(vista=>({path:'/gestionale/calendario-visivo?'+new URLSearchParams({giorno:fixtures.lessonDay,vista,piscina:fixtures.pool,edizione:fixtures.secondEdition,annullate:'1'}),kind:'calendar',expectBooking:true,expectLesson:false})),
 {path:'/gestionale/calendario-visivo?'+new URLSearchParams({giorno:fixtures.lessonDay,vista:'giorno',piscina:fixtures.pool,edizione:fixtures.edition}),kind:'calendar',expectBooking:true,expectLesson:true}
];
const browser=await chromium.launch();
const contexts=[];
try{
 for(const role of ['staff','secretary']){
  for(const origin of [active,disabled])contexts.push(await browser.newContext({baseURL:origin,storageState:join(env.QA_WORK_DIR,role+'.json'),viewport:{width:1280,height:800}}));
  const [optimized,legacy]=contexts.slice(-2);
  const a=await optimized.newPage(),b=await legacy.newPage();
  async function snapshot(page,route){
   const response=await page.goto(route.path,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200);
   assert.equal(new URL(page.url()).pathname,route.path.split('?')[0]);
   const root=page.locator('#sc-main .sc-route-content');
   await expect(root.getByRole('heading',{level:1})).toBeVisible();
   if(route.kind==='course'&&route.expectEdition)await expect(root.locator('a[href="/gestionale/corsi/'+fixtures.edition+'"]').first()).toBeVisible();
   if(route.kind==='calendar'){
    const matrix=root.getByRole('table',{name:'Occupazione corsie per giorno'});
    if(route.expectBooking)await expect(matrix.getByRole('link',{name:/Prenotata.*Lezione sintetica/})).toBeVisible();
    const events=root.locator('.sc-calendar-event').filter({hasText:'Lezione sintetica'});
    await expect(events).toHaveCount(route.expectLesson?1:0);
   }
   return root.evaluate(el=>{
    const clean=s=>s.replace(/\s+/g,' ').trim();
    return {
     text:clean(el.innerText),
     links:Array.from(el.querySelectorAll('a[href]'),a=>({text:clean(a.textContent??''),href:a.getAttribute('href')})),
     selects:Array.from(el.querySelectorAll('select'),s=>({name:s.name,value:s.value,options:Array.from(s.options,o=>({label:o.label,value:o.value}))})),
     progress:Array.from(el.querySelectorAll('progress'),p=>({value:p.value,max:p.max}))
    };
   });
  }
  for(const route of routes){
   const [actual,expected]=await Promise.all([snapshot(a,route),snapshot(b,route)]);
   for(const key of ['text','links','selects','progress'])assert.deepEqual(actual[key],expected[key],role+' '+route.kind+' '+key+' parity');
  }
  await a.close();await b.close();
 }
 console.log('Course/calendar browser parity: '+routes.length+' scenarios x 2 staff roles, same build optimized versus legacy');
}finally{for(const context of contexts)await context.close();await browser.close();}
