// Extra actual browser mutations on an independent isolated dataset.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
const e=process.env,work=resolve(e.QA_WORK_DIR||'.'),root=resolve('.');
const api=new URL(e.NEXT_PUBLIC_SUPABASE_URL||'http://invalid'),app=new URL(e.QA_BASE_URL||'http://invalid');
const local=u=>['localhost','127.0.0.1'].includes(u.hostname);
assert.ok(e.QA_ISOLATED_ENV==='true'&&e.SESTO_TEST_MODE==='true'&&e.SESTO_EMAIL_MODE==='simulate');
assert.equal(e.SC_STRUCTURAL_RPC,'false');assert.equal(e.SC_STRUCTURAL_RPC_RELEASE,'false');
assert.ok(local(api)&&api.port==='54321'&&local(app)&&app.port==='3314');
assert.ok(e.QA_WORK_DIR&&work!==root&&!work.startsWith(root+'/'));
const a=JSON.parse(await readFile(join(work,'accounts.json'),'utf8'));
for(const x of Object.values(a))assert.match(x.email,/@example\.invalid$/);
const admin=createClient(api.href,e.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const one=async(table,columns,filters)=>{let q=admin.from(table).select(columns);for(const [k,v] of Object.entries(filters))q=q.eq(k,v);const r=await q.single();assert.ok(!r.error,table+' '+r.error?.code);return r.data;};
const browser=await chromium.launch();const contexts=[];
const open=async role=>{const c=await browser.newContext({baseURL:app.href,viewport:{width:390,height:844}});contexts.push(c);const page=await c.newPage();await page.goto('/accedi');await page.locator('input[name=email]').first().fill(a[role].email);await page.locator('input[name=password]').fill(a[role].password);await page.getByRole('button',{name:'Accedi',exact:true}).click();await page.waitForURL(u=>!['/accedi','/smista','/'].includes(u.pathname),{timeout:30000});return page;};
try{
 const staff=await open('staff'),member=await open('member'),guardian=await open('guardian');
 const title='Evento audit '+randomUUID(),day=new Date(Date.now()+14*86400000).toISOString().slice(0,10);
 await staff.goto('/gestione-eventi');
 await staff.getByRole('button',{name:'Nuovo evento',exact:true}).click();
 const form=staff.getByRole('dialog',{name:'Nuovo evento'});
 for(const [name,value] of Object.entries({titolo:title,destinazione:'Piscina sintetica',dal:day,al:day,costo:'0',posti:'4'}))await form.locator('input[name='+name+']').fill(value);
 await form.locator('textarea[name=descrizione]').fill('Evento sintetico isolato');
 await form.getByRole('button',{name:'Crea evento',exact:true}).click();
 await expect(form).toBeHidden();
 const event=await one('eventi_soci','id,stato,posti',{titolo:title});assert.equal(event.stato,'aperto');assert.equal(event.posti,4);
 const detail='/gestione-eventi/'+event.id+'?tab=informazioni';
 await staff.goto(detail);await expect(staff.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await staff.getByRole('button',{name:'Modifica evento'}).click();
 const edit=staff.getByRole('dialog',{name:'Modifica '+title});await edit.locator('input[name=posti]').fill('5');
 await edit.getByRole('button',{name:'Salva modifiche'}).click();await expect(edit).toBeHidden();
 assert.equal((await one('eventi_soci','posti',{id:event.id})).posti,5);
 // Direct scoped event page and explicit confirmation of cancellation.
 await staff.goto(detail);await staff.getByRole('button',{name:'Modifica evento'}).click();
 await edit.locator('select[name=stato]').selectOption('annullato');await edit.locator('input[name=conferma]').check();
 await edit.getByRole('button',{name:'Salva modifiche'}).click();await expect(edit).toBeHidden();
 assert.equal((await one('eventi_soci','stato',{id:event.id})).stato,'annullato');
 await staff.reload();await expect(staff.getByRole('button',{name:'Modifica evento'})).toHaveCount(0);
 console.log('OK UI event creation, edit, cancellation, persistence');
 // Actual administrative role grant and revocation, with same guardian session.
 await staff.goto('/gestionale/utenti/'+a.guardian.id);
 await staff.getByRole('button',{name:'Assegna ruolo'}).click();const grant=staff.getByRole('dialog',{name:'Assegna ruolo'});
 await grant.locator('select[name=ruolo]').selectOption('segreteria');await grant.locator('input[name=conferma]').check();
 await grant.getByRole('button',{name:'Assegna',exact:true}).click();
 await expect(staff).toHaveURL(/msg=ok/);
 assert.equal((await one('ruoli_utente','ruolo',{utente_id:a.guardian.id,ruolo:'segreteria'})).ruolo,'segreteria');
 await guardian.goto('/gestionale');await expect(guardian).toHaveURL(u=>u.pathname==='/gestionale');
 const roleRow=staff.locator('.info-row').filter({has:staff.getByText('Segreteria',{exact:true})});
 await roleRow.getByRole('button',{name:'Revoca ruolo'}).click();
 const revoke=staff.getByRole('dialog',{name:'Revoca ruolo'});await revoke.locator('input[name=conferma]').check();
 await revoke.getByRole('button',{name:'Rimuovi',exact:true}).click();await expect(staff).toHaveURL(/msg=rimosso/);
 const removed=await admin.from('ruoli_utente').select('ruolo').eq('utente_id',a.guardian.id).eq('ruolo','segreteria');assert.ok(!removed.error);assert.equal(removed.data.length,0);
 assert.equal((await one('ruoli_utente','ruolo',{utente_id:a.guardian.id,ruolo:'tutore'})).ruolo,'tutore');
 await guardian.goto('/gestionale');await expect(guardian).toHaveURL(u=>u.pathname!=='/gestionale'&&u.searchParams.get('msg')==='permessi');
 await guardian.goto('/area-personale');await expect(guardian).toHaveURL(u=>u.pathname==='/area-personale');
 console.log('OK UI actual role grant and revocation, remaining guardian access preserved');
 // Board nomination via real UI, check exact four-year term.
 await staff.goto('/organi-sociali?tab=componenti');
 await staff.getByRole('button',{name:'Aggiungi componente'}).click();
 const board=staff.getByRole('dialog',{name:'Aggiungi componente'});
 await board.locator('select[name=persona_id]').selectOption(a.member.person);
 await board.locator('select[name=carica]').selectOption('Tesoriere');
 const start=new Date().toISOString().slice(0,10);await board.locator('input[name=dal]').fill(start);
 await board.getByRole('button',{name:'Registra componente'}).click();await expect(staff).toHaveURL(/msg=componente_ok/);
 const row=await one('cda_componenti','carica,dal,al',{persona_id:a.member.person,carica:'Tesoriere',dal:start});
 const end=new Date(start+'T12:00:00Z');const month=end.getUTCMonth();end.setUTCFullYear(end.getUTCFullYear()+4);if(end.getUTCMonth()!==month)end.setUTCDate(0);assert.equal(row.al,end.toISOString().slice(0,10));
 await staff.reload();await expect(staff.getByText('Tesoriere',{exact:true}).first()).toBeVisible();
 await member.goto('/organi-sociali');await expect(member).toHaveURL(u=>u.pathname!=='/organi-sociali'&&u.searchParams.get('msg')==='permessi');
 console.log('OK UI board appointment, four-year term, no automatic application role escalation');

 // Create an independent pool and lane through the actual staff UI.
 const poolName='Piscina audit '+randomUUID();
 await staff.goto('/gestionale/moduli/piscine?nuovo=1');
 const poolForm=staff.getByRole('dialog',{name:'Aggiungi piscina'});
 await poolForm.locator('input[name=nome]').fill(poolName);
 await poolForm.locator('input[name=indirizzo]').fill('Indirizzo sintetico');
 await poolForm.getByRole('button',{name:'Aggiungi piscina',exact:true}).click();
 await expect(staff).toHaveURL(/msg=salvato/);
 const pool=await one('piscine','id,indirizzo',{nome:poolName});assert.equal(pool.indirizzo,'Indirizzo sintetico');
 await staff.goto('/gestionale/moduli/piscine?edit='+pool.id);
 const poolEdit=staff.getByRole('dialog',{name:'Modifica '+poolName});
 await poolEdit.locator('textarea[name=limitazioni]').fill('Limitazione sintetica');
 await poolEdit.getByRole('button',{name:'Salva modifiche'}).click();await expect(staff).toHaveURL(/msg=salvato/);
 assert.equal((await one('piscine','limitazioni',{id:pool.id})).limitazioni,'Limitazione sintetica');
 const newLane='/gestionale/moduli/corsie?piscina='+pool.id+'&nuovo=1';
 const laneForm=staff.getByRole('dialog',{name:'Aggiungi corsia'});
 async function fillLane(){
  await staff.goto(newLane);
  await laneForm.locator('select[name=piscina_id]').selectOption(pool.id);
  await laneForm.locator('input[name=numero]').fill('7');
  await laneForm.getByRole('button',{name:'Salva corsia',exact:true}).click();
 }
 await fillLane();await expect(staff).toHaveURL(/msg=salvato/);
 const lane=await one('corsie','id,numero',{piscina_id:pool.id,numero:7});assert.equal(lane.numero,7);
 await fillLane();await expect(laneForm.getByRole('alert')).toContainText('duplicati');
 assert.equal((await one('corsie','id',{piscina_id:pool.id,numero:7})).id,lane.id);
 console.log('OK UI pool create and update, lane create and duplicate rejected');
 // Existing course identity, including whitespace/case normalization, must not
 // be recreated through the guided form. Check the original ID, not only UI.
 const fixtures=JSON.parse(await readFile(join(work,'fixtures.json'),'utf8'));
 const original=await one('edizioni_corsi','id,corso_id,stagione_id,nome,inizio,fine,direttore_id',{id:fixtures.edition});
 await staff.goto('/gestionale/corsi/nuovo');
 const courseForm=staff.locator('form').filter({has:staff.getByRole('button',{name:'Crea edizione',exact:true})});
 for(const name of ['corso_id','stagione_id','direttore_id'])await courseForm.locator('select[name='+name+']').selectOption(original[name]);
 await courseForm.locator('input[name=nome]').fill('  '+original.nome.toUpperCase()+'  ');
 for(const name of ['inizio','fine'])await courseForm.locator('input[name='+name+']').fill(original[name]);
 await courseForm.locator('input[name=costo_corso]').fill('0');
 await courseForm.getByRole('button',{name:'Crea edizione',exact:true}).click();
 const duplicate=courseForm.getByRole('alert');await expect(duplicate).toContainText('Questo corso esiste già');
 await expect(duplicate.getByRole('link',{name:'Apri quello esistente'})).toHaveAttribute('href','/gestionale/corsi/'+original.id);
 const editions=await admin.from('edizioni_corsi').select('id,nome').eq('corso_id',original.corso_id).eq('stagione_id',original.stagione_id).eq('inizio',original.inizio).eq('fine',original.fine);
 assert.ok(!editions.error);assert.deepEqual(editions.data.filter(x=>x.nome.trim().toLowerCase()===original.nome.trim().toLowerCase()).map(x=>x.id),[original.id]);
 console.log('OK UI guided course duplicate blocked and original linked');

 // Delete with dependent rows: the first deletion must fail without data loss.
 await staff.goto('/gestionale/moduli/piscine?edit='+pool.id);
 const protectedEditor=staff.getByRole('dialog',{name:'Modifica '+poolName});
 await protectedEditor.getByRole('button',{name:'Elimina piscina',exact:true}).click();
 const protectedConfirm=staff.getByRole('dialog',{name:'Elimina piscina · '+poolName});
 await protectedConfirm.locator('input[name=conferma]').check();
 await protectedConfirm.getByRole('button',{name:'Elimina piscina',exact:true}).click();
 await expect(staff).toHaveURL(/msg=elimina_collegati/);
 assert.equal((await one('piscine','id',{id:pool.id})).id,pool.id);
 assert.equal((await one('corsie','id',{id:lane.id})).id,lane.id);
 await staff.goto('/gestionale/moduli/corsie?edit='+lane.id);
 const laneEdit=staff.getByRole('dialog',{name:/Modifica corsia/});
 await laneEdit.getByRole('button',{name:'Elimina corsia',exact:true}).click();
 const laneConfirm=staff.getByRole('dialog',{name:/Elimina corsia/});
 await laneConfirm.locator('input[name=conferma]').check();
 await laneConfirm.getByRole('button',{name:'Elimina corsia',exact:true}).click();
 await expect(staff).toHaveURL(/msg=eliminato/);
 const laneGone=await admin.from('corsie').select('id').eq('id',lane.id);assert.ok(!laneGone.error);assert.deepEqual(laneGone.data,[]);
 await staff.goto('/gestionale/moduli/piscine?edit='+pool.id);
 await protectedEditor.getByRole('button',{name:'Elimina piscina',exact:true}).click();
 await protectedConfirm.locator('input[name=conferma]').check();
 await protectedConfirm.getByRole('button',{name:'Elimina piscina',exact:true}).click();
 await expect(staff).toHaveURL(/msg=eliminato/);
 const poolGone=await admin.from('piscine').select('id').eq('id',pool.id);assert.ok(!poolGone.error);assert.deepEqual(poolGone.data,[]);
 console.log('OK UI protected deletion, dependent row preserved, lane then pool removed');
 // Two independent authenticated browser contexts submit the same new identity
 // without waiting for the first response. The database is the final arbiter.
 const secondStaff=await open('staff');
 const raceName='Corso race '+randomUUID();
 const prepare=async(page,name)=>{
  await page.goto('/gestionale/corsi/nuovo');
  const f=page.locator('form').filter({has:page.getByRole('button',{name:'Crea edizione',exact:true})});
  for(const key of ['corso_id','stagione_id','direttore_id'])await f.locator('select[name='+key+']').selectOption(original[key]);
  await f.locator('input[name=nome]').fill(name);
  for(const key of ['inizio','fine'])await f.locator('input[name='+key+']').fill(original[key]);
  await f.locator('input[name=costo_corso]').fill('0');
  return f;
 };
 const [formA,formB]=await Promise.all([prepare(staff,raceName),prepare(secondStaff,'  '+raceName.toUpperCase()+'  ')]);
 await Promise.all([formA.getByRole('button',{name:'Crea edizione',exact:true}).click(),formB.getByRole('button',{name:'Crea edizione',exact:true}).click()]);
 const raceResult=async page=>{
  await expect.poll(async()=>{if(new URL(page.url()).pathname!=='/gestionale/corsi/nuovo')return 'created';if(await page.getByRole('alert').filter({hasText:'Questo corso esiste già'}).count())return 'duplicate';return 'pending';},{timeout:20000}).not.toBe('pending');
  return new URL(page.url()).pathname==='/gestionale/corsi/nuovo'?'duplicate':'created';
 };
 const outcomes=await Promise.all([raceResult(staff),raceResult(secondStaff)]);assert.deepEqual(outcomes.sort(),['created','duplicate']);
 const rows=await admin.from('edizioni_corsi').select('id,nome').eq('corso_id',original.corso_id).eq('stagione_id',original.stagione_id).eq('inizio',original.inizio).eq('fine',original.fine);
 assert.ok(!rows.error);const matching=rows.data.filter(x=>x.nome.trim().toLowerCase()===raceName.toLowerCase());assert.equal(matching.length,1);
 for(const page of [staff,secondStaff]){
  if(new URL(page.url()).pathname==='/gestionale/corsi/nuovo')await expect(page.getByRole('alert').filter({hasText:'Questo corso esiste già'}).getByRole('link',{name:'Apri quello esistente'})).toHaveAttribute('href','/gestionale/corsi/'+matching[0].id);
  else await expect(page).toHaveURL(u=>u.pathname==='/gestionale/corsi/'+matching[0].id);
 }
 console.log('OK UI concurrent normalized course creation: exactly one edition, loser links to winner');
}finally{for(const c of contexts)await c.close();await browser.close();}
