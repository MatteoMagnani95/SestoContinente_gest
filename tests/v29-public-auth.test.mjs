import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,deps={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>deps[id]??require(id));return exports;
}
const input=load('lib/application-input.ts');
const form=(data)=>{const f=new FormData();for(const [k,v] of Object.entries(data))f.set(k,v);return f;};
const redirect=path=>{throw Error('redirect:'+path);};
test('Date reali, calendario italiano e compimento dei 18 anni',()=>{
 assert.equal(input.todayRome(new Date('2026-11-25T23:30:00Z')),'2026-11-26');
 for(const d of ['','2026-02-30','2026-13-01','1899-12-31','2026-11-27'])assert.equal(input.validBirthDate(d,'2026-11-26'),false,d);
 assert.equal(input.validBirthDate('2008-02-29','2026-11-26'),true);
 assert.equal(input.minorAge('2008-11-26','2026-11-26'),false);
 assert.equal(input.minorAge('2008-11-27','2026-11-26'),true);
 assert.equal(input.minorAge('2008-02-29','2026-02-28'),true);
 assert.equal(input.minorAge('2008-02-29','2026-03-01'),false);
});
test('Consenso checkbox: assenza non è consenso, legacy non trasformato in sì',()=>{
 assert.equal(input.imageChoice(form({immagini_checkbox:'1'})),'no');
 assert.equal(input.imageChoice(form({immagini_checkbox:'1',immagini:'si'})),'si');
 assert.equal(input.imageChoice(form({immagini_checkbox:'1',immagini:'invalid'})),'invalid');
 assert.equal(input.imageChoice(form({})),'');
 assert.equal(input.consentStatus(null),'Consenso storico non acquisito');
 assert.equal(input.consentStatus(false,false),'Consenso non prestato');
 assert.equal(input.consentStatus(false,true),'Consenso revocato');
 assert.equal(input.consentStatus(true,true),'Consenso acquisito');
 const c=read('components/SceltaImmagini.tsx');assert.match(c,/type="checkbox" name="immagini" value="si" defaultChecked=\{value===true\}/);assert.doesNotMatch(c,/type="radio"|required/);
});
function mock({auth={},legal={configured:true,testMode:false,statutoVersion:'1',privacyVersion:'1'},prior=null,user={id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'confirmed'},rpcError=null}={}){
 const calls=[];const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:prior,error:null})};
 const db={auth,from:()=>q,rpc:async(name,payload)=>{calls.push({name,payload});return {error:rpcError};}};
 const actions=load('app/actions.ts',{
  '@/lib/application-input':input,'@/lib/registrazione':{informativaRegistrazione:()=>({url:'https://example.test/privacy',versione:'1',test:false})},'@/lib/scelte':{versioneImmagini:'1'},'@/lib/codice-fiscale':{validaCF:()=>true},
  'next/navigation':{redirect},'next/cache':{revalidatePath:()=>{}},'@/lib/supabase/server':{createClient:async()=>db},'@/lib/security':{requireUser:async()=>({supabase:db,user})},
  '@/lib/application-config':{applicationLegalConfig:()=>legal,isTestApplication:r=>String(r.versione_privacy).startsWith('TEST-')},'@/lib/application-review':{},'@/lib/verifica-anagrafica':{}
 });return {actions,calls};
}
test('Registrazione: privacy obbligatoria e checkbox facoltativa negativa; password opaca',async()=>{
 const writes=[],m=mock({auth:{signUp:async v=>{writes.push(v);return {data:{session:null},error:null};}}});
 const old=process.env.NEXT_PUBLIC_SITE_URL;process.env.NEXT_PUBLIC_SITE_URL='https://example.test';
 try{
  const base={email:'USER@example.test',password:' password 123 ',confirm:' password 123 ',immagini_checkbox:'1'};
  assert.ok((await m.actions.registerAction(form(base))).error);assert.equal(writes.length,0);
  await assert.rejects(m.actions.registerAction(form({...base,presa_visione:'on'})),/redirect:\/registrati\?ok=verifica/);
  assert.equal(writes[0].password,base.password);assert.equal(writes[0].options.data.immagini,'no');
  await assert.rejects(m.actions.registerAction(form({...base,presa_visione:'on',immagini:'si'})),/redirect:\/registrati\?ok=verifica/);
  assert.equal(writes[1].options.data.immagini,'si');
 }finally{if(old===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=old;}
});
test('Login non verificato, recovery e resend senza confermare esistenza account',async()=>{
 const calls=[],m=mock({auth:{signInWithPassword:async()=>({error:{code:'email_not_confirmed'}}),resetPasswordForEmail:async(email,options)=>{calls.push({email,options});return {error:null};},resend:async data=>{calls.push(data);return {error:null};}}});
 assert.match((await m.actions.loginAction(form({email:'a@example.test',password:'x'}))).error,/Verifica prima/);
 const old=process.env.NEXT_PUBLIC_SITE_URL;process.env.NEXT_PUBLIC_SITE_URL='https://example.test';
 try{assert.match((await m.actions.recoverAction(form({email:'a@example.test'}))).notice,/Se l’account esiste/);
 assert.match((await m.actions.resendVerificationAction(form({email:'a@example.test'}))).notice,/Se l’account richiede/);
 assert.equal(calls[0].options.redirectTo,'https://example.test/auth/callback?next=%2Fnuova-password');assert.equal(calls[1].type,'signup');
 }finally{if(old===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=old;}
});
const base={nome:'Mario',cognome:'Rossi',data_nascita:'2000-01-01',luogo_nascita:'Roma',stato_nascita:'Italia',indirizzo:'Via di prova',cap:'00100',comune:'Roma',telefono:'123456789',flag_statuto:'on',flag_privacy:'on',immagini_checkbox:'1',intent:'invia'};
test('Adesione: minore richiede tutore, adulto non trasmette tutore residuo, consenso negativo ammesso',async()=>{
 const m=mock();
 assert.ok((await m.actions.saveApplicationAction(form({...base,data_nascita:'2020-01-01'}))).error);assert.equal(m.calls.length,0);
 assert.ok((await m.actions.saveApplicationAction(form({...base,data_nascita:'2020-01-01',nome_tutore:'Anna',cognome_tutore:'Rossi',parentela_tutore:'altro'}))).error);
 const ok=await m.actions.saveApplicationAction(form({...base,data_nascita:'2020-01-01',nome_tutore:'Anna',cognome_tutore:'Rossi',parentela_tutore:'Madre'}));
 assert.equal(ok.next,'/richiesta/stato?msg=inviata');assert.equal(m.calls[0].name,'salva_domanda_v19');assert.equal(m.calls[0].payload.p_flag_immagini,false);assert.equal(m.calls[0].payload.p_parentela_tutore,'Madre');
 await m.actions.saveApplicationAction(form({...base,nome_tutore:'Anna',cognome_tutore:'Rossi',parentela_tutore:'Madre',intent:'bozza'}));assert.equal(m.calls[1].payload.p_nome_tutore,'');assert.equal(m.calls[1].payload.p_invia,false);
});
test('Adesione: documenti mancanti, email non verificata e mode mismatch bloccano scrittura',async()=>{
 for(const m of [mock({legal:{configured:false,testMode:false}}),mock({user:{id:'x',email_confirmed_at:null}}),mock({prior:{versione_privacy:'TEST-COLLAUDO-1'}})]){
  assert.ok((await m.actions.saveApplicationAction(form(base))).error);assert.equal(m.calls.length,0);
 }
 const m=mock({rpcError:{code:'23514'}});assert.ok((await m.actions.saveApplicationAction(form(base))).error);assert.equal(m.calls.length,1);
});
test('UI: riepilogo prima dell’invio, bozze separate e aree autorizzate',()=>{
 const s=read('components/ApplicationForm.tsx');assert.match(s,/if\(draft\)\{await persist/);assert.match(s,/setReview\(data\)/);assert.match(s,/Conferma e invia alla segreteria/);assert.match(s,/markFormSaved\(form\)/);assert.match(s,/disabled=\{!minor\}/);
 const home=read('app/page.tsx');assert.match(home,/!access\.signedIn\?/);for(const role of ['personal','staff','instructor'])assert.match(home,new RegExp('access\\.'+role+'&&'));
 for(const path of ['app/accedi/page.tsx','app/registrati/page.tsx'])assert.match(read(path),/if\(access\.enabled\)redirect\('\/smista'\)/);
 assert.match(read('components/PasswordField.tsx'),/visible\?'text':'password'/);assert.match(read('components/AuthForm.tsx'),/busy\.current/);
});

test('Versione documenti: la nuova UI non accetta silenziosamente documenti aggiornati',async()=>{
 const m=mock();
 assert.match((await m.actions.saveApplicationAction(form({...base,statuto_versione_vista:'vecchia',privacy_versione_vista:'1'}))).error,/aggiornati/);
 assert.equal(m.calls.length,0);
 const ok=await m.actions.saveApplicationAction(form({...base,statuto_versione_vista:'1',privacy_versione_vista:'1'}));
 assert.equal(ok.next,'/richiesta/stato?msg=inviata');
 assert.match(read('app/richiesta/nuova/page.tsx'),/request\.versione_statuto===legal\.statutoVersion&&request\.flag_statuto/);
});
test('Revoca: checkbox deselezionata usa la RPC esistente e conserva la versione',async()=>{
 const calls=[];const m=load('app/area-personale/profilo/immagini.ts',{
  '@/lib/application-input':input,'@/lib/scelte':{versioneImmagini:'Foto e video · 1'},'@/lib/application-config':{applicationLegalConfig:()=>({testMode:false})},
  '@/lib/security':{requireUser:async()=>({user:{id:'x'},supabase:{rpc:async(name,payload)=>{calls.push({name,payload});return {error:null};}}})},'next/cache':{revalidatePath:()=>{}}
 });
 await m.cambiaScelta(form({immagini_checkbox:'1'}));
 assert.deepEqual(calls,[{name:'scegli_immagini',payload:{p_scelta:false,p_versione:'Foto e video · 1'}}]);
});
