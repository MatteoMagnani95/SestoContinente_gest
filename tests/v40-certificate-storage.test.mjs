import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const courseTools={};
new Function('exports','require',ts.transpileModule(readFileSync(new URL('../lib/course-tools.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(courseTools,require);
const fixedToday=()=>courseTools.todayRome(new Date('2026-11-26T12:00:00Z'));
const person='00000000-0000-4000-8000-000000000001',account='00000000-0000-4000-8000-000000000002',doc='00000000-0000-4000-8000-000000000003';
const staged=account+'/transito/00000000-0000-4000-8000-000000000004.pdf';
const file=new Blob(['%PDF-test'],{type:'application/pdf'});
function setup({stored=null,registerError=null,linked=null}={}){
 const calls=[];
 const query={insert:()=>query,select:()=>query,eq:()=>query,single:async()=>({data:{id:doc}}),maybeSingle:async()=>({data:linked})};
 const supabase={from:()=>query,rpc:async(name)=>{
  calls.push(name);
  if(name==='owns_person')return {data:true};
  if(name==='registra_certificato_personale')return {error:registerError};
  return {data:false};
 }};
 const storage={
  download:async(path)=>{calls.push('download:'+path);return path===staged?{data:file}:stored?{data:stored}:{error:{message:'unconfirmed'}};},
  upload:async()=>({error:{message:'network'}}),
  remove:async(paths)=>{calls.push('remove:'+paths[0]);return {error:null};}
 };
 const deps={'next/cache':{revalidatePath:()=>{}},'@/lib/supabase/admin':{createAuthAdmin:()=>({storage:{from:()=>storage}})},'@/lib/security':{requireUser:async()=>({supabase,user:{id:account}})},'@/lib/course-tools':{...courseTools,todayRome:fixedToday},'@/lib/file-certificato':{certificatoAmmesso:()=>true,tipoCertificato:()=> 'pdf'}};
 const code=ts.transpileModule(readFileSync(new URL('../app/area-personale/certificato/actions.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports','require',code)(exports,id=>deps[id]??require(id));
 const form=new FormData();for(const [k,v] of Object.entries({persona_id:person,rilasciato_il:'2026-11-01',scade_il:'2027-11-01',transito:staged}))form.set(k,v);
 return {calls,form,upload:exports.caricaCertificato};
}
test('Certificato: errore storage con file identico confermato completa una sola registrazione',async()=>{
 const {calls,form,upload}=setup({stored:file});
 assert.deepEqual(await upload(form),{error:null});
 assert.equal(calls.filter(x=>x==='registra_certificato_personale').length,1);
 assert.ok(calls.indexOf('remove:'+staged)>calls.indexOf('registra_certificato_personale'));
});
test('Certificato: oggetto non verificabile conserva transito e metadata e non registra',async()=>{
 const {calls,form,upload}=setup();
 assert.match((await upload(form)).error,/da verificare/);
 assert.ok(!calls.includes('registra_certificato_personale'));
 assert.ok(!calls.includes('annulla_upload_documento'));
 assert.ok(!calls.some(x=>x.startsWith('remove:')));
});
test('Certificato: errore RPC dopo commit confermato conserva file definitivo',async()=>{
 const {calls,form,upload}=setup({stored:file,registerError:{code:'NETWORK'},linked:{id:doc}});
 assert.deepEqual(await upload(form),{error:null});
 assert.deepEqual(calls.filter(x=>x.startsWith('remove:')),['remove:'+staged]);
});

test('Certificato: data impossibile o futura non consuma il file in transito',async()=>{
 for(const day of ['2026-02-31','0000-01-01','2026-11-27']){
  const {calls,form,upload}=setup({stored:file});form.set('rilasciato_il',day);
  assert.match((await upload(form)).error,/Controlla data/);
  assert.ok(!calls.some(x=>x.startsWith('download:')||x.startsWith('remove:')||x==='registra_certificato_personale'));
 }
});
