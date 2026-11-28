import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=ts.transpileModule(read('lib/medical-roster.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const exports={};new Function('exports','require',js)(exports,require);
const {selectMedicalRoster,medicalDates}=exports;
const person=(id)=>({id,nome:'Nome',cognome:id});
const cert=(id,person,doc,state,expiry,created)=>({id,persona_id:person,documento_id:doc,stato_certificato:state,scade_il:expiry,creato_il:created});
test('Una riga per persona, inclusi iscritti senza certificato',()=>{
 const rows=selectMedicalRoster([person('a'),person('b'),person('c')],[
  cert('1','a','doc','valido','2026-12-28','2026-10-01'),cert('2','a',null,'mancante','2027-01-01','2026-11-01'),
  cert('3','b','doc','valido','2026-12-29','2026-11-01')
 ],'2026-11-28','2026-12-28');
 assert.equal(rows.length,3);assert.equal(rows[0].id,'1');assert.equal(rows[0].stato_certificato,'in_scadenza');
 assert.equal(rows[1].stato_certificato,'valido');assert.equal(rows[2].stato_certificato,'mancante');assert.equal(rows[2].senza_registrazione,true);
});
test('Il documento più recente prevale e l’esito non viene riscritto',()=>{
 const rows=selectMedicalRoster([person('a')],[cert('1','a','old','valido','2027-01-01','2026-10-01'),cert('2','a','new','in_attesa','2026-12-01','2026-11-01')],'2026-11-28','2026-12-28');
 assert.equal(rows[0].id,'2');assert.equal(rows[0].stato_certificato,'in_attesa');
});
test('Le scadenze usano la data italiana e trenta giorni di calendario',()=>{
 assert.deepEqual(medicalDates(new Date('2026-11-27T23:30:00Z')),{today:'2026-11-28',limit:'2026-12-28'});
});
test('Sollecito autorizzato, deduplicato e senza destinatari client; aggiornamento parziale con controllo concorrenza',()=>{
 const source=read('app/gestionale/moduli/[modulo]/certificate-actions.ts');
 assert.match(source,/await requireStaff\(\)/);
 assert.match(source,/onConflict:'utente_id,tipo,riferimento',ignoreDuplicates:true/);
 assert.match(source,/\.eq\('documento_id',documento\)/);
 assert.match(source,/update\(\{esito_verifica:esito\}\)/);
 assert.match(source,/collegamenti_persone/);
});
