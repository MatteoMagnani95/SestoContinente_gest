// Invoked only by qa-local-supabase.mjs after all isolation guards.
// These are real UI writes against synthetic fixtures, never production.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {PDFDocument} from 'pdf-lib';

export async function runMutations({app,admin,accounts,fixtures,work}){
 const browser=await chromium.launch();
 const contexts=[];
 const one=async(table,columns,filters)=>{
  let query=admin.from(table).select(columns);
  for(const [k,v] of Object.entries(filters))query=query.eq(k,v);
  const {data,error}=await query.single();if(error)throw Error(table+': '+error.code);return data;
 };
 const count=async(table,filters)=>{
  let query=admin.from(table).select('id',{head:true,count:'exact'});
  for(const [k,v] of Object.entries(filters))query=query.eq(k,v);
  const {count,error}=await query;if(error)throw Error(table+': '+error.code);return count;
 };
 const open=async role=>{
  const ctx=await browser.newContext({baseURL:app.href,storageState:join(work,role+'.json'),viewport:{width:390,height:844}});
  contexts.push(ctx);return ctx.newPage();
 };
 try{
  const member=await open('member'),staff=await open('staff'),teacher=await open('instructor');
  // Notification: real server action, persistent state and no duplicate mutation.
  await member.goto('/area-personale?tab=notifiche');
  const notice=member.locator('article').filter({hasText:'Notifica socio sintetica'});
  await notice.getByRole('button',{name:'Segna come letta'}).click();
  await expect(member).toHaveURL(/msg=letta/);
  assert.ok((await one('notifiche','letta_il',{id:fixtures.notification})).letta_il);
  await member.reload();await expect(notice).toHaveCount(0);
  console.log('OK UI notifica letta e stato persistente');

  // Update contact and verify the actual stored value after navigation.
  await member.goto('/area-personale/profilo');
  await member.getByRole('button',{name:'Modifica recapiti'}).click();
  const contact=member.getByRole('dialog',{name:/Modifica recapiti/});
  await contact.locator('input[name=telefono]').fill('0000000000');
  await contact.getByRole('button',{name:'Salva recapiti'}).click();
  await expect(member).toHaveURL(/msg=ok/);
  assert.equal((await one('persone','telefono',{id:accounts.member.person})).telefono,'0000000000');
  await member.reload();await expect(member.getByText('0000000000',{exact:false})).toBeVisible();
  console.log('OK UI salvataggio recapiti e rilettura');

  // A stale form must not silently restore a consent after revocation.
  const consent=page=>page.locator('input[name=immagini]');
  const save=page=>page.getByRole('button',{name:'Salva scelta'});
  await consent(member).check();await save(member).click();
  await expect(member.getByRole('status').filter({hasText:'Consenso acquisito'})).toBeVisible();
  const stale=await open('member');await stale.goto('/area-personale/profilo');
  await expect(consent(stale)).toBeChecked();
  await consent(member).uncheck();await save(member).click();
  await expect(member.getByRole('status').filter({hasText:'Consenso revocato'})).toBeVisible();
  await save(stale).click();
  await expect(stale.getByRole('alert').filter({hasText:'La scelta è stata modificata'})).toBeVisible();
  const choice=await admin.from('scelte_iscrizione').select('scelta,versione,origine').eq('utente_id',accounts.member.id).eq('tipo','immagini').order('id',{ascending:false}).limit(1).single();
  assert.ifError(choice.error);assert.deepEqual(choice.data,{scelta:false,versione:'TEST-COLLAUDO-1',origine:'profilo'});
  console.log('OK UI consenso, revoca e modulo obsoleto respinto');

  // Reserve and release a place through the member UI.
  await member.goto('/area-soci');
  const event=member.locator('article').filter({has:member.getByRole('heading',{name:'Evento sintetico',exact:true})});
  await event.getByRole('button',{name:'Richiedi iscrizione',exact:true}).click();
  const registration=member.getByRole('dialog',{name:/Richiedi iscrizione/});
  await registration.locator('select[name=persona_id]').selectOption(accounts.member.person);
  await registration.getByRole('button',{name:'Richiedi iscrizione',exact:true}).click();
  await expect(member).toHaveURL(/msg=ok/);
  const filter={evento_id:fixtures.event,persona_id:accounts.member.person};
  assert.equal((await one('eventi_soci_iscrizioni','stato',filter)).stato,'in_attesa');
  await event.getByRole('button',{name:'Disiscriviti',exact:true}).click();
  const withdrawal=member.getByRole('dialog',{name:/Disiscriviti/});
  await withdrawal.locator('input[name=conferma]').check();
  await withdrawal.getByRole('button',{name:'Disiscriviti',exact:true}).click();
  await expect.poll(async()=>(await one('eventi_soci_iscrizioni','stato',filter)).stato).toBe('ritirata');
  assert.equal(await count('eventi_soci_iscrizioni',filter),1);
  console.log('OK UI iscrizione evento e ritiro senza duplicati');

  // Assigned instructor updates a real attendance entry.
  await teacher.goto('/istruttore?'+new URLSearchParams({tab:'presenze',edizione:fixtures.edition,lezione:fixtures.lesson}));
  const row=teacher.locator('.sc-attendance-item').filter({hasText:'member'});
  await row.locator('select[name=presente]').selectOption('si');
  await row.locator('textarea[name=nota_didattica]').fill('Nota sintetica');
  await row.getByRole('button',{name:'Registra presenza'}).click();
  await expect(teacher).toHaveURL(/msg=ok/);
  const presence={lezione_id:fixtures.lesson,persona_id:accounts.member.person};
  assert.deepEqual(await one('presenze','presente,nota_didattica',presence),{presente:true,nota_didattica:'Nota sintetica'});
  await teacher.reload();await row.locator('select[name=presente]').selectOption('no');
  await row.getByRole('button',{name:'Aggiorna presenza'}).click();
  await expect.poll(async()=>(await one('presenze','presente',presence)).presente).toBe(false);
  assert.equal(await count('presenze',presence),1);
  console.log('OK UI registrazione e aggiornamento presenza, chiave unica');

  // Course request with emergency contact, persisted atomically.
  await member.goto('/area-personale/corsi?tab=catalogo');
  const course=member.locator('article').filter({has:member.getByRole('heading',{name:'Seconda edizione sintetica',exact:true})});
  await course.getByRole('button',{name:'Richiedi iscrizione',exact:true}).click();
  const courseForm=member.getByRole('dialog',{name:/Richiedi iscrizione/});
  await courseForm.locator('select[name=persona_id]').selectOption(accounts.member.person);
  await courseForm.locator('input[name=emergenza_nome]').fill('Contatto sintetico');
  await courseForm.locator('input[name=emergenza_telefono]').fill('0000000000');
  await courseForm.getByRole('button',{name:'Richiedi iscrizione',exact:true}).click();
  await expect(member).toHaveURL(/msg=inviata/);
  const enrollment={edizione_id:fixtures.secondEdition,persona_id:accounts.member.person};
  assert.equal((await one('iscrizioni_corsi','stato',enrollment)).stato,'in_attesa');
  assert.deepEqual(await one('contatti_emergenza','nominativo,telefono',{persona_id:accounts.member.person}),{nominativo:'Contatto sintetico',telefono:'0000000000'});
  assert.equal(await count('iscrizioni_corsi',enrollment),1);
  console.log('OK UI richiesta corso e contatto emergenza atomici');

  // A qualified member needs an explicit staff override for this edition.
  const candidate=accounts.memberB.person;
  const qualification=await admin.from('qualifiche_istruttori').insert({persona_id:candidate,titolo:'Qualifica sintetica per deroga'});
  assert.ifError(qualification.error);
  await staff.goto('/gestionale/corsi/'+fixtures.edition+'?tab=allievi');
  await staff.getByRole('button',{name:'Iscrivi allievo',exact:true}).click();
  const picker=staff.getByRole('dialog',{name:'Iscrivi allievo'});
  const student=picker.locator('select[name=persona_id]');
  const option=id=>student.locator('option[value="'+id+'"]');
  await expect(option(candidate)).toHaveCount(0);
  await picker.locator('input[name=deroga_istruttore]').check();
  await expect(option(accounts.instructor.person)).toHaveCount(0);
  await student.selectOption(candidate);
  const confirmOverride=picker.getByRole('button',{name:'Conferma iscrizione'});
  await expect(confirmOverride).toBeDisabled();
  const reason='Percorso didattico autorizzato per il collaudo';
  await picker.locator('textarea[name=deroga_motivo]').fill(reason);
  await confirmOverride.click();
  await expect(picker).toBeHidden();
  const saved=await one('iscrizioni_corsi','id,stato',{edizione_id:fixtures.edition,persona_id:candidate});
  assert.equal(saved.stato,'iscritto');
  const audit=await one('deroghe_iscrizioni_corsi','motivo,autorizzata_da,autorizzata_il',{iscrizione_id:saved.id});
  assert.equal(audit.motivo,reason);
  assert.equal(audit.autorizzata_da,accounts.staff.id);
  assert.ok(Number.isFinite(Date.parse(audit.autorizzata_il)));
  console.log('OK UI deroga motivata, esclusione direttore e audit persistente');

  // Partial payment, settlement and explicit correction of the second payment.
  const debt=fixtures.openQuota;
  const balance=async()=>Number((await one('saldi_quote','residuo',{id:debt})).residuo);
  assert.equal(await balance(),10);
  async function pay(amount,expected){
   await staff.goto('/gestionale/incassi?tab=quota&debito='+debt);
   await staff.getByRole('button',{name:'Registra versamento',exact:true}).click();
   const panel=staff.getByRole('dialog',{name:/Registra versamento/});
   await panel.locator('input[name=importo]').fill(String(amount));
   await panel.locator('select[name=metodo]').selectOption('contanti');
   await panel.locator('input[name=conferma]').check();
   await panel.getByRole('button',{name:'Registra definitivamente'}).click();
   await expect(staff).toHaveURL(/msg=salvato/);
   await expect.poll(balance).toBe(expected);
  }
  await pay(4,6);await pay(6,0);
  assert.equal(await count('pagamenti',{quota_id:debt}),2);
  const payment=await one('pagamenti','id',{quota_id:debt,importo:6});
  assert.equal(await count('movimenti_economici',{pagamento_id:payment.id}),1);
  await staff.goto('/gestionale/incassi/'+payment.id);
  await staff.getByRole('button',{name:'Rettifica versamento'}).click();
  const correction=staff.getByRole('dialog',{name:'Rettifica versamento'});
  await correction.locator('textarea[name=motivo]').fill('Rettifica sintetica di collaudo');
  await correction.locator('input[name=conferma]').check();
  await correction.getByRole('button',{name:'Rimuovi'}).click();
  await expect(staff).toHaveURL(/msg=rettificato/);
  assert.equal(await balance(),6);
  assert.equal(await count('pagamenti',{quota_id:debt}),1);
  assert.equal(await count('rettifiche_incassi',{pagamento_id:payment.id}),1);
  assert.equal(await count('movimenti_economici',{pagamento_id:payment.id}),0);
  console.log('OK UI incasso parziale, saldo, movimento unico e rettifica con storico');

  // Revision, delivery and return update the same inventory record.
  const equipment=fixtures.equipment,asset='/gestionale/attrezzature/'+equipment;
  await staff.goto(asset);
  await staff.getByRole('button',{name:'Registra revisione'}).click();
  const revision=staff.getByRole('dialog',{name:'Registra revisione'});
  const nextDate=new Date(Date.now()+90*86400000).toISOString().slice(0,10);
  await revision.locator('input[name=tipo]').fill('Revisione sintetica');
  await revision.locator('input[name=prossimo_intervento]').fill(nextDate);
  await revision.getByRole('button',{name:'Salva revisione'}).click();
  await expect(staff).toHaveURL(/msg=salvato/);
  assert.equal(await count('revisioni_attrezzature',{attrezzatura_id:equipment}),1);
  assert.equal((await one('attrezzature','prossima_revisione',{id:equipment})).prossima_revisione,nextDate);
  await staff.goto(asset);
  await staff.getByRole('link',{name:'Registra consegna'}).click();
  const loan=staff.getByRole('dialog',{name:'Registra consegna'});
  await loan.locator('select[name=persona_id]').selectOption(accounts.member.person);
  await loan.getByRole('button',{name:'Registra consegna'}).click();
  await expect(staff).toHaveURL(/msg=salvato/);
  assert.equal((await one('attrezzature','stato',{id:equipment})).stato,'assegnata');
  const loanId=(await one('assegnazioni_attrezzature','id',{attrezzatura_id:equipment})).id;
  await staff.goto(asset);await staff.getByRole('button',{name:'Registra restituzione'}).click();
  const returned=staff.getByRole('dialog',{name:'Registra restituzione'});
  await returned.locator('input[name=conferma]').check();
  await returned.getByRole('button',{name:'Registra restituzione'}).click();
  await expect(staff).toHaveURL(/msg=salvato/);
  assert.equal((await one('attrezzature','stato',{id:equipment})).stato,'disponibile');
  assert.ok((await one('assegnazioni_attrezzature','restituita_il',{id:loanId})).restituita_il);
  console.log('OK UI revisione, prestito e restituzione con stato coerente');

  // Actual signed-upload path (>3 MiB), no real medical content.
  const pdf=await PDFDocument.create();pdf.addPage();
  await pdf.attach(randomBytes(4*1024*1024),'fixture.bin',{mimeType:'application/octet-stream'});
  const bytes=Buffer.from(await pdf.save());assert.ok(bytes.length>3*1024*1024&&bytes.length<10*1024*1024);
  const existing=await admin.from('certificati_medici').select('id,documento_id,rilasciato_il,scade_il,idoneita_verificata').eq('persona_id',accounts.member.person).order('id');
   assert.ifError(existing.error);assert.ok(existing.data.length>0,'session fixture certificate is required');
   const previousIds=new Set(existing.data.map(c=>c.id)),before=existing.data.length;
  await member.goto('/area-personale/certificato');
  await member.locator('select[name=persona_id]').selectOption(accounts.member.person);
  // Deliberately reuse the issue date of a previously registered certificate:
   // issue date is not a unique identifier, including across UTC midnight.
   const date=existing.data[0].rilasciato_il,expiry=new Date(Date.now()+60*86400000).toISOString().slice(0,10);
  await member.locator('input[name=rilasciato_il]').fill(date);
  await member.locator('input[name=scade_il]').fill(expiry);
  await member.locator('input[name=file]').setInputFiles({name:'certificato-sintetico.pdf',mimeType:'application/pdf',buffer:bytes});
  await member.getByRole('button',{name:'Carica certificato',exact:true}).click();
  await expect(member).toHaveURL(/msg=ok/,{timeout:60000});
  assert.equal(await count('certificati_medici',{persona_id:accounts.member.person}),before+1);
  const after=await admin.from('certificati_medici').select('id,documento_id,rilasciato_il,scade_il,idoneita_verificata').eq('persona_id',accounts.member.person).order('id');
   assert.ifError(after.error);assert.equal(after.data.length,before+1);
   const added=after.data.filter(c=>!previousIds.has(c.id));assert.equal(added.length,1);
   assert.deepEqual(after.data.filter(c=>previousIds.has(c.id)),existing.data,'existing certificates preserved');
   const cert=added[0];assert.equal(cert.rilasciato_il,date);assert.equal(cert.scade_il,expiry);assert.ok(cert.documento_id);
  assert.equal(cert.idoneita_verificata,false);
  const download=await member.request.get('/documenti/'+cert.documento_id+'?download=1');
  assert.equal(download.status(),200);assert.deepEqual(await download.body(),bytes);
  const staged=await admin.storage.from('sesto-documenti').list(accounts.member.id+'/transito');
  assert.ifError(staged.error);assert.equal(staged.data.length,0);
  console.log('OK UI certificato oltre 3 MiB, transito rimosso, file integro e idoneita non convalidata');

  // Quarantine an intentionally invalid historical CSV; never confirm it.
  await staff.goto('/gestionale/importazione');
  const csv='codice_fiscale,nome,cognome,data_nascita,luogo_nascita,provincia_nascita,stato_nascita,provincia_residenza,stato_residenza,email,telefono\nINVALIDO,Test,Quarantena,,,,,,,,';
  await staff.locator('input[name=file]').setInputFiles({name:'quarantena.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await staff.getByRole('button',{name:'Carica e visualizza anteprima'}).click();
  await expect(staff).toHaveURL(/batch=/);
  const batch=new URL(staff.url()).searchParams.get('batch');
  assert.equal((await one('importazioni_batch','stato',{id:batch})).stato,'anteprima');
  assert.equal(await count('importazioni_righe',{batch_id:batch}),1);
  const imported=await one('importazioni_righe','errori,importato_id',{batch_id:batch});
  assert.ok(imported.errori.length>0);assert.equal(imported.importato_id,null);
  await staff.getByRole('button',{name:'Conferma importazione definitiva'}).click();
  await expect(staff.getByRole('dialog',{name:'Conferma importazione'}).getByRole('button',{name:'Importa definitivamente'})).toBeDisabled();
  console.log('OK UI CSV in quarantena, conferma bloccata e nessuna importazione parziale');

  // A quarantine outside the visible first page must still block confirmation.
  // Generate synthetic checksum-valid codes with the same algorithm used by the app.
  const {createRequire}=await import('node:module');
  const {readFileSync}=await import('node:fs');
  const require=createRequire(import.meta.url),ts=require('typescript');
  const source=readFileSync(new URL('../lib/codice-fiscale.ts',import.meta.url),'utf8');
  const cfLib={};new Function('exports',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(cfLib);
  const names=Array.from({length:51},(_,i)=>'Collaudo'+String.fromCharCode(65+Math.floor(i/26))+String.fromCharCode(65+i%26));
  // Distinct birth dates ensure distinct codes even where name encoding collides.
  const validRows=names.map((name,i)=>{
   const birth=new Date(Date.UTC(1980,0,i+1)).toISOString().slice(0,10);
   const cf=cfLib.generaCF({nome:name,cognome:'Sintetico',data_nascita:birth,sesso_cf:'M',codice_catastale_nascita:'H501'});
   assert.ok(cfLib.validaCF(cf));
   return [cf,name,'Sintetico',birth,'Roma','RM','Italia','','','',''].join(',');
  });
  const header=csv.split('\n')[0];
  const prepare=async rows=>{
   await staff.goto('/gestionale/importazione');
   await staff.locator('input[name=base_documentale]').check();
   await staff.locator('input[name=file]').setInputFiles({name:'lotto-sintetico.csv',mimeType:'text/csv',buffer:Buffer.from([header,...rows].join('\n'))});
   await staff.getByRole('button',{name:'Carica e visualizza anteprima'}).click();
   await expect(staff).toHaveURL(/batch=/);
   return new URL(staff.url()).searchParams.get('batch');
  };
  const paged=await prepare([...validRows.slice(0,50),'INVALIDO,Test,Quarantena,,,,,,,,']);
  const table=staff.getByRole('table',{name:'Anteprima importazione'});
  await expect(table.locator('tbody tr')).toHaveCount(50);
  await expect(staff.getByRole('navigation',{name:'Paginazione'})).toContainText('51 righe');
  await staff.getByRole('button',{name:'Conferma importazione definitiva'}).click();
  await expect(staff.getByRole('dialog',{name:'Conferma importazione'}).getByRole('button',{name:'Importa definitivamente'})).toBeDisabled();
  await staff.goto('/gestionale/importazione?batch='+paged+'&msg=importato&n=51');
  await expect(staff.getByRole('status')).toContainText('Esito non confermato');
  await staff.getByRole('link',{name:'Solo anomalie (1)'}).click();
  await expect(table.locator('tbody tr')).toHaveCount(1);
  assert.equal(await count('importazioni_righe',{batch_id:paged}),51);
  const positive=await prepare(validRows.slice(50));
  await staff.getByRole('button',{name:'Conferma importazione definitiva'}).click();
  const confirm=staff.getByRole('dialog',{name:'Conferma importazione'});
  await confirm.locator('input[name=conferma]').check();
  await confirm.getByRole('button',{name:'Importa definitivamente'}).click();
  await expect(staff).toHaveURL(/msg=importato/);
  await expect(staff.getByRole('status')).toContainText('Importazione conclusa correttamente (1 righe)');
  assert.equal((await one('importazioni_batch','stato',{id:positive})).stato,'importato');
  const newPerson=(await one('importazioni_righe','importato_id',{batch_id:positive})).importato_id;
  assert.ok(newPerson);
  const provenance=await one('provenienza_accettazioni_storiche','verifica_documentale',{persona_id:newPerson});
  assert.equal(provenance.verifica_documentale,true);
  console.log('OK UI importazione: anomalie fuori pagina, falso successo respinto, conferma positiva e provenienza sintetica');

 }finally{
  await Promise.all(contexts.map(c=>c.close()));await browser.close();
 }
}
