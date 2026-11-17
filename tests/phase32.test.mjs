import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function file(name){return readFileSync(path.join(ROOT,name),'utf8');}
const migration=file('supabase/migrations/20261111210400_corsi_guidati.sql');
const actions=file('app/gestionale/corsi/actions.ts');
const ui=file('app/gestionale/corsi/[id]/page.tsx');

test('Sicurezza: tutte le azioni guidate richiedono ruolo di segreteria',()=>{
 const functions=[...actions.matchAll(/export async function (\w+)\(form:FormData\)\{/g)].map(x=>x[1]);
 assert.deepEqual(functions.sort(),['createCatalogCourse','createEdition','updateEdition','addInstructor','removeInstructor','replaceResponsible','addEnrollment','updateEnrollment','createLesson','recordClassAttendance','setCourseProgram','saveLessonModules','deleteEdition'].sort());
 for(const [,name,body] of actions.matchAll(/export async function (\w+)\(form:FormData\)\{([\s\S]*?)(?=\nexport async function|$)/g)){
  assert.match(body,/await requireStaff\(\)/,`${name}: manca controllo staff`);
 }
});
test('La creazione guidata delle lezioni è atomica e applica RLS',()=>{
 assert.match(migration,/security invoker/i);assert.match(migration,/public\.is_staff\(\)/);
 assert.match(migration,/insert into public\.lezioni/);assert.match(migration,/insert into public\.prenotazioni_corsie/);
 assert.match(actions,/\.rpc\('crea_lezione_guidata'/);
 assert.doesNotMatch(migration,/drop table|truncate |delete from public\./i);
});
test('Corsi: UI per iscrizioni, istruttori, lezioni e presenze',()=>{
 for(const a of ['addEnrollment','updateEnrollment','addInstructor','replaceResponsible','createLesson','recordClassAttendance']) assert.match(ui,new RegExp(`action=\\{${a}\\}`));
 assert.match(ui,/CourseLanePicker/);
});
test('Nuove rotte accessibili solo a staff e navigazione funzionante',()=>{
 for(const f of ['app/gestionale/corsi/page.tsx','app/gestionale/corsi/nuovo/page.tsx','app/gestionale/corsi/[id]/page.tsx']){
  assert.ok(existsSync(path.join(ROOT,f)));assert.match(file(f),/await requireStaff\(\)/);
 }
 assert.match(file('components/StaffNav.tsx'),/href="\/gestionale\/corsi"/);
});
test('Gestione iscrizioni: stato confermato richiede adesione attiva della stessa stagione',()=>{
 assert.match(actions,/\.eq\('stagione_id',edition\.stagione_id\)\.eq\('stato','attiva'\)/);
 assert.match(migration,/assegnazioni_staff_del/);
});

test('Ora italiana: cambio ora non ambiguo',()=>{
 const ts=require('typescript');
 const code=ts.transpileModule(file('lib/course-tools.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};new Function('exports',code)(exports);
 assert.equal(exports.asRomeISO('2026-11-12T09:30'),'2026-11-12T08:30:00.000Z');
 assert.equal(exports.asRomeISO('2026-07-12T09:30'),'2026-07-12T07:30:00.000Z');
 assert.throws(()=>exports.asRomeISO('2026-03-29T02:30'),/inesistente|ambigua/);
 assert.throws(()=>exports.asRomeISO('2026-10-25T02:30'),/inesistente|ambigua/);
});
