import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(file,imports={}){
 const js=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports','require',js)(exports,n=>{if(n in imports)return imports[n];throw Error('Unexpected import: '+n);});return exports;
}
const ui=load('lib/module-ui.ts'),mods=load('lib/modules.ts');
test('Tutti i 28 moduli hanno nomenclatura specifica e ricerca coerente con i campi dichiarati',()=>{
 assert.equal(Object.keys(mods.modules).length,28);assert.deepEqual(Object.keys(ui.moduleUi).sort(),Object.keys(mods.modules).sort());
 for(const [key,meta] of Object.entries(ui.moduleUi)){assert.ok(meta.entity&&meta.create,key);assert.doesNotMatch(meta.create,/record|crea nuovo/i);for(const name of meta.fields)assert.ok(mods.modules[key].fields.some(f=>f.name===name&&f.type==='text'),key+':'+name);}
 assert.equal(ui.entityLabel('cda_verbali'),'bozza del verbale');
 assert.equal(ui.moduleUi.attrezzature.create,'Aggiungi attrezzatura');
});
test('Ricerca e paginazione: sanitizzazione e query interne',()=>{
 assert.equal(ui.cleanSearch('  %Rossi_,(Mario)  '),'Rossi   Mario');
 assert.equal(ui.pageNumber('-9'),1);assert.equal(ui.pageNumber('103'),103);assert.equal(ui.pageNumber('bad'),1);
 const u=new URL(ui.listHref({q:'A & B',p:'2',filtro_modulo:'stato:attivo',ordine:'nome',dir:'desc'}),'https://example.invalid/');
 assert.equal(u.searchParams.get('q'),'A & B');assert.equal(u.searchParams.get('filtro_modulo'),'stato:attivo');assert.equal(u.searchParams.get('p'),'2');
});
test('Drawer e conferme montano i form in portal, integrano dirty guard e bloccano chiusura in attesa',()=>{
 const d=read('components/ui/Drawer.tsx');
 assert.match(d,/mounted&&open&&createPortal/);assert.match(d,/document\.body\)/);assert.match(d,/showModal\(\)/);assert.match(d,/requestDiscard\(\{container:panel/);assert.match(d,/aria-busy="true"/);assert.match(d,/onCancel=/);assert.match(d,/button\.current\?\.focus/);assert.match(d,/sc:form-saved/);
 assert.match(read('components/GlobalCancelButtons.tsx'),/request\.container\.contains\(form\)/);
 assert.match(read('components/RemoveRecord.tsx'),/<ConfirmDialog/);assert.match(read('components/RemoveRecord.tsx'),/name="conferma" required/);
 assert.match(read('components/ui/ActionForm.tsx'),/useFormStatus/);assert.match(read('components/EditForm.tsx'),/busy\.current/);assert.match(read('components/EditForm.tsx'),/aria-invalid/);
});
test('Pagine con editor nelle celle migrate ai pannelli condivisi',()=>{
 const files=['app/gestionale/moduli/[modulo]/page.tsx','app/gestionale/programmi-didattici/page.tsx','app/documenti/page.tsx','app/gestionale/incassi/page.tsx','app/gestionale/amministrazione-dati/page.tsx','app/gestionale/corsi/[id]/page.tsx','app/gestione-eventi/page.tsx'];
 for(const file of files){const s=read(file);assert.match(s,/<Drawer\b/,file);assert.doesNotMatch(s,/className="row-editor(?:-pop)?"/,file);}
 assert.match(read('app/gestionale/incassi/page.tsx'),/<Drawer title=\{'Registra versamento/);
 assert.match(read('app/gestionale/incassi/page.tsx'),/<EditForm action=\{recordGuidedPayment\}/);
 assert.match(read('app/gestionale/incassi/page.tsx'),/name="richiesta_id"/);
});
test('CRUD e archivi: conteggi esatti, paginazione lato server, filtri con whitelist',()=>{
 const p=read('app/gestionale/moduli/[modulo]/page.tsx');assert.match(p,/count:'exact'/);assert.match(p,/selectedFilter&&filterValue\)query=query\.eq\(selectedFilter\.name,filterValue\)/);assert.match(p,/sortable\.find/);assert.match(p,/\.range\(\(page-1\)\*perPage,page\*perPage-1\)/);assert.match(p,/<DataTable label=\{module\.label\} mobileCards/);assert.match(p,/<SearchableSelect/);assert.match(p,/if\(editId\)query=query\.eq\('id',editId\)/);
 for(const path of ['app/documenti/page.tsx','app/gestionale/richieste/page.tsx','app/gestionale/programmi-didattici/page.tsx']){const s=read(path);assert.match(s,/count:'exact'/);assert.match(s,/<Pagination/);assert.match(s,/\.range\(/);}
 assert.match(read('app/data-ui.css'),/sc-mobile-cards td\[data-label\]::before/);
});
test('Versamenti: errore di validazione non invoca RPC e conserva esito editabile; errore DB non è successo',async()=>{
 const calls=[];const db={rpc:async(...args)=>{calls.push(args);return {error:{code:'P3401'}}}};
 const pay=load('app/gestionale/incassi/actions.ts',{'next/navigation':{redirect:p=>{throw Error('redirect:'+p)}},'next/cache':{revalidatePath:()=>{}},'@/lib/security':{requireStaff:async()=>({supabase:db}),requireAdmin:async()=>({supabase:db})},'@/lib/payment-tools':{paymentAmount:v=>v==='10'?10:null,validPaymentDate:v=>v==='2026-11-26'}});
 const id='12345678-1234-4234-8234-123456789abc',f=new FormData();
 for(const [k,v] of Object.entries({tab:'quota',debito_id:id,persona_id:id,richiesta_id:id,data_pagamento:'2026-11-26',metodo:'bonifico',importo:'10'}))f.set(k,v);
 assert.ok((await pay.recordGuidedPayment(f)).error);assert.equal(calls.length,0);
 f.set('conferma','on');const result=await pay.recordGuidedPayment(f);assert.match(result.error,/residuo/);assert.equal(calls.length,1);assert.equal(calls[0][0],'registra_pagamento_guidato');assert.equal(calls[0][1].p_richiesta_id,id);
});
test('Archivio didattico: errore di validazione conserva il modulo senza scrittura',async()=>{
 const teaching=load('app/gestionale/programmi-didattici/actions.ts',{'next/navigation':{redirect:p=>{throw Error('redirect:'+p)}},'next/cache':{revalidatePath:()=>{}},'@/lib/security':{requireStaff:async()=>({supabase:{from:()=>{throw Error('Scrittura non prevista')}}})}});
 const result=await teaching.editTeachingModule(new FormData());assert.match(result.error,/Controlla/);
});
