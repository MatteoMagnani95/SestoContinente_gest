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

test('staff navigation preserves accessible state and the authorization boundary',()=>{
 const nav=read('components/StaffNav.tsx');
 assert.doesNotMatch(nav,/prefetch=\{open\?undefined:false\}/);
 assert.match(nav,/aria-expanded=\{open\}/);
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

test('only explicit public branding assets get public caching',()=>{
 const config=read('next.config.ts');
 assert.match(config,/private, no-store, max-age=0, must-revalidate/);
 assert.match(config,/source:'\/brand\/:asset\(sestocontinente-mark.png\|sestocontinente-logo.png\|nereia-logo.png\|favicon.png\)'/);
 assert.match(config,/public, max-age=86400, must-revalidate/);
 assert.doesNotMatch(read('components/StaffNav.tsx'),/import \{ modules/);
});

test('finance loads independent reads and preserves full filtered aggregate',()=>{
 const source=read('app/gestionale/incassi/page.tsx');
 assert.match(source,/const \[\{data:admin\},\{data:seasons,error:seasonError\},personOptions\]=await Promise.all/);
 assert.match(source,/peoplePromise=remoteOptionsPromise.then\(personOptions=>personOptions\?\{data:\[\],error:null\}:tutteLePagine/);
 assert.match(source,/allIds=\[\.\.\.new Set\(\[\.\.\.peopleIds,\.\.\.historyIds\]\)\]/);
 assert.match(source,/combined.error\?await Promise.all\(\[loadPeople\(peopleIds\),loadPeople\(historyIds\)\]\)/);
 assert.match(source,/const \[\{data,error,count:total\},aggregate\]=await Promise.all/);
 assert.match(source,/select\('id,importo_dovuto,versato,residuo'\)/);
 assert.match(source,/totals=balanceTotals\(aggregate.data/);
 assert.match(source,/await recentPromise/);
});
test('account inventory retains admin authorization and complete summaries',()=>{
 const source=read('app/gestionale/utenti/page.tsx');
 assert.match(source,/await requireAdmin\(\)/);
 assert.match(source,/const \[\{rows,error\},linksResult,pendingResult\]=await Promise.all/);
 assert.match(source,/accountSummary\(rows,links\)/);
 assert.match(source,/filterAccounts\(rows,links/);
});
test('module reference pagination retains ordering and historical values',()=>{
 const source=read('app/gestionale/moduli/[modulo]/page.tsx');
 assert.match(source,/const refQuery=\(\)=>\{/);
 assert.match(source,/return query.order\('id'\)/);
 assert.match(source,/await refQuery\(\).range\(offset,offset\+499\)/);
 assert.match(source,/const memberIds=new Set\(members.map/);
 assert.match(source,/seasonNames.get\(a.stagione_id\)/);
 assert.match(source,/missing.length\?await supabase.from\('gest_elenco_adesioni'\)/);
});

test('simple reference archives defer full option lists until an editor is requested',()=>{
 const source=read('app/gestionale/moduli/[modulo]/page.tsx');
 assert.match(source,/const deferredReferences=\['qualifiche','brevetti','certificati','quote'\].includes\(modulo\)/);
 assert.match(source,/const fullReferenceOptions=!deferredReferences\|\|nuovo==='1'\|\|Boolean\(openEditorId\)/);
 assert.match(source,/if\(!fullReferenceOptions&&table!=='stagioni'\)\{[\s\S]*?UUID_RE.test\(id\)[\s\S]*?\.in\('id',ids\)[\s\S]*?return;/);
 assert.match(source,/params.set\('nuovo','1'\)/);
 assert.match(source,/deferredReferences&&!fullReferenceOptions\?<DeferredEditorButton primary href=\{createHref\(\)\} label=\{ui.create\}/);
 assert.match(source,/initialOpen=\{nuovo==='1'&&!msg\}/);
 assert.match(source,/refQuery\(\).range\(offset,offset\+499\)/);
});

test('course candidate generation is tab-specific and preserves enrollment exclusions',()=>{
 const source=read('app/gestionale/corsi/[id]/page.tsx');
 assert.match(source,/const personById=new Map\(people.map/);
 assert.match(source,/const incompatibleLearnerIds=new Set\(enrollments.filter\(e=>\['iscritto','in_attesa','concluso'\].includes\(e.stato\)\)/);
 assert.match(source,/teacherCandidates=tab==='istruttori'\?people.filter\(person=>qualified.has\(person.id\)&&!assignedIds.has\(person.id\)&&!incompatibleLearnerIds.has\(person.id\)\)/);
 assert.match(source,/candidateRows=tab==='allievi'\?people.map/);
 assert.match(source,/t.id===ed.direttore_id\|\|!incompatibleLearnerIds.has\(t.id\)/);
 assert.match(source,/if\(!certificateByPerson.has\(cert.persona_id\)\)certificateByPerson.set\(cert.persona_id,cert\)/);
});

test('dedicated equipment routes defer real editors while keeping complete filter options',()=>{
 const revisions=read('app/gestionale/moduli/revisioni/page.tsx'),loans=read('app/gestionale/moduli/consegne/page.tsx');
 assert.match(revisions,/selectedEditor===r.id\?<Drawer/);
 assert.match(revisions,/s.nuovo==='1'\?<Drawer/);
 assert.match(revisions,/primary href=\{editorHref\(\)\} label="Registra revisione"/);
 assert.match(revisions,/name="attrezzatura"[\s\S]*?options=\{equipment.map/);
 assert.match(loans,/s.nuovo==='1'\?<Drawer/);
 assert.match(loans,/primary href=\{createHref\} label="Registra consegna"/);
 assert.match(loans,/equipment.filter\(e=>e.stato==='disponibile'&&!openIds.has\(e.id\)\)/);
});

test('inventory deferred row editor preserves revision locks and current filters',()=>{
 const source=read('app/gestionale/moduli/attrezzature/page.tsx');
 assert.match(source,/selectedEditor===e.id\?<Drawer/);
 assert.match(source,/lockedDates=\{locked.has\(e.id\)\}/);
 assert.match(source,/open=\{open.has\(e.id\)\}/);
 assert.match(source,/listHref\(\{q:s.q,categoria:s.categoria,stato:status,revisione:revision,p:String\(page\),editor:id\}\)/);
 assert.match(source,/DeferredEditorButton href=\{editorHref\(e.id\)\}/);
});

test('validated structural RPCs are local-QA-only and retain legacy fallbacks',()=>{
 const gate=read('lib/structural-qa.ts');
 assert.match(gate,/SC_STRUCTURAL_RPC!=='true'/);
 assert.match(gate,/QA_ISOLATED_ENV!=='true'/);
 assert.match(gate,/SESTO_TEST_MODE!=='true'/);
 assert.match(gate,/u.port==='54321'/);
 assert.match(read('app/gestionale/page.tsx'),/snapshot\?\?await readLegacy\(\)/);
 assert.match(read('app/gestionale/soci/page.tsx'),/sc_perf_soci_counts/);
 assert.match(read('app/gestionale/incassi/page.tsx'),/sc_perf_incassi_totals/);
 assert.match(read('app/gestionale/incassi/page.tsx'),/else if\(!aggregate.error&&aggregate.data\)/);
 assert.match(read('scripts/qa-latency.cjs'),/target\?\.origin===api.origin/);
});

test('own-account RPC is gated, validates snapshot and shares it only within the verified render',()=>{
 const s=read('lib/security.ts'),nav=read('lib/navigation-access.ts'),sql=read('scripts/qa-structural-rpc.sql');
 assert.match(s,/if\(error\|\|!user\)return [^\n]*status:'guest'/);
 assert.match(s,/structuralRpc\(supabase,'sc_perf_navigation',\{\}\)/);
 assert.match(s,/account.supabase===supabase&&account.user\?\.id===userId&&account.status==='enabled'/);
 assert.match(nav,/if\(snapshot\?\.enabled\)/);
 assert.match(sql,/CREATE FUNCTION public.sc_perf_navigation\(\)[\s\S]*?SECURITY INVOKER[\s\S]*?uid uuid:=auth.uid\(\)/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public.sc_perf_navigation\(\) FROM PUBLIC,anon,authenticated/);
 assert.match(read('.github/workflows/performance-3-1.yml'),/QA_STRUCTURAL_RPC_USED navigation-account/);
});

test('server-paged inventory and remote person options preserve complete counts and staff-only access',()=>{
 const inventory=read('app/gestionale/moduli/attrezzature/page.tsx'),finance=read('app/gestionale/incassi/page.tsx'),route=read('app/gestionale/incassi/person-options/route.ts');
 assert.match(inventory,/sc_perf_inventory/);
 assert.match(inventory,/snapshot\.metrics/);
 assert.match(inventory,/count=\{failed\?null:filteredCount\}/);
 assert.match(inventory,/upcomingCount/);
 assert.match(finance,/personOptions\?<RemotePersonSelect/);
 assert.match(route,/await supabase.auth.getUser\(\)/);
 assert.match(route,/await supabase.rpc\('is_staff'\)/);
 assert.match(route,/staff!==true/);
 assert.match(route,/private, no-store/);
 assert.match(read('components/ui/RemotePersonSelect.tsx'),/controller.abort\(\)/);
});

test('course historical duplicate checks start independently of the season and page queries',()=>{
 const source=read('app/gestionale/corsi/page.tsx');
 assert.ok(source.indexOf('const storicoCatalogoPromise=')<source.indexOf('const {data:seasons,error:seasonError}=await'));
 assert.ok(source.indexOf('const storicheEdizioniPromise=')<source.indexOf('const {data:seasons,error:seasonError}=await'));
 assert.match(source,/storicoCatalogoPromise,\s*storicheEdizioniPromise/);
 assert.match(source,/storiciCatalogo.error\|\|storicheEdizioni.error/);
});

test('complete fresh member snapshot keeps the original paginated path as fallback',()=>{
 const source=read('app/gestionale/soci/page.tsx'),sql=read('scripts/qa-structural-rpc.sql');
 assert.match(source,/sc_perf_soci_page/);
 assert.match(source,/p_terms:searchTerms\(q\),p_status:stato,p_order:ordine,p_page:desiredPage/);
 assert.match(source,/if\(snapshot\)markStructuralRpcUsed\('soci-page'\)/);
 assert.match(source,/}:await readLegacy\(\)/);
 assert.match(source,/sc_perf_soci_counts/);
 assert.match(sql,/CREATE FUNCTION public.sc_perf_soci_page[\s\S]*?SECURITY INVOKER[\s\S]*?public.is_staff\(\)/);
 assert.match(read('.github/workflows/performance-3-1.yml'),/QA_STRUCTURAL_RPC_USED soci-page/);
});
