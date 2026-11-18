import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const ts=require('typescript');
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const compiled=ts.transpileModule(read('lib/email-tools.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const tools=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
test('Email: default simulazione e blocco invio reale durante il collaudo',()=>{
 assert.equal(tools.mailMode({}),'simulate');assert.equal(tools.mailMode({SESTO_EMAIL_MODE:'live',SESTO_TEST_MODE:'true'}),'simulate');assert.equal(tools.mailMode({SESTO_EMAIL_MODE:'test',SESTO_TEST_MODE:'true'}),'test');assert.equal(tools.mailMode({SESTO_EMAIL_MODE:'live',SESTO_TEST_MODE:'false'}),'live');
});
test('Email: deduplica e rifiuta header/indirizzi non validi',()=>{
 assert.deepEqual(tools.uniqueRecipients(['a@example.test','A@example.test',' b@example.test ',null,'x@example.test, injected@example.test','bad','x\n@example.test']),['a@example.test','b@example.test']);assert.equal(tools.validMessage('ok\nBcc: x','test'),false);assert.equal(tools.validMessage('oggetto','corpo'),true);
});
test('Email: promemoria calcolato sul residuo, esclusi saldi nulli o a zero',()=>{
 const t=tools.debtTemplate('corso','x','Mario','ARA',35.5,'2027-01-10');assert.match(t.body,/35,50/);assert.match(t.body,/10\/01\/2027/);assert.equal(tools.debtTemplate('quota','x','Mario','stagione',0,null),null);assert.equal(tools.debtTemplate('quota','x','Mario','stagione',-1,null),null);
});
test('Mailing list: permessi a livello SQL e soli iscritti confermati, nessuna copia dati',()=>{
 const s=read('supabase/migrations/20261118090000_comunicazioni_email.sql');assert.match(s,/public\.is_staff\(\) OR \(public\.is_instructor\(\)/);assert.match(s,/a\.ruolo='responsabile'/);assert.match(s,/cp\.relazione='titolare' AND cp\.utente_id=auth\.uid\(\)/);assert.match(s,/i\.edizione_id=p_edizione AND i\.stato='iscritto'/);assert.match(s,/FROM PUBLIC,anon,authenticated/);assert.doesNotMatch(s,/CREATE TABLE/i);assert.match(s,/saldi_corsi q where q\.residuo>0/);
});
test('Mailing list: server rivaluta l’accesso, non accetta destinatari dal client, invii separati',()=>{
 const a=read('app/comunicazioni/actions.ts'),s=read('lib/email-service.ts');assert.match(a,/getCourseMail\(id\):await getMemberMail\(id\)/);assert.match(a,/contextRecipients\(c\)/);assert.match(a,/contextKey\(c\)!==read\('fingerprint'\)/);assert.doesNotMatch(a,/read\('recipient/);assert.match(s,/to:\[to\]/);assert.match(s,/Idempotency-Key/);assert.match(s,/mode==='simulate'\)return result/);assert.match(s,/mode==='test'\?\[test!\]:original/);
});
test('Email: cron automatico richiede abilitazione esplicita, data di avvio e saldo non pagato',()=>{
 const s=read('app/api/cron/promemoria/route.ts');assert.match(s,/EMAIL_AUTOMATIC_NOTIFICATIONS==='true'&&currentMailMode\(\)==='live'/);assert.match(s,/EMAIL_NOTIFICATIONS_SINCE/);assert.match(s,/Number\(balance.residuo\)<=0/);assert.match(s,/result.accepted===1/);
});
test('Provider mock: simulazione zero richieste, collaudo solo casella controllata, live separato, HTTP 429 segnalato',async()=>{
 const toolsUrl='data:text/javascript;base64,'+Buffer.from(compiled).toString('base64');
 const source=read('lib/email-service.ts').replace("import 'server-only';",'').replaceAll("'./email-tools'",JSON.stringify(toolsUrl));
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const service=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const keys=['SESTO_EMAIL_MODE','SESTO_TEST_MODE','RESEND_API_KEY','EMAIL_FROM','EMAIL_TEST_RECIPIENT','EMAIL_REPLY_TO'];const prev=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const oldFetch=globalThis.fetch;const calls=[];let fail=false;
 try{
  Object.assign(process.env,{SESTO_TEST_MODE:'true',SESTO_EMAIL_MODE:'live',RESEND_API_KEY:'mock-key',EMAIL_FROM:'noreply@example.test',EMAIL_TEST_RECIPIENT:'qa@example.test'});delete process.env.EMAIL_REPLY_TO;
  globalThis.fetch=async(url,opts)=>{const body=JSON.parse(opts.body);calls.push({url,headers:opts.headers,body});return fail?new Response('{}',{status:429}):new Response(JSON.stringify({data:body.map((_,i)=>({id:String(i)}))}),{status:200});};
  const input={recipients:['one@example.test','two@example.test','ONE@example.test'],subject:'Lezione',body:'Domani',key:'test-key'};
  const simulation=await service.deliverMail(input);assert.equal(simulation.mode,'simulate');assert.equal(simulation.planned,2);assert.equal(calls.length,0);
  process.env.SESTO_EMAIL_MODE='test';const trial=await service.deliverMail(input);assert.equal(trial.accepted,1);assert.deepEqual(calls[0].body.map(x=>x.to),[['qa@example.test']]);assert.match(calls[0].body[0].subject,/COLLAUDO/);assert.doesNotMatch(JSON.stringify(calls[0].body),/one@example|two@example/);
  process.env.SESTO_TEST_MODE='false';process.env.SESTO_EMAIL_MODE='live';const live=await service.deliverMail(input);assert.equal(live.accepted,2);assert.deepEqual(calls[1].body.map(x=>x.to),[['one@example.test'],['two@example.test']]);assert.ok(calls[1].body.every(x=>!x.cc&&!x.bcc));assert.match(calls[1].headers['Idempotency-Key'],/test-key\/live/);
  fail=true;const error=await service.deliverMail(input);assert.equal(error.accepted,0);assert.match(error.error,/429/);
 }finally{globalThis.fetch=oldFetch;for(const k of keys){if(prev[k]===undefined)delete process.env[k];else process.env[k]=prev[k];}}
});
