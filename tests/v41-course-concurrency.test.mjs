import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
function load(path,dependencies={}){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
const edition='00000000-0000-4000-8000-000000000001', rowId='00000000-0000-4000-8000-000000000002', person='00000000-0000-4000-8000-000000000003', other='00000000-0000-4000-8000-000000000004';
function setup({state='iscritto',responsible=person,writeError=null}={}){
 const writes=[];
 const supabase={rpc:async(name,payload)=>{writes.push({name,payload});return {error:writeError};},from(table){
  let write=null,filters=[];
  const data=table==='edizioni_corsi'?{stato:'attivo',stagione_id:edition}:table==='iscrizioni_corsi'?{persona_id:person,stato:state}:table==='assegnazioni_istruttori'?{id:rowId,persona_id:responsible}:null;
  const query={select:()=>query,eq:(key,value)=>{filters.push([key,value]);return query;},maybeSingle:async()=>({data}),limit:async()=>({data:[{id:rowId}]}),update:values=>{write=values;return query;},single:async()=>{writes.push({table,write,filters});return {data:writeError?null:{id:rowId},error:writeError};}};
  return query;
 }};
 const actions=load('app/gestionale/corsi/actions.ts',{
  '@/lib/pagine':{},'@/lib/calendar-tools':{},'@/lib/course-ui':{},'@/lib/course-errors':{},
  'next/navigation':{redirect:href=>{throw Error('REDIRECT '+href);}},
  'next/cache':{revalidatePath:()=>{}},
  '@/lib/security':{requireStaff:async()=>({supabase})},
  '@/lib/course-tools':load('lib/course-tools.ts')
 });
 return {actions,writes};
}
function form(values){const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,v);return f;}
test('Iscrizione: scheda obsoleta non sovrascrive una modifica altrui',async()=>{
 const {actions,writes}=setup({state:'concluso'});
 const result=await actions.updateEnrollment(form({edizione_id:edition,iscrizione_id:rowId,stato_atteso:'iscritto',stato:'ritirato'}));
 assert.match(result.error,/cambiato/);assert.equal(writes.length,0);
});
test('Iscrizione: condizione SQL sullo stato atteso anche dopo la rilettura',async()=>{
 const {actions,writes}=setup({writeError:{code:'PGRST116'}});
 const result=await actions.updateEnrollment(form({edizione_id:edition,iscrizione_id:rowId,stato_atteso:'iscritto',stato:'ritirato'}));
 assert.match(result.error,/concorrenti/);
 assert.deepEqual(writes[0].write,{stato:'ritirato'});assert.ok(writes[0].filters.some(([k,v])=>k==='stato'&&v==='iscritto'));
});
test('Direttore e responsabile: conferma, riferimenti attesi, unica RPC atomica',async()=>{
 const input={edizione_id:edition,persona_id:other,responsabile_atteso:person,direttore_atteso:person};
 const incomplete=setup();assert.match((await incomplete.actions.replaceResponsible(form(input))).error,/Conferma/);
 assert.equal(incomplete.writes.length,0);
 const stale=setup({writeError:{code:'P3511'}});
 assert.match((await stale.actions.replaceResponsible(form({...input,conferma_allineamento:'on'}))).error,/cambiato/);
 assert.deepEqual(stale.writes,[{name:'allinea_direttore_responsabile',payload:{p_edizione:edition,p_persona:other,p_direttore_atteso:person,p_responsabile_atteso:person}}]);
 const fresh=setup();await assert.rejects(fresh.actions.replaceResponsible(form({...input,conferma_allineamento:'on'})),/REDIRECT/);
 assert.equal(fresh.writes.length,1);
});
