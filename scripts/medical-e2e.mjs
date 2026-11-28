import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {PDFDocument} from 'pdf-lib';
import {chromium,webkit,devices} from 'playwright';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
const origin='http://127.0.0.1:3000';
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||!anon||!service)throw Error('Solo Supabase locale con credenziali effimere');
const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const password='QA-only-'+randomUUID(), report=[];
const output='artifacts/medical-e2e';await mkdir(output,{recursive:true});
const check=(condition,label)=>{assert.ok(condition,label);report.push(label);console.log('PASS '+label);};
process.on('uncaughtExceptionMonitor',()=>{console.error('Controlli completati prima del blocco:',JSON.stringify(report));});
async function ok(query){const {data,error}=await query;if(error)throw Error(error.message);return data;}
async function account(label,role){
 const email=label+'@example.invalid';
 const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true});
 if(error)throw Error(error.message);
 const id=data.user.id;await ok(db.from('ruoli_utente').insert({utente_id:id,ruolo:role}));
 return {id,email};
}
async function person(label,account,season,state='attiva'){
 const id=randomUUID();await ok(db.from('persone').insert({id,nome:'Collaudo',cognome:label}));
 if(account)await ok(db.from('collegamenti_persone').insert({persona_id:id,utente_id:account.id,relazione:'titolare'}));
 if(season)await ok(db.from('adesioni').insert({persona_id:id,stagione_id:season,stato:state}));
 return {id, label,account};
}
const date=(offset)=>{const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)};
const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
async function cert(person,offset,esito){
 const id=randomUUID(),doc=randomUUID(),path=person.account.id+'/certificati/'+doc+'.pdf';
 await ok(db.from('documenti').insert({id:doc,nome:'Certificato QA',categoria:'Certificato medico',ambito:'personale',visibilita:'proprietario',utente_id:person.account.id,persona_id:person.id,percorso_storage:path,mime:'application/pdf',dimensione_bytes:bytes.length,caricato_da:person.account.id}));
 await ok(db.storage.from('sesto-documenti').upload(path,bytes,{contentType:'application/pdf'}));
 await ok(db.from('certificati_medici').insert({id,persona_id:person.id,documento_id:doc,rilasciato_il:date(-60),scade_il:date(offset)}));
 if(esito!=='in_attesa')await ok(db.from('certificati_medici').update({esito_verifica:esito}).eq('id',id));
 return {id,doc,path};
}
async function session(a){const c=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});await ok(c.auth.signInWithPassword({email:a.email,password}));return c;}
const admin=await account('qa-admin','amministratore'), secretary=await account('qa-secretary','segreteria'), a=await account('qa-owner','socio'),b=await account('qa-other','socio');
const seasons=await ok(db.from('stagioni').select('id').eq('attiva',true));assert.equal(seasons.length,1);const season=seasons[0].id;
const owner=await person('QA Valido',a,season), missing=await person('QA Mancante',b,season), due=await person('QA Scadenza',a,season), expired=await person('QA Scaduto',a,season), pending=await person('QA Verifica',a,season), noAccount=await person('QA Senza account',null,season), historical=await person('QA Storico',null,null);
const validCert=await cert(owner,90,'valido'), dueCert=await cert(due,30,'valido'), expiredCert=await cert(expired,-1,'valido'), pendingCert=await cert(pending,15,'in_attesa');
const ca=await session(a),cb=await session(b),cs=await session(secretary);
check((await ok(ca.from('stato_certificati').select('id').eq('id',validCert.id))).length===1,'RLS titolare legge proprio certificato');
check((await ok(cb.from('stato_certificati').select('id').eq('id',validCert.id))).length===0,'RLS altro socio non legge certificato');
check((await ok(cs.from('stato_certificati').select('id').eq('id',validCert.id))).length===1,'RLS segreteria legge certificato');
const unauthorized=await cb.from('certificati_medici').update({esito_verifica:'non_valido'}).eq('id',validCert.id).select('id');
check(Boolean(unauthorized.error)||unauthorized.data?.length===0,'RLS altro socio non modifica esito');
const ownUpdate=await ca.from('certificati_medici').update({esito_verifica:'non_valido'}).eq('id',validCert.id).select('id');
check(Boolean(ownUpdate.error)||ownUpdate.data?.length===0,'RLS titolare non convalida il proprio certificato');
const raw=await cb.storage.from('sesto-documenti').download(validCert.path);
check(Boolean(raw.error),'Storage non autorizzato al download diretto');
const list='/gestionale/moduli/certificati';
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const errorLogs=[];page.on('pageerror',e=>errorLogs.push(e.message));
async function login(page,account){
 await page.goto(origin+'/accedi');await page.locator('input[name=email]').first().fill(account.email);await page.locator('input[name=password]').fill(password);
 await page.getByRole('button',{name:'Accedi',exact:true}).click();
 await page.waitForURL(u=>!['/accedi','/smista'].includes(u.pathname),{timeout:30000});
}
const row=(p,label)=>p.getByRole('row').filter({hasText:label});
async function openList(p){await p.goto(origin+list);await p.getByRole('heading',{name:'Certificati medici',exact:true}).waitFor();await row(p,'QA Mancante').waitFor();}
await login(page,admin);await openList(page);
check(await row(page,'QA Mancante').count()===1,'UI una riga per iscritto senza file');
check(await row(page,'QA Storico').count()===0,'UI esclusione persona non iscritta');
check((await row(page,'QA Scadenza').innerText()).includes('In scadenza'),'UI scadenza 30 giorni');
check((await row(page,'QA Scaduto').innerText()).includes('Scaduto'),'UI scadenza superata');
await page.screenshot({path:output+'/desktop.png',fullPage:true});
const mobile=await webkit.launch();
for(const [name,device] of [['ipad','iPad (gen 7)'],['iphone','iPhone 13']]){
 const ctx=await mobile.newContext(devices[device]);const p=await ctx.newPage();await login(p,admin);await openList(p);
 const dimensions=await p.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth,table:document.querySelector('.medical-table-scroll')?.scrollWidth,container:document.querySelector('.medical-table-scroll')?.clientWidth}));
 check(dimensions.body<=dimensions.viewport+2,name+' nessun overflow globale');
 check(dimensions.table>=dimensions.container,name+' tabella accessibile con scorrimento');
 await p.screenshot({path:output+'/'+name+'.png',fullPage:true});await ctx.close();
}

