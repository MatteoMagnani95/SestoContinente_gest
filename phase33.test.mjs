import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const migration=read('supabase/migrations/20261111210500_calendario_economico.sql');
const transpile=(f)=>ts.transpileModule(read(f),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const course={};new Function('exports',transpile('lib/course-tools.ts'))(course);
const calendar={};new Function('require','exports',transpile('lib/calendar-tools.ts'))((name)=>{
 assert.equal(name,'./course-tools');return course;
},calendar);
test('La settimana comincia lunedì anche a fine mese',()=>{
 assert.equal(calendar.monday('2026-11-12'),'2026-11-09');
 assert.equal(calendar.monday('2026-11-01'),'2026-10-26');
 assert.equal(calendar.changePeriod('2026-12-31','mese',1),'2027-01-01');
});
test('Il calendario tratta il fuso di Roma e i cambi ora',()=>{
 const winter=calendar.dateWindow('2026-11-12','settimana');
 assert.equal(winter.from,'2026-11-08T23:00:00.000Z');
 assert.equal(winter.to,'2026-11-15T23:00:00.000Z');
 const spring=calendar.dateWindow('2026-03-29','settimana');
 assert.equal(spring.from,'2026-03-22T23:00:00.000Z');
 assert.equal(spring.to,'2026-03-29T22:00:00.000Z');
 assert.equal(calendar.validDay('2026-02-29').length,10); // invalid -> fallback
 assert.equal(calendar.romeDay('2026-11-11T23:30:00Z'),'2026-11-12');
});
test('Spostamento corsie atomico e RLS senza revocare dati storici',()=>{
 assert.match(migration,/security invoker/);
 assert.match(migration,/public\.modifica_lezione_e_corsie/);
 assert.match(migration,/update public\.prenotazioni_corsie set stato='annullata'/);
 assert.match(migration,/on conflict \(lezione_id,corsia_id\) do update/);
 assert.match(migration,/for update of l/);
 assert.match(migration,/public\.is_staff\(\)/);
 assert.doesNotMatch(migration,/drop table|truncate|delete from public\./i);
});
test('Annullamento preserva lo storico e non consente nuove presenze',()=>{
 assert.match(migration,/add column if not exists annullata_il/);
 assert.match(migration,/public\.annulla_lezione_guidata/);
 assert.match(migration,/if exists\(select 1 from public\.presenze/);
 assert.match(migration,/public\.avvisa_annullamento_lezione/);
 assert.match(migration,/l\.annullata_il is null/);
 for(const f of ['app/area-personale/corsi/page.tsx','app/istruttore/page.tsx','app/gestionale/corsi/[id]/page.tsx'])
  assert.match(read(f),/\.is\('annullata_il',null\)/);
});
test('Rendiconto esatto filtrato per anno e solo amministratori',()=>{
 assert.match(migration,/public\.riepilogo_contabile_periodo/);
 assert.match(migration,/public\.is_admin\(\)/);
 assert.match(migration,/data_movimento between p_dal and p_al/);
 assert.doesNotMatch(migration,/from public\.movimenti_economici[^;]*limit/i);
 assert.match(read('app/gestionale/economia/page.tsx'),/\.rpc\('riepilogo_contabile_periodo'/);
 assert.match(read('app/gestionale/economia/page.tsx'),/redirect\('\/gestionale\?msg=permessi'\)/);
});
test('Le azioni calendario richiedono sempre permessi staff',()=>{
 const src=read('app/gestionale/calendario-visivo/actions.ts');
 for(const action of ['changeLesson','cancelLesson']){
  assert.match(src,new RegExp(`export async function ${action}\\(form:FormData\\)\\{[\\s\\S]*?await requireStaff\\(\\)`));
 }
});
test('Export CSV con paginazione e limite esplicito, senza troncamenti silenziosi',()=>{
 const src=read('app/gestionale/esporta/[modulo]/route.ts');
 assert.match(src,/\.range\(offset,offset\+PAGE_SIZE-1\)/);
 assert.match(src,/MAX_ROWS=50000/);
 assert.match(src,/status:413/);
 assert.match(src,/const row:unknown=rawRow/); // evita TS2352 su GenericStringError delle select dinamiche
 assert.doesNotMatch(src,/\.limit\(5000\)/);
});
