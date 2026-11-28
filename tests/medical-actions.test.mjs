import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const source=readFileSync(new URL('../app/gestionale/moduli/[modulo]/certificate-actions.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const persona='33333333-3333-4333-8333-333333333333',doc='44444444-4444-4444-8444-444444444444';
function setup({staff=true,active=true,member=true,course=false,document=false,linked=true,stale=false,readError=false,duplicate=false,writeError=false}={}){
 const calls=[],writes=[],updates=[];
 const answers={stagioni:{data:active?[{id:'season'}]:[]},schede_soci:{data:member?[{adesione_id:'membership'}]:[]},iscrizioni_corsi:{data:course?[{id:'course'}]:[]},stato_certificati:{data:document?[{id:'cert'}]:[],error:readError?{message:'test'}:null},certificati_medici:{data:stale?null:{id:persona}},collegamenti_persone:{data:linked?[{utente_id:'account'},{utente_id:'account'}]:[]},notifiche:{data:duplicate?[]:[{id:'notice'}],error:writeError?{message:'test'}:null}};
 const db={from(table){
  calls.push(table);const q={};for(const op of ['select','eq','in','not','is','limit','maybeSingle'])q[op]=(...args)=>{calls.push([table,op,...args]);return q;};
  q.update=(values)=>{updates.push(values);return q;};
  q.upsert=(values,options)=>{writes.push({values,options});return q;};
  q.then=(resolve,reject)=>Promise.resolve(answers[table]??{data:[],error:null}).then(resolve,reject);
  return q;
 }};
 const modules={'@/lib/security':{requireStaff:async()=>{if(!staff)throw Error('denied');return {supabase:db};}},'@/lib/supabase/admin':{createAuthAdmin:()=>db},'next/cache':{revalidatePath:()=>{}}};
 const exports={};new Function('exports','require',code)(exports,id=>modules[id]??require(id));
 return {...exports,calls,writes,updates};
}
test('Non staff non può modificare esiti né inviare solleciti',async()=>{
 const x=setup({staff:false});
 await assert.rejects(x.cambiaEsitoCertificato(persona,doc,'in_attesa','valido'),/denied/);
 await assert.rejects(x.sollecitaCertificatoMancante(persona),/denied/);
 assert.equal(x.calls.length,0);
});
test('Esito inline: aggiornamento parziale con documento e valore precedente',async()=>{
 const x=setup();assert.equal((await x.cambiaEsitoCertificato(persona,doc,'in_attesa','valido')).message,'Esito salvato.');
 assert.deepEqual(x.updates,[{esito_verifica:'valido'}]);
 assert.ok(x.calls.some(c=>Array.isArray(c)&&c[1]==='eq'&&c[2]==='documento_id'&&c[3]===doc));
 assert.ok(x.calls.some(c=>Array.isArray(c)&&c[1]==='eq'&&c[2]==='esito_verifica'&&c[3]==='in_attesa'));
});
test('Esito inline: documento mancante, esito contraffatto e concorrenza',async()=>{
 const x=setup({stale:true});
 assert.ok((await x.cambiaEsitoCertificato(persona,'','in_attesa','valido')).error);
 assert.ok((await x.cambiaEsitoCertificato(persona,doc,'in_attesa','scaduto')).error);
 assert.equal(x.updates.length,0);
 assert.ok((await x.cambiaEsitoCertificato(persona,doc,'in_attesa','valido')).error);
});
for(const [label,options] of Object.entries({'stagione assente':{active:false},'persona storica':{member:false,course:false},'documento presente':{document:true},'lettura fallita':{readError:true},'nessun account':{linked:false}})){
 test('Sollecito bloccato: '+label,async()=>{const x=setup(options);assert.ok((await x.sollecitaCertificatoMancante(persona)).error);assert.equal(x.writes.length,0);});
}
test('Sollecito a socio o allievo: destinatari server, messaggio generico e chiave unica',async()=>{
 for(const options of [{member:true,course:false},{member:false,course:true}]){
  const x=setup(options);assert.match((await x.sollecitaCertificatoMancante(persona)).message,/registrata/);
  assert.equal(x.writes.length,1);const w=x.writes[0];assert.equal(w.values.length,1);
  assert.equal(w.values[0].utente_id,'account');assert.equal(w.values[0].tipo,'sollecito_certificato');
  assert.match(w.values[0].riferimento,new RegExp('^'+persona+':\\d{4}-\\d{2}-\\d{2}$'));
  assert.doesNotMatch(w.values[0].messaggio,/certificato|diagnosi|scadenza/i);
  assert.deepEqual(w.options,{onConflict:'utente_id,tipo,riferimento',ignoreDuplicates:true});
 }
});
test('Sollecito duplicato e fallimento di scrittura gestiti distintamente',async()=>{
 const x=setup({duplicate:true});assert.match((await x.sollecitaCertificatoMancante(persona)).message,/già registrato/);
 const y=setup({writeError:true});assert.ok((await y.sollecitaCertificatoMancante(persona)).error);
});
test('Il cron non invia per email i solleciti interni',()=>{
 const cron=readFileSync(new URL('../app/api/cron/promemoria/route.ts',import.meta.url),'utf8');
 assert.match(cron,/\.neq\('tipo','sollecito_certificato'\)/);
});
