import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('course detail keeps authorization and limits specialized reads to the active tab',()=>{
 const source=read('app/gestionale/corsi/[id]/page.tsx');
 assert.match(source,/await requireStaff\(\)/);
 const expected=[
 ['allievi','gest_soci_iscrivibili'],
 ['allievi','stato_certificati'],
 ['allievi','adesioni'],
 ['allievi','tesseramenti'],
 ['allievi','contatti_emergenza'],
 ['lezioni','piscine'],
 ['lezioni','corsie'],
 ['lezioni','moduli_didattici'],
 ['lezioni','lezione_moduli'],
 ['didattica','programmi_didattici'],
 ['configurazione','listino_corsi'],
 ['brevetti','brevetti_allievi'],
 ['stampe','documenti']
 ];
 for(const [tab,table] of expected){
  assert.ok(source.split('\n').some(line=>line.includes("tab==='"+tab+"'?")&&line.includes("supabase.from('"+table+"')")),tab+': '+table);
 }
 assert.match(source,/tab==='presenze'&&selected\?await tutteLePagine/);
 assert.match(source,/tab==='didattica'&&ed.programma_versione_id\?supabase.from\('versioni_programmi'\)/);
 assert.match(source,/tab==='allievi'\?await readCourseChunks\(enrollments.map\(x=>x.id\)/);
 assert.match(source,/tab==='allievi'&&<Section/);
 assert.match(source,/tab==='lezioni'&&<Section/);
});

test('generic module indexed lookups preserve row identity and staff boundary',()=>{
 const source=read('app/gestionale/moduli/[modulo]/page.tsx');
 assert.match(source,/await requireStaff\(\)/);
 assert.match(source,/referenceIndex=new Map\(Object.entries\(references\).map/);
 assert.match(source,/referenceIndex.get\(field\?\.ref\?\.table\?\?''\)\?\.get\(row\[c\] as string\)/);
 assert.match(source,/missingPagePromise/);
 assert.match(source,/\[senzaFile,missingTotal\]=await Promise.all/);
});

test('render-scoped authentication shares verified account and roles without caching mutation guards',()=>{
 const security=read('lib/security.ts'),nav=read('lib/navigation-access.ts');
 assert.match(security,/export async function requireUser\(\)[\s\S]*?await supabase\.auth\.getUser\(\)[\s\S]*?account_corrente_abilitato/);
 assert.match(security,/export async function requireStaff\(\)[\s\S]*?await requireUser\(\)[\s\S]*?ruoli_utente/);
 assert.match(security,/readAccountForRender=cache\(async\(\)=>\{[\s\S]*?await supabase\.auth\.getUser\(\)[\s\S]*?account_corrente_abilitato/);
 assert.match(security,/readRolesForRender=cache\(async[\s\S]*?\.eq\('utente_id',userId\)/);
 assert.match(security,/requireStaffForRender=cache\(async\(\)=>\{[\s\S]*?await requireUserForRender\(\)[\s\S]*?await readRolesForRender\(supabase,user.id\)[\s\S]*?\['amministratore','segreteria'\]/);
 assert.match(nav,/await readAccountForRender\(\)/);
 assert.match(nav,/readRolesForRender\(supabase,user.id\)/);
 for(const path of ['app/actions.ts','app/module-actions.ts','app/gestionale/corsi/actions.ts','app/notifiche/actions.ts']){
  assert.doesNotMatch(read(path),/require(?:Staff|User)ForRender|read(?:Account|Roles)ForRender/);
 }
});

test('staff loading boundary and closed menu prefetch preserve accessible navigation',()=>{
 const nav=read('components/StaffNav.tsx');
 assert.match(nav,/prefetch=\{open\?undefined:false\}/);
 assert.match(nav,/aria-expanded=\{open\}/);
 assert.match(read('app/gestionale/loading.tsx'),/<LoadingState message=/);
 assert.match(read('app/gestionale/layout.tsx'),/await requireStaff\(\)/);
});

test('generic editors load only for a selected row, preserving legacy deep links and dirty navigation',()=>{
 const source=read('app/gestionale/moduli/[modulo]/page.tsx');
 const button=read('components/DeferredEditorButton.tsx');
 assert.match(source,/const editId=edit&&UUID_RE\.test\(edit\)\?edit:null/);
 assert.match(source,/const editorId=scope.editor&&UUID_RE\.test\(scope.editor\)\?scope.editor:null/);
 assert.match(source,/const openEditorId=editId\?\?editorId/);
 assert.match(source,/new URLSearchParams\(href\(page\)\.slice\(1\)\)/);
 assert.match(source,/params.set\('editor',id\)/);
 assert.match(source,/openEditorId===row.id\?<Drawer/);
 assert.match(source,/initialOpen=\{msg!=='salvato'&&openEditorId===row.id\}/);
 assert.match(source,/DeferredEditorButton href=\{editorHref\(row.id\)\}/);
 assert.match(button,/requestDiscard\(\{trigger,proceed:/);
 assert.match(button,/router.push\(href,\{scroll:false\}\)/);
 assert.match(button,/aria-haspopup="dialog"/);
});

test('searchable select memoizes normalization without dropping the selected value',()=>{
 const source=read('components/ui/SearchableSelect.tsx');
 assert.match(source,/indexed=useMemo\(\(\)=>options.map/);
 assert.match(source,/option.value===selected\|\|normalized.includes\(normalizedQuery\)/);
 assert.match(source,/selected&&!options.some/);
});

test('form mutation observer still scans relevant form changes and before navigation',()=>{
 const source=read('components/GlobalCancelButtons.tsx');
 assert.match(source,/new MutationObserver\(records=>/);
 assert.match(source,/records.some\(record=>affectsForms\(record.target\)/);
 assert.match(source,/Array.from\(record.addedNodes\).some\(affectsForms\)/);
 assert.match(source,/Array.from\(record.removedNodes\).some\(affectsForms\)/);
 assert.match(source,/if\(!dirtyForms\(\).length\)return/);
 assert.match(source,/beforeunload/);
});
