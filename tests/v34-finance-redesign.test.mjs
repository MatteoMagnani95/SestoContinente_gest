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
const p=load('lib/payment-tools.ts'),f=load('lib/finance-ui.ts',{'./payment-tools':p});
test('Totali saldi in centesimi, posizioni saldate e residue',()=>{
 assert.deepEqual(f.balanceTotals([{importo_dovuto:'0.3',versato:'0.1',residuo:'0.2'},{importo_dovuto:'10.01',versato:'10.01',residuo:0}]),{due:10.31,paid:10.11,residue:0.2,settled:1,open:1});
 assert.deepEqual(f.movementTotals([{tipo:'entrata',importo:'0.1'},{tipo:'entrata',importo:'0.2'},{tipo:'uscita',importo:'0.3'}]),{entrate:0.3,uscite:0.3,saldo:0,count:3});
});
test('Rendiconto mostra 12 mesi, conserva valori e mesi vuoti',()=>{
 const rows=f.fillMonths(2026,[{mese:'2026-03',entrate:'123.45',uscite:10,saldo:113.45}]);
 assert.equal(rows.length,12);assert.equal(rows[2].entrate,'123.45');assert.equal(rows[1].entrate,0);assert.equal(rows[11].mese,'2026-12');
});
test('Filtri contabili con date reali, whitelist e ricerca neutralizzata',()=>{
 const s=f.movementFilter({dal:'2026-02-29',al:'2026-03-01',tipo:'bad',origine:'automatico',q:'%foo_'});
 assert.equal(s.dal,'');assert.equal(s.al,'2026-03-01');assert.equal(s.tipo,'');assert.equal(s.origine,'automatico');assert.equal(s.q,'foo');
});
test('Incassi: KPI su lettura completa, storico contestuale e riepilogo prima della conferma',()=>{
 const p=read('app/gestionale/incassi/page.tsx');assert.match(p,/balanceTotals\(aggregate.data/);assert.match(p,/tutteLePagine/);assert.match(p,/PaymentReview/);assert.match(p,/name="richiesta_id" value=\{randomUUID\(\)\}/);
 assert.match(read('app/gestionale/archivio-incassi/page.tsx'),/requireAdmin/);assert.match(read('app/gestionale/incassi/posizione/[id]/page.tsx'),/requireStaff/);
});
test('Movimenti automatici protetti; export applica i filtri e conserva protezione formule',()=>{
 const p=read('app/gestionale/moduli/contabilita/page.tsx');assert.match(p,/requireAdmin/);assert.match(p,/m.pagamento_id\?<Link/);assert.match(p,/movementTotals/);
 assert.match(read('app/module-actions.ts'),/if\(key==='contabilita'\)update=update.is\('pagamento_id',null\)/);
 const e=read('app/gestionale/esporta/[modulo]/route.ts');assert.match(e,/movementFilter/);assert.match(e,/filter.origine==='automatico'/);assert.match(e,/escapeCSV/);
});


test('F5: due tab effettive, filtri persistenti e azioni amministrative protette',()=>{
 const p=read('app/gestionale/incassi/page.tsx');assert.match(p,/aria-label="Tipologia incassi"/);assert.match(p,/aria-current=\{tab===key\?'page':undefined\}/);assert.match(p,/debito:key===tab\?debt:''/);assert.match(p,/name="tab" value=\{tab\}/);assert.match(p,/name="debito" value=\{debt\}/);assert.match(p,/admin===true\?<><ButtonLink href="\/gestionale\/archivio-incassi"/);assert.match(p,/className="sc-money"/);assert.match(p,/non un rendiconto completo/);assert.match(p,/name="conferma" required/);
});
