import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(p,'utf8');
const exports={};new Function('exports','require',ts.transpileModule(read('lib/secretariat.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,require);
test('F3: nomi e CF sono solo presentazione, nessun dato inventato',()=>{
 assert.equal(exports.displayName('ROSSI'),'Rossi');assert.equal(exports.displayName('De Luca'),'De Luca');assert.equal(exports.personInitials('Roberta','Magnani'),'RM');assert.equal(exports.maskedFiscalCode('RSSMRA00A00A000A'),'•••• 000A');assert.equal(exports.maskedFiscalCode(null),'Non acquisito');
 assert.equal(exports.secretariatLinks.length,7);assert.equal(exports.memberTabs.filter(([k])=>exports.isSecondaryMemberTab(k)).length,6);
 assert.equal(exports.memberTabs.filter(([k])=>!exports.isSecondaryMemberTab(k)).length,7);
});
test('F3: ordine dashboard e azioni operative reali, 5+4 KPI e Nereia',()=>{
 const s=read('app/gestionale/page.tsx');
 assert.ok(s.indexOf('sc-dashboard-shortcuts')<s.indexOf('sc-dashboard-priorities'));assert.ok(s.indexOf('sc-dashboard-priorities')<s.indexOf('sc-dashboard-summary'));assert.ok(s.indexOf('sc-dashboard-summary')<s.indexOf('sc-dashboard-grid'));assert.ok(s.indexOf('sc-dashboard-grid')<s.indexOf('<NereiaProject/>'));
 assert.equal((s.match(/<QuickActionLink area=/g)||[]).length,4);
 assert.match(s,/anagrafiche\?nuovo=1/);assert.match(s,/gestione-eventi\?nuovo=1/);assert.match(read('app/gestione-eventi/page.tsx'),/initialOpen=\{s.nuovo==='1'&&!s.msg\}/);
 assert.match(s,/admin\.data&&/);
});
test('F3: elenco soci conserva paginazione, filtri CF e scope stagione, conteggi esatti',()=>{
 const s=read('app/gestionale/soci/page.tsx');assert.match(s,/codice_fiscale\.ilike/);assert.match(s,/base\(true\)\.eq\('stato',s\)/);assert.match(s,/maskedFiscalCode\(row.codice_fiscale\)/);assert.match(s,/chosen==='tutte'&&<td/);assert.match(s,/requireStaff\(\)/);
});
test('F3: tab socio complete, letture selettive e riepiloghi non inventati',()=>{
 const s=read('app/gestionale/soci/[id]/page.tsx');assert.match(s,/sc-member-more/);assert.match(s,/isSecondaryMemberTab/);assert.match(s,/exactCount\(cardResult\)/);assert.match(s,/exactCount\(patentResult\)/);assert.match(s,/tab==='famiglia'\)\?supabase\.from\('relazioni_tutori'\)/);assert.match(s,/tab==='pagamenti'\)\?supabase\.from\('pagamenti'\)/);assert.match(s,/prefetch=\{false\}/);
 for(const [k] of exports.memberTabs)assert.ok(s.includes("tab==='"+k+"'"),k);
});
test('F3: anagrafica mantiene gruppi, obbligatorietà originaria e assistenza fiscale',()=>{
 const s=read('app/gestionale/moduli/[modulo]/page.tsx');
 for(const k of ['Dati personali','Residenza e recapiti','Dati fiscali','Verifiche particolari'])assert.ok(s.includes(k));
 assert.match(s,/required:field.required\?\?false/);assert.match(s,/<CodiceFiscaleAssist\/>/);assert.match(s,/!fields.some\(f=>f.required\)/);assert.match(s,/action=\{saveModuleRecord\}/);assert.match(read('components/EditForm.tsx'),/instanceof HTMLDetailsElement\)el.open=true/);
});
