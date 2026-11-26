import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const actionSource=readFileSync(new URL('../app/organi-sociali/actions.ts',import.meta.url),'utf8');
const page=readFileSync(new URL('../app/organi-sociali/page.tsx',import.meta.url),'utf8');
const edit=readFileSync(new URL('../components/EditForm.tsx',import.meta.url),'utf8');
const validId='12345678-1234-4234-8234-123456789abc';

function harness(dbError=null,authorized=true){
 const inserts=[],revalidations=[];
 const exports={};
 const modules={
  '@/lib/security':{
   requireStaff:async()=>{
    if(!authorized)throw Error('Permessi negati');
    return {supabase:{
     from(table){
      assert.equal(table,'cda_componenti');
      return {insert:async row=>{inserts.push({...row});return {error:dbError};}};
     }
    }};
   }
  },
  'next/cache':{revalidatePath:path=>revalidations.push(path)},
  'next/navigation':{redirect:()=>{throw new Error('Unexpected redirect after save');}},
 };
 const js=ts.transpileModule(actionSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:name=>modules[name]??{},Date});
 return {save:exports.salvaComponente,inserts,revalidations};
}
function form(overrides={}){
 const f=new FormData();
 for(const [key,value] of Object.entries({persona_id:validId,carica:'Consigliere',dal:'2025-07-01',...overrides}))f.set(key,value);
 return f;
}
test('CdA: successful insert confirms without throwing a redirect and revalidates the list',async()=>{
 const h=harness();assert.equal(await h.save(form()),undefined);
 assert.deepEqual(h.inserts,[{persona_id:validId,carica:'Consigliere',dal:'2025-07-01',al:'2029-07-01'}]);
 assert.deepEqual(h.revalidations,['/organi-sociali']);
});
test('CdA: calendar date agrees with PostgreSQL at non-leap century',async()=>{
 const h=harness();assert.equal(await h.save(form({dal:'2096-02-29'})),undefined);
 assert.equal(h.inserts[0].al,'2100-02-28');
});
test('CdA: invalid input identifies the field and never inserts',async()=>{
 for(const [key,value] of [['persona_id',''],['carica',''],['dal','2025-02-29']]){
  const h=harness();assert.equal((await h.save(form({[key]:value}))).field,key);assert.equal(h.inserts.length,0);
 }
});
test('CdA: rejected insert stays in form and never revalidates',async()=>{
 const h=harness({code:'42501'});assert.match((await h.save(form())).error,/autorizzazioni/);assert.equal(h.revalidations.length,0);
});
test('CdA: form has explicit success destination and native select for short lists',()=>{
 assert.match(page,/successHref="\/organi-sociali\?tab=componenti&msg=componente_ok"/);
 assert.match(page,/persone\.length<=20\?<select id="board-person" name="persona_id" required/);
 assert.match(edit,/markFormSaved\(form\);\s*if\(successHref\)router\.replace\(successHref\)/);
});

test('CdA: authorization guard blocks writes before accessing the table',async()=>{
 const h=harness(null,false);await assert.rejects(h.save(form()),/Permessi negati/);assert.equal(h.inserts.length,0);
});
test('CdA: database errors are safe and never reported as success',async()=>{
 for(const [code,pattern] of [['23503',/socio/],['23505',/mandato/],['23P01',/mandato/],['23514',/durata/],['XX000',/non registrato/]]){
  const h=harness({code,message:'INTERNAL SECRET'});const failure=await h.save(form());
  assert.match(failure.error,pattern);assert.doesNotMatch(failure.error,/INTERNAL SECRET/);assert.equal(h.revalidations.length,0);
 }
});
test('CdA: empty archive and invalid native controls show actionable feedback',()=>{
 assert.match(page,/persone\.length===0&&<Alert/);
 assert.match(page,/persone\.length>0&&<Drawer/);
 assert.match(page,/showValidationErrors/);
 assert.match(edit,/onInvalid=\{\(\)=>\{if\(showValidationErrors\)setInvalid\(true\);\}\}/);
});