await mobile.close();

await page.getByRole('link',{name:/In scadenza/}).first().click();await page.waitForURL(u=>u.searchParams.get('stato')==='in_scadenza');await page.getByRole('heading',{name:'In scadenza',exact:true}).waitFor();await row(page,'QA Scadenza').waitFor();await row(page,'QA Valido').waitFor({state:'detached'});check(await row(page,'QA Verifica').count()===1,'Filtro scadenza include certificato in verifica');check(await row(page,'QA Valido').count()===0,'Filtro scadenza esclude lungo termine');
await openList(page);await page.getByRole('textbox',{name:'Cerca per nome o cognome'}).fill('Mancante Collaudo');await page.getByRole('button',{name:'Cerca',exact:true}).click();await page.waitForURL(u=>u.searchParams.get('q')==='Mancante Collaudo');await row(page,'QA Mancante').waitFor();await row(page,'QA Valido').waitFor({state:'detached'});check(await row(page,'QA Valido').count()===0,'Ricerca nome e cognome in ordine inverso');
await openList(page);const pr=row(page,'QA Verifica');await pr.getByRole('combobox').selectOption('valido');await pr.getByRole('button',{name:'Salva',exact:true}).click();
await page.waitForFunction(()=>Array.from(document.querySelectorAll('tr')).some(r=>r.textContent.includes('QA Verifica')&&r.textContent.includes('In scadenza')));
check((await ok(db.from('certificati_medici').select('esito_verifica').eq('id',pendingCert.id).single())).esito_verifica==='valido','UI verifica inline persiste nel database');
let resp=await page.request.get(origin+'/documenti/'+validCert.doc);check(resp.status()===200&&resp.headers()['cache-control'].includes('no-store'),'Documento staff protetto no-store');
page.once('dialog',d=>d.dismiss());await row(page,'QA Mancante').getByRole('button',{name:'Invia notifica'}).click();check((await ok(db.from('notifiche').select('id').eq('tipo','sollecito_certificato'))).length===0,'Annullamento sollecito non scrive');
page.once('dialog',d=>d.accept());await row(page,'QA Mancante').getByRole('button',{name:'Invia notifica'}).click();await row(page,'QA Mancante').getByRole('button',{name:'Sollecitato'}).waitFor();
let notices=await ok(db.from('notifiche').select('id,utente_id,email_inviata_il').eq('tipo','sollecito_certificato'));check(notices.length===1&&notices[0].utente_id===b.id&&!notices[0].email_inviata_il,'Sollecito interno solo destinatario corretto');
await openList(page);page.once('dialog',d=>d.accept());await row(page,'QA Mancante').getByRole('button',{name:'Invia notifica'}).click();await row(page,'QA Mancante').getByRole('button',{name:'Sollecitato'}).waitFor();check((await ok(db.from('notifiche').select('id').eq('tipo','sollecito_certificato'))).length===1,'Doppio sollecito deduplicato nel database');
page.once('dialog',d=>d.accept());await row(page,'QA Senza account').getByRole('button',{name:'Invia notifica'}).click();await row(page,'QA Senza account').getByRole('alert').waitFor();check((await row(page,'QA Senza account').innerText()).includes('Nessun account'),'Sollecito senza account segnala errore');
const ownerContext=await browser.newContext(),ownerPage=await ownerContext.newPage();await login(ownerPage,a);
resp=await ownerPage.request.get(origin+'/documenti/'+validCert.doc);check(resp.status()===200,'Documento accessibile al titolare');
check((await ok(ca.from('notifiche').select('id').eq('tipo','sollecito_certificato'))).length===0,'RLS notifica invisibile ad altro socio');
const memberContext=await browser.newContext(),memberPage=await memberContext.newPage();await login(memberPage,b);
await memberPage.goto(origin+'/area-personale');await memberPage.getByRole('link',{name:'Carica il certificato medico richiesto'}).waitFor();check(true,'Notifica visibile in area personale del destinatario');
resp=await memberPage.request.get(origin+'/documenti/'+validCert.doc);check(resp.status()===404,'Route documento nega altro socio');
await memberPage.goto(origin+list);check(new URL(memberPage.url()).pathname!==list,'Area amministrativa negata al socio');
await memberPage.goto(origin+'/area-personale');await memberPage.getByRole('link',{name:'Carica il certificato medico richiesto'}).click();
await memberPage.locator('input[name=rilasciato_il]').fill(date(-1));await memberPage.locator('input[name=scade_il]').fill(date(90));await memberPage.locator('input[name=file]').setInputFiles({name:'qa.pdf',mimeType:'application/pdf',buffer:bytes});await memberPage.getByRole('button',{name:'Carica certificato',exact:true}).click();await memberPage.getByText('Documento ricevuto, in attesa di verifica amministrativa.').waitFor({timeout:30000});check(true,'Caricamento PDF tramite browser riuscito');
await openList(page);check((await row(page,'QA Mancante').innerText()).includes('In attesa di verifica'),'Documento caricato appare in verifica');
check(await row(page,'QA Mancante').getByRole('button',{name:'Invia notifica'}).count()===0,'Sollecito non disponibile dopo caricamento');
const secretaryContext=await browser.newContext(),secretaryPage=await secretaryContext.newPage();await login(secretaryPage,secretary);await openList(secretaryPage);check(true,'Segreteria autorizzata alla pagina');
check(errorLogs.length===0,'Nessuna eccezione JavaScript desktop');
await browser.close();await writeFile(output+'/report.json',JSON.stringify({passed:report.length,checks:report},null,2));
