import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(file,imports={}){
 const js=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const exports={};new Function('exports','require',js)(exports,n=>{if(n in imports)return imports[n];throw Error('Unexpected import: '+n);});return exports;
}
const nav=load('lib/navigation.ts'),modules=load('lib/modules.ts');
const groups=load('components/StaffNav.tsx',{'next/link':{},'next/navigation':{},react:{},'react/jsx-runtime':{},'@/lib/modules':modules,'@/lib/navigation':nav,'@/components/ui/Icon':{}}).staffGroups;
const guest=nav.guestAccess,staff={...guest,signedIn:true,enabled:true,staff:true,board:true},admin={...staff,admin:true};
const instructor={...guest,signedIn:true,enabled:true,instructor:true},board={...guest,signedIn:true,enabled:true,board:true},member={...guest,signedIn:true,enabled:true,personal:true,member:true};
test('Shell condiviso solo per staff, anche fuori /gestionale',()=>{
 for(const path of ['/gestionale','/gestionale/soci/abc','/documenti','/organi-sociali/archivio/abc','/gestione-eventi','/comunicazioni/corsi/abc']){
  assert.equal(nav.staffArea(path,staff),true,path);
  for(const a of [guest,instructor,board,member])assert.equal(nav.staffArea(path,a),false,path);
 }
 for(const path of ['/','/area-personale','/area-soci','/istruttore','/richiesta/nuova','/gestionalex'])assert.equal(nav.staffArea(path,admin),false,path);
 assert.equal(nav.homeFor(instructor),'/istruttore');assert.equal(nav.homeFor(board),'/organi-sociali');assert.equal(nav.homeFor(member),'/area-personale');
});
test('Tutti i moduli navigabili e admin-only esclusi dalla segreteria',()=>{
 const all=groups(true).flatMap(g=>g.items),limited=groups(false).flatMap(g=>g.items);
 assert.equal(groups(true).length,11);
 assert.equal(new Set(all.map(i=>i.href)).size,all.length);
 for(const [key,module] of Object.entries(modules.modules)){
  if(key==='pagamenti'){assert.ok(all.some(i=>i.aliases?.includes('/gestionale/moduli/pagamenti')));continue;}
  const path='/gestionale/moduli/'+key;assert.ok(all.some(i=>i.href===path),key);assert.equal(limited.some(i=>i.href===path),!module.adminOnly,key);
 }
 for(const p of ['/gestionale/utenti','/gestionale/amministrazione-dati','/gestionale/economia','/gestionale/archivio-incassi'])assert.equal(limited.some(i=>i.href===p),false,p);
});
test('Route attiva unica, anche dinamiche e alias',()=>{
 const items=groups(true).flatMap(g=>g.items);
 for(const [path,expected] of [['/gestionale','/gestionale'],['/gestionale/soci/a','/gestionale/soci'],['/gestionale/corsi/nuovo','/gestionale/corsi'],['/gestionale/moduli/corsi','/gestionale/moduli/corsi'],['/gestionale/moduli/iscrizioni','/gestionale/moduli/iscrizioni'],['/gestionale/moduli/pagamenti','/gestionale/incassi'],['/gestionale/utenti/a/elimina','/gestionale/utenti'],['/organi-sociali/archivio/a','/organi-sociali'],['/comunicazioni/corsi/a','/gestionale/corsi'],['/comunicazioni/soci/a','/gestionale/soci'],['/gestionale/sociX',undefined]])assert.equal(nav.activeItem(path,items),expected,path);
});
test('Ritorno esplicito e recupero filtri senza redirect esterni',()=>{
 for(const [p,h] of [['/gestionale/soci/a','/gestionale/soci'],['/gestionale/corsi/nuovo','/gestionale/corsi'],['/gestionale/calendario-visivo/a','/gestionale/calendario-visivo'],['/gestionale/utenti/a/elimina','/gestionale/utenti/a'],['/gestionale/richieste/a','/gestionale/richieste'],['/organi-sociali/archivio/a','/organi-sociali/archivio'],['/comunicazioni/soci/a','/gestionale/soci/a'],['/accedi','/']])assert.equal(nav.backTarget(p,admin).href,h);
 assert.equal(nav.backTarget('/comunicazioni/corsi/a',instructor).href,'/istruttore');assert.equal(nav.backTarget('/gestione-eventi',instructor).href,'/istruttore');
 const ctx=nav.listContext('/gestionale/soci','?q=Rossi&p=3&stagione=2027&msg=ok&edit=abc&next=https://evil.example');
 assert.equal(ctx,'/gestionale/soci?q=Rossi&p=3&stagione=2027');
 const b=nav.backTarget('/gestionale/soci/a',admin);assert.equal(nav.restoredTarget(b,{[b.href]:ctx}).href,ctx);assert.equal(nav.restoredTarget(b,{[b.href]:'https://evil.example'}).href,b.href);
});
test('Ogni pagina interna censita ha ritorno locale non autoreferenziale',()=>{
 function walk(dir){return readdirSync(new URL('../'+dir,import.meta.url),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.name==='page.tsx'?[dir]:[]);}
 const pages=walk('app');assert.ok(pages.length>=48);
 for(const file of pages){const p=file.replace(/^app/,'').replace(/\[[^\]]+\]/g,'sample')||'/';if(p==='/'||p==='/smista')continue;const b=nav.backTarget(p,admin);assert.ok(b?.href.startsWith('/')&&!b.href.startsWith('//')&&b.href!==p,p);}
});
class Input{constructor(name,value='',type='text'){Object.assign(this,{name,value,defaultValue:value,type,checked:false,defaultChecked:false,files:[],attrs:new Map()});}hasAttribute(n){return this.attrs.has(n);}getAttribute(n){return this.attrs.get(n)??null;}}
class Select{constructor(name,value,options,multiple=false){Object.assign(this,{name,value,options,multiple,attrs:new Map()});}get selectedOptions(){return this.options.filter(o=>o.selected);}hasAttribute(n){return this.attrs.has(n);}getAttribute(n){return this.attrs.get(n)??null;}}
class Textarea{constructor(name,value){Object.assign(this,{name,value,defaultValue:value,attrs:new Map()});}hasAttribute(n){return this.attrs.has(n);}getAttribute(n){return this.attrs.get(n)??null;}}
globalThis.HTMLInputElement=Input;globalThis.HTMLSelectElement=Select;globalThis.HTMLTextAreaElement=Textarea;
const dirty=load('lib/dirty-navigation.ts'),form=(elements,method='post',attrs=[])=>({elements,method,hasAttribute:n=>attrs.includes(n)});
test('Snapshot dirty: modifiche reali e ripristino a valori originali',()=>{
 const input=new Input('nome','Anna'),check=new Input('privacy','','checkbox'),radio=new Input('scelta','si','radio'),text=new Textarea('note',''),select=new Select('tipo','a',[{value:'a',defaultSelected:true,selected:true},{value:'b',selected:false}]);
 const f=form([input,check,radio,text,select]),baseline=dirty.snapshot(f,true);
 assert.equal(dirty.isDirty(f,baseline),false);input.value='Anna Maria';assert.equal(dirty.isDirty(f,baseline),true);input.value='Anna';assert.equal(dirty.isDirty(f,baseline),false);
 for(const c of [check,radio]){c.checked=true;assert.equal(dirty.isDirty(f,baseline),true);c.checked=false;}
 text.value='Nota';assert.equal(dirty.isDirty(f,baseline),true);text.value='';select.value='b';assert.equal(dirty.isDirty(f,baseline),true);select.value='a';assert.equal(dirty.isDirty(f,baseline),false);
});
test('Snapshot dirty: file, campi dinamici, esclusione hidden e filtri GET',()=>{
 const file=new Input('file','','file'),hidden=new Input('id','A','hidden'),text=new Input('name',''),f=form([file,hidden,text]),baseline=dirty.snapshot(f,true);
 hidden.value='B';assert.equal(dirty.isDirty(f,baseline),false);file.files=[{name:'a.pdf',size:120,lastModified:10,type:'application/pdf'}];assert.equal(dirty.isDirty(f,baseline),true);file.files=[];assert.equal(dirty.isDirty(f,baseline),false);
 const extra=new Input('tutore','');f.elements.push(extra);assert.equal(dirty.isDirty(f,baseline),false);extra.value='Nome';assert.equal(dirty.isDirty(f,baseline),true);
 assert.equal(dirty.trackedForm(form([text],'get')),false);assert.equal(dirty.trackedForm(form([text],'get',['data-dirty-form'])),true);assert.equal(dirty.trackedForm(form([text],'post',['data-dirty-ignore'])),false);
});
test('Snapshot dirty: baseline dopo salvataggio confermato e guard strutturale',()=>{
 const field=new Input('campo','prima'),f=form([field]),before=dirty.snapshot(f,true);field.value='dopo';assert.equal(dirty.isDirty(f,before),true);const after=dirty.snapshot(f);assert.equal(dirty.isDirty(f,after),false);field.value='nuovo';assert.equal(dirty.isDirty(f,after),true);
 const guard=read('components/GlobalCancelButtons.tsx');assert.match(guard,/sc:form-saved/);assert.match(guard,/beforeunload/);assert.match(guard,/Continua a modificare/);assert.match(guard,/Esci senza salvare/);assert.doesNotMatch(guard,/history\.(pushState|replaceState|back)/);
 for(const p of ['components/EditForm.tsx','components/ApplicationForm.tsx','components/ApplicationReviewForm.tsx','components/AssociationMailForm.tsx'])assert.match(read(p),/markFormSaved\(/,p);
});
test('Menu mobile inizialmente chiuso, dialog e confine server conservato',()=>{
 const shell=read('components/AppShell.tsx'),style=read('app/navigation.css'),header=read('components/SiteHeader.tsx'),access=read('lib/navigation-access.ts');
 assert.match(shell,/useState\(false\)/);assert.match(shell,/\.showModal\(\)/);assert.match(shell,/onCancel=/);assert.match(shell,/aria-labelledby="sc-menu-title"/);assert.match(shell,/staffArea\(path,access\)/);
 assert.match(style,/\.sc-staff-sidebar\{display:none;\}/);assert.match(header,/aria-expanded=\{menuOpen\}/);assert.match(header,/access\.instructor&&/);assert.match(header,/access\.board&&/);assert.match(header,/access\.staff&&/);assert.match(access,/account_corrente_abilitato/);assert.match(read('app/gestionale/layout.tsx'),/await requireStaff\(\)/);
});
test('Composizione didattica e selettori controllati: valore serializzato tracciato senza inviare nuovi dati al server',()=>{
 const marker=new Input('','["a","b"]','hidden');
 marker.attrs.set('data-dirty-track','');marker.attrs.set('data-dirty-initial','["a","b"]');
 const f=form([marker]),base=dirty.snapshot(f,true);
 assert.equal(dirty.isDirty(f,base),false);
 marker.value='["b","a"]';assert.equal(dirty.isDirty(f,base),true);
 marker.value='["a","b"]';assert.equal(dirty.isDirty(f,base),false);
 for(const p of ['components/LessonComposer.tsx','components/CourseLanePicker.tsx'])assert.match(read(p),/data-dirty-track data-dirty-initial/);
 assert.match(read('components/CertificateUploadForm.tsx'),/markFormSaved\(form\)/);
 assert.match(read('components/CertificateUploadForm.tsx'),/<form data-dirty-form/);
});