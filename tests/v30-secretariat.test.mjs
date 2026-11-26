import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,dependencies={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
const h=load('lib/secretariat.ts');
test('Conteggio esatto: zero reale distinto da errore o valore sconosciuto',()=>{
 assert.equal(h.exactCount({count:0,error:null}),0);
 assert.equal(h.exactCount({count:10001,error:null}),10001);
 assert.equal(h.exactCount({count:7,error:{}}),'—');
 assert.equal(h.exactCount({count:null,error:null}),'—');
});
test('Ricerca nominativo e riferimento: UUID intero o prefisso mostrato, niente sintassi PostgREST iniettata',()=>{
 assert.deepEqual(h.uuidReference('#ABCDEF12'),{from:'abcdef12-0000-0000-0000-000000000000',to:'abcdef12-ffff-ffff-ffff-ffffffffffff'});
 assert.equal(h.uuidReference('abcdef12-1234-1234-1234-123456789abc').to,'abcdef12-1234-1234-1234-123456789abc');
 assert.equal(h.uuidReference('x,or(id.eq.1)'),null);
 assert.deepEqual(h.searchTerms('Rossi Mario'),['Rossi','Mario']);
 assert.deepEqual(h.searchTerms('D’Angelo (Mario),%_'),['D','Angelo','Mario']);
 assert.equal(h.dateFilter('2026-02-30'),'');assert.equal(h.dateFilter('2026-11-26'),'2026-11-26');assert.equal(h.dateFilter('9999-12-31'),'');
});
test('Tredici vere viste della scheda e whitelist dei rientri contestuali',()=>{
 assert.equal(h.memberTabs.length,13);
 assert.equal(h.memberTab('tesseramenti'),'tesseramenti');assert.equal(h.memberTab('https://evil.example'),'panoramica');
 assert.equal(h.memberTabForModule('iscrizioni'),'corsi');assert.equal(h.memberTabForModule('__proto__'),undefined);
 const s=read('app/gestionale/soci/[id]/page.tsx');for(const [tab] of h.memberTabs)assert.match(s,new RegExp("tab==='"+tab+"'"));
 assert.match(s,/aria-current=\{tab===key\?'page':undefined\}/);
 assert.match(s,/tutteLePagine\(\(da,a\)=>supabase\.from\('saldi_quote'\)/);assert.match(s,/tutteLePagine\(\(da,a\)=>supabase\.from\('saldi_corsi'\)/);
 assert.match(s,/balanceError\?null:balances\.reduce/);assert.match(s,/exactCount\(enrollmentResult\)/);assert.match(s,/eq\('adesioni\.persona_id',id\)/);
 assert.match(s,/La scelta dell’account non certifica un consenso individuale/);
});
test('Dashboard: conteggi, stagione e destinazioni operative coerenti',()=>{
 const s=read('app/gestionale/page.tsx');
 assert.match(s,/eq\('stagione_id',season\.id\)\.eq\('stato','attiva'\)/);
 assert.match(s,/eq\('stagione_id',season\.id\)\.gt\('residuo',0\)/);
 assert.match(s,/eq\('stato_certificato','valido'\)\.gte\('scade_il',today\)\.lte\('scade_il',cutoff\)/);
 assert.match(s,/filtro=da_gestire/);assert.match(s,/vista=elenco&filtro_modulo=stato%3Aiscritto/);assert.match(s,/stato=residuo/);
 assert.match(read('app/gestionale/incassi/page.tsx'),/if\(status==='residuo'\)query=query\.gt\('residuo',0\)/);
 assert.match(read('app/gestione-eventi/page.tsx'),/if\(periodo==='prossimi'\)query=query\.gte\('dal',from\)\.neq\('stato','annullato'\)/);
 assert.match(read('app/gestionale/moduli/iscrizioni/page.tsx'),/if\(p\.vista==='elenco'\|\|p\.nuovo==='1'/);assert.match(read('app/gestionale/moduli/iscrizioni/page.tsx'),/return <Courses/);
});
test('Domande: filtri lato server, riferimento, conteggi per stato, storico e azioni non distruttive',()=>{
 const s=read('app/gestionale/richieste/page.tsx');
 assert.match(s,/query\.gte\('id',reference\.from\)\.lte\('id',reference\.to\)/);
 assert.match(s,/query\.in\('stato',\[\.\.\.pendingRequestStates\]\)/);assert.match(s,/requestStates\.map\(s=>base\(true\)\.eq\('stato',s\)\)/);
 assert.match(s,/asRomeISO\(shiftDay\(al,1\)\+'T00:00'\)/);
 const detail=read('app/gestionale/richieste/[id]/page.tsx');assert.match(detail,/r\.stato!=='approvata'&&<section/);assert.match(detail,/ApplicationReviewForm/);assert.match(detail,/eq\('richiesta_id',r\.id\).*\.range\(/);
 assert.doesNotMatch(detail,/codice_catastale/);assert.match(detail,/documentQuery\.is\('persona_id',null\)/);
});
test('Certificati: stati non sovrapposti, pagine indipendenti e scope persona',()=>{
 const s=read('app/gestionale/moduli/[modulo]/page.tsx');
 assert.match(s,/stato==='in_scadenza'\)query=query\.gte\('scade_il',today\)\.lte\('scade_il',shiftDay\(today,30\)\)/);
 assert.match(s,/stato==='valido'\)query=query\.gt\('scade_il',shiftDay\(today,30\)\)/);
 assert.match(s,/missingPage-1\)\*perPage/);assert.match(s,/label="allievi"/);
 assert.match(s,/personId&&personField\)query=query\.eq\('persona_id',personId\)/);
 assert.match(read('app/module-actions.ts'),/uuid\.test\(returnPerson\)&&changes\.persona_id===returnPerson/);
});
