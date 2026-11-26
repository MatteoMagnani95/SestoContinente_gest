import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(p,'utf8');
const js=ts.transpileModule(read('lib/course-ui.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const api={};new Function('exports',js)(api);
const {canListCourseStudent:canList}=api;
test('istruttori esclusi di default; deroga non supera incompatibilità della stessa edizione',()=>{
 assert.equal(canList({}),true);
 assert.equal(canList({isInstructor:true}),false);
 assert.equal(canList({isInstructor:true},true),true);
 for(const incompatibility of [{isDirector:true},{assignedToEdition:true},{alreadyEnrolled:true}]){
  assert.equal(canList(incompatibility),false);
  assert.equal(canList({...incompatibility,isInstructor:true},true),false);
 }
});
test('selettori condividono regola e motivazione',()=>{
 for(const path of ['components/CourseStudentPicker.tsx','components/EligibleEnrollmentSelect.tsx']){
  const s=read(path);
  assert.match(s,/canListCourseStudent\(/);
  assert.match(s,/name="deroga_istruttore"/);
  assert.match(s,/name="deroga_motivo"/);
  assert.match(s,/useState\(false\)/);
 }
});
test('riepilogo staff da assegnazioni reali',()=>{
 const list=read('app/gestionale/corsi/page.tsx'),detail=read('app/gestionale/corsi/[id]/page.tsx');
 assert.match(list,/gest_elenco_assegnazioni_istruttori/);
 assert.match(list,/staffNames\(e.id,'responsabile'\)/);
 assert.match(list,/staffNames\(e.id,'aiuto'\)/);
 assert.match(detail,/Staff didattico/);
 assert.match(detail,/derogheByEnrollment/);
 assert.match(detail,/authorizeInstructorEnrollment/);
});
test('migrazione: audit, RLS, RPC e vincoli reciproci',()=>{
 const sql=read('supabase/migrations/20261126213000_deroga_istruttori_corsi.sql');
 assert.match(sql,/enable row level security/i);
 assert.match(sql,/grant insert \(iscrizione_id,motivo\)/i);
 assert.match(sql,/deferrable initially deferred/i);
 assert.match(sql,/verifica_deroga_allievo_trigger/);
 assert.match(sql,/verifica_istruttore_non_allievo_trigger/);
 assert.match(sql,/security invoker/i);
 assert.match(sql,/P3520/);assert.match(sql,/P3521/);
 for(const path of ['app/gestionale/corsi/actions.ts','app/module-actions.ts'])assert.match(read(path),/iscrivi_con_deroga/);
 assert.match(read('app/area-personale/actions.ts'),/P3521/);
});
