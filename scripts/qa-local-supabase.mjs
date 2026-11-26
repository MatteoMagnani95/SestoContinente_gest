// Real local Supabase QA only. Never use production URLs or credentials.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {Client} from 'pg';
import {chromium} from '@playwright/test';
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
 const roleMap={staff:'amministratore',secretary:'segreteria',member:'socio',memberB:'socio',instructor:'istruttore',board:'consigliere_cda',applicant:null};
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
  const season=await value("update stagioni set dal=current_date-30,al=current_date+100 where attiva returning id");
  const quotas=[];
  for(const key of ['member','memberB','instructor','board']){
   const person=accounts[key].person;
   const adhesion=await value("insert into adesioni(persona_id,stagione_id,stato) values($1,$2,'attiva') returning id",[person,season]);
   await db.query("insert into tesseramenti(adesione_id,ente,stato,scade_il) values($1,'Ente di prova','attiva',current_date+90)",[adhesion]);
   quotas.push([person,await value('insert into quote_associative(persona_id,stagione_id,importo_dovuto) values($1,$2,10) returning id',[person,season])]);
  }
  await db.query('begin');
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[accounts.staff.id]);
  let payment;
  for(const [person,quota] of quotas)payment=await value("select registra_pagamento_guidato($1,$2,null,10,current_date,'contanti',null,null,$3)",[person,quota,randomUUID()]);
  const catalog=await value("insert into corsi(nome,tipo) values($1,'APNEA') returning id",['Collaudo '+randomUUID()]);
  const edition=await value("insert into edizioni_corsi(corso_id,stagione_id,nome,inizio,fine,direttore_id) values($1,$2,'Edizione di prova',current_date,current_date+10,$3) returning id",[catalog,season,accounts.instructor.person]);
  await db.query("insert into qualifiche_istruttori(persona_id,titolo) values($1,'Qualifica sintetica')",[accounts.instructor.person]);
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
  const fixtures={person:accounts.member.person,edition,lesson,event,equipment,payment,account:accounts.member.id};
  await writeFile(accountFile,JSON.stringify(accounts),{mode:0o600});
  await writeFile(join(work,'fixtures.json'),JSON.stringify(fixtures),{mode:0o600});
  console.log('OK account sintetici e fixture locali');
 }finally{await db.end();}
}
async function sessions(){
 const accounts=JSON.parse(await readFile(accountFile,'utf8'));
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
  console.log('OK Auth JWT, isolamento anagrafiche, Storage privato e download applicativo');
 }finally{await browser.close();}
}
if(process.argv[2]==='seed')await seed();else if(process.argv[2]==='sessions')await sessions();else throw Error('Usare seed o sessions');
