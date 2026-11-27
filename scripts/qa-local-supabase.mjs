// Real local Supabase QA only. Never use production URLs or credentials.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {Client} from 'pg';
import {chromium,webkit,expect} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';

const env=process.env, work=resolve(env.QA_WORK_DIR||'.'), root=resolve('.');
const api=new URL(env.NEXT_PUBLIC_SUPABASE_URL||'http://invalid');
const database=new URL(env.QA_DB_URL||'http://invalid');
const app=new URL(env.QA_BASE_URL||'http://127.0.0.1:3314');
const loopback=u=>['localhost','127.0.0.1'].includes(u.hostname);
assert.ok(env.QA_ISOLATED_ENV==='true'&&env.SESTO_TEST_MODE==='true'&&env.SESTO_EMAIL_MODE==='simulate');
assert.ok(loopback(api)&&loopback(database)&&loopback(app)&&api.port==='54321'&&database.port==='54322'&&database.pathname==='/postgres');
assert.ok(env.QA_WORK_DIR&&work!==root&&!work.startsWith(root+'/'),'QA_WORK_DIR fuori dal repository');
assert.ok(env.NEXT_PUBLIC_SUPABASE_ANON_KEY&&env.SUPABASE_SERVICE_ROLE_KEY);
await mkdir(work,{recursive:true,mode:0o700});
const auth={persistSession:false,autoRefreshToken:false,detectSessionInUrl:false};
const admin=createClient(api.href,env.SUPABASE_SERVICE_ROLE_KEY,{auth});
const checked=(result,label)=>{if(result.error)throw Error(label+': '+(result.error.code||result.error.status||result.error.message));return result.data;};
const accountFile=join(work,'accounts.json');
async function seed(){
 const accounts={}, db=new Client({connectionString:database.href});await db.connect();
 const roleMap={staff:'amministratore',secretary:'segreteria',member:'socio',memberB:'socio',instructor:'istruttore',board:'consigliere_cda',guardian:'tutore',unassigned:'istruttore',applicant:null};
 const value=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 try{
  for(const [key,role] of Object.entries(roleMap)){
   const email=key+'-'+randomUUID()+'@example.invalid',password=randomBytes(24).toString('hex');
   const {user}=checked(await admin.auth.admin.createUser({email,password,email_confirm:true}),'create synthetic account');
   const person=role?randomUUID():null;
   accounts[key]={email,password,id:user.id,person};
   await db.query('delete from ruoli_utente where utente_id=$1',[user.id]);
   if(role){
    await db.query('insert into ruoli_utente(utente_id,ruolo) values($1,$2)',[user.id,role]);
    await db.query("insert into persone(id,nome,cognome) values($1,'Collaudo',$2)",[person,key]);
    await db.query("insert into collegamenti_persone values($1,$2,'titolare')",[user.id,person]);
   }
  }
  const represented=randomUUID();
  await db.query("insert into persone(id,nome,cognome,data_nascita) values($1,'Minore','Sintetico',(current_date-interval '12 years')::date)",[represented]);
  await db.query("insert into collegamenti_persone values($1,$2,'tutore')",[accounts.guardian.id,represented]);
  await db.query("insert into relazioni_tutori(minore_id,tutore_id,parentela) values($1,$2,'Genitore di prova')",[represented,accounts.guardian.person]);
  accounts.guardian.represented=represented;
  const season=await value("update stagioni set dal=current_date-30,al=current_date+100 where attiva returning id");
  const quotas=[];
  for(const key of ['member','memberB','instructor','board','unassigned']){
   const person=accounts[key].person;
   const adhesion=await value("insert into adesioni(persona_id,stagione_id,stato) values($1,$2,'attiva') returning id",[person,season]);
   await db.query("insert into tesseramenti(adesione_id,ente,stato,scade_il) values($1,'Ente di prova','attiva',current_date+90)",[adhesion]);
   quotas.push([person,await value('insert into quote_associative(persona_id,stagione_id,importo_dovuto) values($1,$2,10) returning id',[person,season])]);
  }
  await db.query('begin');
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[accounts.staff.id]);
  let payment;
  for(const [person,quota] of quotas)if(person!==accounts.unassigned.person)payment=await value("select registra_pagamento_guidato($1,$2,null,10,current_date,'contanti',null,null,$3)",[person,quota,randomUUID()]);
  const openQuota=quotas.find(([person])=>person===accounts.unassigned.person)[1];
  const catalog=await value("insert into corsi(nome,tipo) values($1,'APNEA') returning id",['Collaudo '+randomUUID()]);
  const edition=await value("insert into edizioni_corsi(corso_id,stagione_id,nome,inizio,fine,direttore_id) values($1,$2,'Edizione di prova',current_date,current_date+10,$3) returning id",[catalog,season,accounts.instructor.person]);
  await db.query("insert into qualifiche_istruttori(persona_id,titolo) values($1,'Qualifica sintetica')",[accounts.instructor.person]);
  const secondEdition=await value("insert into edizioni_corsi(corso_id,stagione_id,nome,inizio,fine,direttore_id) values($1,$2,'Seconda edizione sintetica',current_date+2,current_date+12,$3) returning id",[catalog,season,accounts.instructor.person]);
  await db.query("insert into assegnazioni_istruttori(edizione_id,persona_id,ruolo) values($1,$2,'responsabile')",[edition,accounts.instructor.person]);
  await db.query("insert into iscrizioni_corsi(edizione_id,persona_id,stato) values($1,$2,'iscritto')",[edition,accounts.member.person]);
  const pool=await value("insert into piscine(nome) values('Piscina di prova') returning id");
  const lane=await value('insert into corsie(piscina_id,numero) values($1,1) returning id',[pool]);
  const lesson=await value("select crea_lezione_guidata($1,'Lezione sintetica',(current_date+1+time '10:00') at time zone 'Europe/Rome',(current_date+1+time '11:00') at time zone 'Europe/Rome',$2,array[$3]::uuid[],null,null)",[edition,pool,lane]);
  const event=await value("select area_soci_salva_evento(null,'Evento sintetico','Luogo','Descrizione',current_date+2,current_date+2,0,10,'aperto')");
  const equipment=await value("insert into attrezzature(codice,categoria) values($1,'Collaudo') returning id",[randomUUID()]);
  await db.query("insert into cda_componenti(persona_id,carica,dal,al) values($1,'Consigliere',current_date,(current_date+interval '4 years')::date)",[accounts.board.person]);
  await db.query('commit');
  await db.query("insert into notifiche(utente_id,tipo,riferimento,titolo,messaggio) values($1,'collaudo',$2,'Notifica sintetica','Messaggio di prova')",[accounts.staff.id,randomUUID()]);
  const notification=await value("insert into notifiche(utente_id,tipo,riferimento,titolo,messaggio) values($1,'collaudo',$2,'Notifica socio sintetica','Messaggio di prova') returning id",[accounts.member.id,randomUUID()]);
  const lessonDay=await value("select to_char(current_date+1,'YYYY-MM-DD')");
  const fixtures={person:accounts.member.person,edition,lesson,event,equipment,payment,account:accounts.member.id,notification,openQuota,secondEdition,pool,lane,lessonDay};
  await writeFile(accountFile,JSON.stringify(accounts),{mode:0o600});
  await writeFile(join(work,'fixtures.json'),JSON.stringify(fixtures),{mode:0o600});
  console.log('OK account sintetici e fixture locali');
 }finally{await db.end();}
}
// Exercise actual logout, not just visibility. Fresh sessions never revoke the
// stored sessions used by the remaining QA suite. Only synthetic local accounts.
async function verifyAccountLogout(accounts){
 for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await browserType.launch();
  try{
   for(const [role,a] of Object.entries(accounts)){
    for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
     const context=await browser.newContext({baseURL:app.href,viewport});
     try{
      const page=await context.newPage();await page.goto('/accedi');
      await page.locator('input[name=email]').first().fill(a.email);
      await page.locator('input[name=password]').fill(a.password);
      await page.getByRole('button',{name:'Accedi',exact:true}).click();
      await page.waitForURL(u=>!['/accedi','/smista','/'].includes(u.pathname),{timeout:30000});
      assert.equal((await page.request.get('/richiesta/stato',{maxRedirects:0})).status(),200,'sessione non valida: '+role);
      const access=await page.request.get('/notifiche',{maxRedirects:0});
      assert.equal(access.status(),200,'notifiche non accessibili: '+role);
      const logout=page.getByRole('button',{name:'Esci dal gestionale',exact:true});
      await expect(logout).toBeVisible();
      await expect(logout).toBeInViewport({ratio:1});
      await logout.click();
      await page.waitForURL(u=>u.pathname==='/accedi'&&u.searchParams.get('msg')==='uscita',{timeout:30000});
      await page.goto('/notifiche');
      await expect(page).toHaveURL(u=>u.pathname==='/accedi');
      await expect(logout).toHaveCount(0);
      assert.ok([301,302,303,307,308].includes((await page.request.get('/richiesta/stato',{maxRedirects:0})).status()),'accesso ancora attivo dopo logout diretto: '+role);
      // Verify the alternate account/mobile menu logout on a fresh session too.
      await page.goto('/accedi');
      await page.locator('input[name=email]').first().fill(a.email);
      await page.locator('input[name=password]').fill(a.password);
      await page.getByRole('button',{name:'Accedi',exact:true}).click();
      await page.waitForURL(u=>!['/accedi','/smista','/'].includes(u.pathname),{timeout:30000});
      assert.equal((await page.request.get('/richiesta/stato',{maxRedirects:0})).status(),200);
      if(viewport.width>1000){
       const menu=page.locator('.sc-account-menu');
       await menu.locator('summary').click();
       await menu.getByRole('button',{name:'Esci',exact:true}).click();
      }else{
       await page.locator('.sc-mobile-trigger').click();
       await page.getByRole('dialog',{name:'Menu'}).getByRole('button',{name:'Esci',exact:true}).click();
      }
      await page.waitForURL(u=>u.pathname==='/accedi'&&u.searchParams.get('msg')==='uscita',{timeout:30000});
      assert.ok([301,302,303,307,308].includes((await page.request.get('/richiesta/stato',{maxRedirects:0})).status()),'accesso ancora attivo dopo logout menu: '+role);
      await page.goto('/notifiche');
      await expect(page).toHaveURL(u=>u.pathname==='/accedi');
      await expect(logout).toHaveCount(0);
      console.log('OK logout menu locale '+engine+' '+role+' '+viewport.width);
      console.log('OK logout locale '+engine+' '+role+' '+viewport.width);
     }finally{await context.close();}
    }
   }
  }finally{await browser.close();}
 }
}

