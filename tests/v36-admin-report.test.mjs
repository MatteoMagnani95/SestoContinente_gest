import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,dependencies={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
const a=load('lib/admin-accounts.ts'),u=load('lib/account-ui.ts',{'./admin-accounts':a});
const shiftDay=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const report=load('lib/report-ui.ts',{'./calendar-tools':{shiftDay},'./finance-ui':{dateFilter:v=>/^\d{4}-\d{2}-\d{2}$/.test(v??'')?v:'',cents:v=>BigInt(Math.round(Number(v)*100))}});
test('Account: una domanda con nome non implica collegamento anagrafico; più persone per account',()=>{
 const rows=[{id:'a',nome:'Ada',cognome:'Rossi',email:'a@example.invalid',ruoli:[],confermato_il:null},{id:'b',nome:'B',ruoli:['tutore'],confermato_il:'2026-01-01'}];
 const links=[{utente_id:'b',persona_id:'p1'},{utente_id:'b',persona_id:'p2'}];
 assert.equal(u.accountSummary(rows,links).unlinked,1);assert.equal(u.accountSummary(rows,links).noRole,1);assert.deepEqual(u.filterAccounts(rows,links,'','nessuno','','no').map(a=>a.id),['a']);
 assert.equal(u.dependencyLabel('cda_verbali','cda_verbali_creato_da_fkey'),'Verbali collegati');
});
test('Report: scaduto, futuro, attività senza termine e residuo complessivo sono distinti',()=>{
 const p=report.reportPeriod('2026-11-26','30');assert.equal(p.to,'2026-12-26');
 const t={kind:'deadline',date:'2026-11-25'};
 assert.equal(report.inPeriod(t,p),false);assert.equal(report.inPeriod(t,report.reportPeriod(p.today,'scadute')),true);
 assert.equal(report.inPeriod({...t,kind:'open'},p),true);assert.equal(report.inPeriod({...t,kind:'open'},report.reportPeriod(p.today,'scadute')),false);
 const d=report.debtSummary([{residuo:10,scadenza:'2026-11-25'},{residuo:20,scadenza:'2026-12-03'},{residuo:30,scadenza:'2027-01-01'},{residuo:40,scadenza:null}],p);
 assert.deepEqual(d,{open:4,overdue:1,due:1,residue:100});assert.equal(report.periodValid(report.reportPeriod(p.today,'personalizzato','2026-12-03','2026-11-25')),false);
});
test('Flussi amministrativi: guardie, conferme e nessun limite silenzioso di 80 revisioni',()=>{
 const actions=read('app/gestionale/utenti/actions.ts'),page=read('app/gestionale/utenti/page.tsx'),importAction=read('app/gestionale/importazione/actions.ts');
 assert.match(page,/requireAdmin\(\)/);assert.match(page,/p_offset:offset,p_limit:100/);assert.match(actions,/grantRole\(form:FormData\)[\s\S]*form\.get\('conferma'\)!=='on'/);assert.match(importAction,/commitImport\(form:FormData\)[\s\S]*form\.get\('conferma'\)!=='on'/);assert.doesNotMatch(read('app/gestionale/report/page.tsx'),/\.limit\(80\)/);
});
