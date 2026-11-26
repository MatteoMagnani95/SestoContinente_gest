import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,imports={}){
 const src=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>Object.hasOwn(imports,id)?imports[id]:require(id));return exports;
}
test('Filtri singoli: scarta duplicati e conserva parametri scalari',()=>{
 const ui=load('lib/module-ui.ts');
 assert.deepEqual(ui.singleSearchParams({q:['uno','due'],p:'4',stato:undefined,ordine:'asc'}),{p:'4',ordine:'asc'});
 assert.equal(ui.cleanSearch(['A','B']),'');
 assert.equal(ui.pageNumber(['2','3']),1);
 assert.equal(ui.pageNumber('3abc'),1);
 assert.equal(ui.pageNumber('999999999'),100000);
});
test('Letture paginate: pagina vuota valida, errori e risposte mancanti non producono totali parziali',async()=>{
 const {tutteLePagine}=load('lib/pagine.ts');
 const first=Array.from({length:500},(_,id)=>({id}));
 const ok=await tutteLePagine(async da=>({data:da===0?first:[],error:null}));
 assert.equal(ok.data.length,500);assert.equal(ok.error,null);
 for(const fault of [async()=>({data:null,error:null}),async()=>({data:null,error:{code:'NETWORK'}}),async()=>{throw Error('NETWORK');},async()=>{throw false;}]){
  const failed=await tutteLePagine(async da=>da===0?{data:first,error:null}:fault());
  assert.equal(failed.data,null);assert.ok(failed.error);
 }
 assert.deepEqual(await tutteLePagine(async()=>({data:[],error:null})),{data:[],error:null});
});
test('Paginazione: recupera pagina inesistente e preserva filtri',()=>{
 const Link=({children,href,...rest})=>h('a',{href,...rest},children);
 const {Pagination}=load('components/ui/DataTable.tsx',{'next/link':{default:Link},'./Primitives':{}});
 const markup=(page,count)=>renderToStaticMarkup(h(Pagination,{page,count,size:25,href:p=>'?q=Rossi&p='+p}));
 const stale=markup(9999,60);
 assert.match(stale,/Prima pagina/);assert.match(stale,/Ultima pagina disponibile/);assert.match(stale,/p=3/);assert.doesNotMatch(stale,/p=9998/);
 assert.match(markup(7,null),/Prima pagina/);
 assert.match(markup(2,60),/Precedente/);assert.match(markup(2,60),/Successiva/);
});
test('Messaggi URL: solo chiavi proprie e stringhe',()=>{
 const {queryMessage}=load('lib/security.ts',{'next/navigation':{},'@/lib/supabase/server':{}});
 for(const value of ['__proto__','constructor','toString',['account'],undefined])assert.equal(queryMessage(value),'');
 assert.match(queryMessage('account'),/Accedi/);
});

test('Date visualizzate nel fuso italiano anche in prossimità della mezzanotte',()=>{
 const {formatDate}=load('lib/security.ts',{'next/navigation':{},'@/lib/supabase/server':{}});
 assert.equal(formatDate('2026-11-26T23:30:00Z'),'27/11/2026');
 assert.equal(formatDate('2026-07-01T22:30:00Z'),'02/07/2026');
 assert.equal(formatDate('2026-11-26'),'26/11/2026');
 assert.equal(formatDate('2026-02-30'),'—');
 assert.equal(formatDate('invalid'),'—');
});