async function sessions(){
 const accounts=JSON.parse(await readFile(accountFile,'utf8'));
 await verifyAccountLogout(accounts);
 const browser=await chromium.launch();
 try{
  for(const [role,a] of Object.entries(accounts)){
   const context=await browser.newContext({baseURL:app.href});
   try{
    const page=await context.newPage();await page.goto('/accedi');
    await page.locator('input[name=email]').first().fill(a.email);
    await page.locator('input[name=password]').fill(a.password);
    await page.getByRole('button',{name:'Accedi',exact:true}).click();
    await page.waitForURL(u=>!['/accedi','/smista','/'].includes(u.pathname),{timeout:30000});
    const access=await page.request.get('/richiesta/stato',{maxRedirects:0});
    assert.equal(access.status(),200,'sessione non valida: '+role);
    await context.storageState({path:join(work,role+'.json')});
    console.log('OK sessione locale '+role);
   }finally{await context.close();}
  }
  // HTTP JWT reali e oggetto Storage reale, sintetico.
  const login=async a=>{const c=createClient(api.href,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth});checked(await c.auth.signInWithPassword({email:a.email,password:a.password}),'login HTTP');return c;};
  const [a,b]=await Promise.all([login(accounts.member),login(accounts.memberB)]);
  for(const [client,own,other] of [[a,accounts.member,accounts.memberB],[b,accounts.memberB,accounts.member]]){
   assert.equal(checked(await client.from('persone').select('id').eq('id',own.person),'own person').length,1);
   assert.equal(checked(await client.from('persone').select('id').eq('id',other.person),'other person').length,0);
  }
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=await pdf.save(),doc=randomUUID();
  const path=accounts.member.id+'/certificati/'+doc+'.pdf';
  checked(await a.from('documenti').insert({id:doc,nome:'Certificato sintetico',categoria:'Certificato medico',ambito:'personale',visibilita:'proprietario',utente_id:accounts.member.id,persona_id:accounts.member.person,percorso_storage:path,mime:'application/pdf',dimensione_bytes:bytes.byteLength,caricato_da:accounts.member.id}),'document metadata');
  checked(await admin.storage.from('sesto-documenti').upload(path,bytes,{contentType:'application/pdf',upsert:false}),'storage upload');
  const date=new Date().toISOString().slice(0,10),expiry=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
  checked(await a.rpc('registra_certificato_personale',{p_persona:accounts.member.person,p_documento:doc,p_rilasciato:date,p_scade:expiry}),'certificate registration');
  assert.equal(checked(await b.from('documenti').select('id').eq('id',doc),'other document').length,0);
  for(const c of [a,b])assert.ok((await c.storage.from('sesto-documenti').download(path)).error,'direct private download must fail');
  for(const role of ['member','memberB','staff']){
   const ctx=await browser.newContext({baseURL:app.href,storageState:join(work,role+'.json')});
   try{
    const response=await ctx.request.get('/documenti/'+doc+'?download=1',{maxRedirects:0});
    if(role==='memberB')assert.equal(response.status(),404);
    else{assert.equal(response.status(),200);assert.deepEqual(await response.body(),Buffer.from(bytes));assert.match(response.headers()['cache-control'],/no-store/);}
   }finally{await ctx.close();}
  }
  const fixtures=JSON.parse(await readFile(join(work,'fixtures.json'),'utf8'));
  const [guardian,unassigned,assigned]=await Promise.all([login(accounts.guardian),login(accounts.unassigned),login(accounts.instructor)]);
  assert.equal(checked(await guardian.rpc('owns_person',{p_persona:accounts.guardian.represented}),'represented person'),true);
  assert.equal(checked(await guardian.from('persone').select('id').eq('id',accounts.guardian.represented),'represented RLS').length,1);
  assert.equal(checked(await guardian.from('persone').select('id').eq('id',accounts.member.person),'unrelated RLS').length,0);
  assert.equal(checked(await guardian.rpc('owns_person',{p_persona:accounts.member.person}),'unrelated person'),false);
  assert.equal(checked(await assigned.rpc('insegna_edizione',{p_edizione:fixtures.edition}),'assigned instructor'),true);
  assert.equal(checked(await unassigned.rpc('insegna_edizione',{p_edizione:fixtures.edition}),'unassigned instructor'),false);
  assert.ok((await unassigned.from('presenze').insert({lezione_id:fixtures.lesson,persona_id:accounts.member.person,presente:true})).error);
  assert.equal(checked(await unassigned.rpc('allievi_del_mio_corso').eq('edizione_id',fixtures.edition),'unassigned learners').length,0);
  console.log('OK tutore: isolamento persone rappresentate; istruttore non assegnato: nessun accesso didattico laterale');
  // Revocation must affect an already-issued access token, not just future login.
  checked(await admin.auth.admin.updateUserById(accounts.memberB.id,{ban_duration:'1h'}),'disable synthetic account');
  assert.equal(checked(await b.rpc('account_corrente_abilitato'),'disabled account'),false);
  assert.equal(checked(await b.from('persone').select('id').eq('id',accounts.memberB.person),'disabled user RLS').length,0);
  console.log('OK Auth JWT, isolamento anagrafiche, Storage privato, download e revoca account');
 }finally{await browser.close();}
}
if(process.argv[2]==='seed')await seed();else if(process.argv[2]==='sessions')await sessions();else if(process.argv[2]==='mutations'){
 const {runMutations}=await import('./qa-local-mutations.mjs');
 await runMutations({api,app,admin,accounts:JSON.parse(await readFile(accountFile,'utf8')),fixtures:JSON.parse(await readFile(join(work,'fixtures.json'),'utf8')),work});
}else if(process.argv[2]==='visual-fixtures'){
 // Existing notification was consumed by the mutation test. Add a dedicated
 // local-only synthetic record after those tests; leave their assertions intact.
 assert.equal(env.SC_STRUCTURAL_RPC,'false');assert.equal(env.SC_STRUCTURAL_RPC_RELEASE,'false');
 const accounts=JSON.parse(await readFile(accountFile,'utf8'));
 const db=new Client({connectionString:database.href});await db.connect();
 try{
  const reference=randomUUID();
  await db.query("insert into notifiche(utente_id,tipo,riferimento,titolo,messaggio) values($1,'collaudo',$2,'Notifica visuale sintetica','Messaggio di collaudo: verifica il testo su più righe e il pulsante Segna come letta. Nessun dato reale.')",[accounts.member.id,reference]);
  await writeFile(join(work,'visual-notification-reference.json'),JSON.stringify(reference),{mode:0o600});
 }finally{await db.end();}
 console.log('OK fixture notifica visuale locale');
}else if(process.argv[2]==='visual-fixtures-cleanup'){
 // Remove only the exact synthetic notification created for screenshot QA.
 // Keep the 2,000-notification performance contract and all checks unchanged.
 assert.equal(env.SC_STRUCTURAL_RPC,'false');assert.equal(env.SC_STRUCTURAL_RPC_RELEASE,'false');
 const accounts=JSON.parse(await readFile(accountFile,'utf8'));
 const reference=JSON.parse(await readFile(join(work,'visual-notification-reference.json'),'utf8'));
 assert.match(reference,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 const db=new Client({connectionString:database.href});await db.connect();
 try{
  const result=await db.query("delete from notifiche where utente_id=$1 and tipo='collaudo' and riferimento=$2 and titolo='Notifica visuale sintetica' returning id",[accounts.member.id,reference]);
  assert.equal(result.rowCount,1,'exactly one visual-only fixture must be removed');
  const remaining=await db.query("select count(*)::int as n from notifiche where utente_id=$1 and letta_il is null",[accounts.member.id]);
  assert.equal(remaining.rows[0].n,0,'unexpected unread notifications before benchmark');
 }finally{await db.end();}
 console.log('OK visual-only notification removed before load dataset');
}else if(process.argv[2]==='performance'){
 const {runPerformance}=await import('./qa-local-performance.mjs');
 await runPerformance({app,database,accounts:JSON.parse(await readFile(accountFile,'utf8')),work});
}else if(process.argv[2]==='auth'){
 const {runAuth}=await import('./qa-local-auth.mjs');
 await runAuth({app,admin});
}else throw Error('Usare seed, sessions, mutations, visual-fixtures, visual-fixtures-cleanup, performance o auth');
