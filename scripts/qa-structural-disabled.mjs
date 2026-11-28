// Read-only exercise of the same candidate build with optimizations disabled.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
const env=process.env;
assert.equal(env.QA_ISOLATED_ENV,'true');
assert.equal(env.SESTO_TEST_MODE,'true');
assert.equal(env.SESTO_EMAIL_MODE,'simulate');
const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.port==='54321');
const target=new URL(env.QA_STRUCTURAL_DISABLED_URL||'http://127.0.0.1:3316');
assert.ok(['127.0.0.1','localhost'].includes(target.hostname)&&['3314','3315','3316'].includes(target.port)&&target.protocol==='http:');
const browser=await chromium.launch();
const context=await browser.newContext({baseURL:target.origin,storageState:join(env.QA_WORK_DIR,'staff.json')});
try{
 const page=await context.newPage();
 for(const [path,heading] of [['/gestionale','Centro operativo'],['/gestionale/soci','Soci e allievi'],['/gestionale/corsi','Gestione corsi'],['/gestionale/calendario-visivo','Calendario piscine e corsie'],['/gestionale/incassi','Incassi e saldi']]){
  const response=await page.goto(path);
  assert.equal(response.status(),200);
  assert.equal(new URL(page.url()).pathname,path);
  await expect(page.getByRole('heading',{level:1,name:heading,exact:true})).toBeVisible();
 }
 const response=await context.request.get('/gestionale/incassi/person-options',{maxRedirects:0});
 assert.equal(response.status(),404);
 console.log('Structural activation OFF: five authenticated legacy routes and disabled search endpoint verified');
}finally{await context.close();await browser.close();}
