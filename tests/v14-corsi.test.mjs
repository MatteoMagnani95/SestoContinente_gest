import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261117201500_corsi_rimozione_quote_attive.sql');
const moduleActions=read('app/module-actions.ts');
const page=read('app/gestionale/moduli/[modulo]/page.tsx');
test('Eliminazione corsi: conferma, autorizzazioni staff, cancellazione mirata e vincoli FK preesistenti',()=>{
 assert.match(sql,/FOR DELETE TO authenticated/g);assert.match(sql,/public\.is_staff\(\)/);assert.doesNotMatch(sql,/ON DELETE CASCADE\s*;/i);
 const old=read('supabase/migrations/20261111210200_gestionale_completo.sql');
 for(const match of old.matchAll(/references public\.(edizioni_corsi|corsi)\(id\)([^,\n]*)/gi))assert.doesNotMatch(match[2],/on delete cascade/i);
 const actions=read('app/gestionale/corsi/actions.ts');
 assert.match(actions,/deleteEdition[\s\S]*requireStaff\(\)[\s\S]*form\.get\('conferma'\)[\s\S]*removeCourseEdition\(supabase,id\)/);
 const removal=read('lib/course-errors.ts'),hotfix=read('docs/release/COURSE_DUPLICATE_HOTFIX.sql');
 assert.match(removal,/data\.stato==='annullato'[\s\S]*\.rpc\('elimina_edizione_annullata_vuota'[\s\S]*\.rpc\('rimuovi_record_gestionale'/);
 assert.match(hotfix,/auth\.uid\(\) IS NULL OR NOT coalesce\(public\.is_staff\(\),false\)/);
 assert.match(hotfix,/FOR UPDATE/);assert.match(hotfix,/PERFORM public\.rimuovi_record_gestionale\('edizioni_corsi',p_id\)/);
 assert.doesNotMatch(hotfix,/ON DELETE CASCADE|DISABLE TRIGGER/i);
 assert.match(moduleActions,/deleteModuleRecord[\s\S]*requireStaff\(\)[\s\S]*rimuovi_record_gestionale/);
 assert.match(page,/<RemoveRecord moduleKey=\{moduleKey\}/);assert.match(read('components/RemoveRecord.tsx'),/action=\{deleteModuleRecord\}/);
});
test('Quote corsi: selezione attiva, nomi leggibili, storico non riassegnabile',()=>{
 for(const source of [page,moduleActions]){
  assert.match(source,/\.eq\('stato','iscritto'\)\.eq\('edizione\.stato','attivo'\)\.eq\('edizione\.stagione\.attiva',true\)/);
 }
 assert.match(page,/CourseEnrollmentSelect/);assert.match(page,/historical\.data/);
 const selector=read('components/CourseEnrollmentSelect.tsx');
 assert.match(selector,/Corso stagionale attivo/);assert.match(selector,/Allievo iscritto/);assert.match(selector,/o\.editionId===course/);
 assert.match(sql,/NEW\.iscrizione_id IS DISTINCT FROM OLD\.iscrizione_id/);
 assert.match(sql,/i\.stato='iscritto' AND e\.stato='attivo' AND s\.attiva IS TRUE/);
 assert.doesNotMatch(sql,/\bDELETE FROM\b|\bTRUNCATE\b/i);
});
