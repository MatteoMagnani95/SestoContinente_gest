// Local synthetic performance scenario, invoked after the functional UI tests.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {join} from 'node:path';
import {Client} from 'pg';
import {chromium,expect} from '@playwright/test';
export async function runPerformance({app,database,accounts,work}){
 assert.ok(['127.0.0.1','localhost'].includes(app.hostname)&&['127.0.0.1','localhost'].includes(database.hostname));
 assert.equal(process.env.QA_ISOLATED_ENV,'true');
 const db=new Client({connectionString:database.href});await db.connect();
 try{
  await db.query('begin');
  // No real names, fiscal codes, contact data or historical records.
  await db.query("insert into persone(nome,cognome) select 'Sintetico','Benchmark'||lpad(n::text,5,'0') from generate_series(1,2000) n");
  await db.query("insert into adesioni(persona_id,stagione_id,stato) select p.id,s.id,'attiva' from persone p cross join stagioni s where p.cognome like 'Benchmark%' and s.attiva");
  await db.query("insert into quote_associative(persona_id,stagione_id,importo_dovuto,scadenza) select p.id,s.id,10,current_date+7 from persone p cross join stagioni s where p.cognome like 'Benchmark%' and s.attiva");
  await db.query("insert into attrezzature(codice,categoria,prossima_revisione) select 'QA-BENCH-'||lpad(n::text,5,'0'),'Collaudo',current_date+7 from generate_series(1,500) n");
  await db.query("insert into notifiche(utente_id,tipo,riferimento,titolo,messaggio,creata_il) select $1,'benchmark',n::text,'Benchmark notifica '||n,'Sintetico',now()-n*interval '1 second' from generate_series(1,2000) n",[accounts.member.id]);
  await db.query('analyze');
  await db.query('commit');
 }finally{await db.end();}
 const browser=await chromium.launch();
 const contexts=[];
 try{
  const open=async role=>{const c=await browser.newContext({baseURL:app.href,storageState:join(work,role+'.json'),viewport:{width:1280,height:800}});contexts.push(c);return c.newPage();};
  const staff=await open('staff'),member=await open('member');
  const metrics=[];
  const measure=async(page,path,verify)=>{
   const start=performance.now(),response=await page.goto(path,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(response.status(),200,path);await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
   await verify();
   const elapsed=Math.round(performance.now()-start);
   assert.ok(elapsed<30000,path+' exceeded CI timeout');
   metrics.push({path,elapsedMs:elapsed});
  };
  const names=new Set();
  for(const p of [1,40,80]){
   await measure(staff,'/gestionale/soci?q=Benchmark&p='+p,async()=>{
    const table=staff.getByRole('table',{name:'Adesioni di soci e allievi'});
    const rows=table.locator('tbody tr');await expect(rows).toHaveCount(25);
    await expect(staff.getByRole('navigation',{name:'Paginazione'})).toContainText('2000 adesioni');
    for(const text of await rows.locator('td[data-label="Socio"]').allTextContents()){
     assert.ok(!names.has(text));names.add(text);
    }
   });
  }
  await measure(staff,'/gestionale/report',async()=>{
   await expect(staff.getByText('Alcune fonti non sono disponibili:',{exact:false})).toHaveCount(0);
   await expect(staff.getByRole('table',{name:'Attività e scadenze'})).toBeVisible();
  });
  await measure(staff,'/gestionale',async()=>{await expect(staff.getByRole('heading',{name:'Panoramica associativa'})).toBeVisible();});
  await measure(member,'/area-personale?tab=notifiche',async()=>{
   await expect(member.getByRole('navigation',{name:'Paginazione'})).toContainText('2000 notifiche');
   await expect(member.locator('#notifiche article').first()).toBeVisible();
  });
  console.log(JSON.stringify({scenario:'browser locale autenticato',persone:2000,quote:2000,attrezzature:500,notifiche:2000,metrics}));
  console.log('OK benchmark E2E: conteggi, pagine non sovrapposte, dashboard e report completi');
 }finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();}
}
