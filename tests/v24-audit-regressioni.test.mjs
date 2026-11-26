import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const ts=require('typescript');
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function load(path,dependencies={}){
  const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));
  return exports;
}
const courseTools=load('lib/course-tools.ts');
const formatting=load('lib/format.ts',{'./course-tools':courseTools});

test('Date italiane: stesso istante per editor corsi ed editor generico',()=>{
  for(const [local,iso] of [
    ['2026-01-15T10:30','2026-01-15T09:30:00.000Z'],
    ['2026-06-15T10:30','2026-06-15T08:30:00.000Z'],
  ]){
    assert.equal(formatting.italianLocalToISO(local),iso);
    assert.equal(formatting.italianLocalToISO(local),courseTools.asRomeISO(local));
  }
});
test('Date italiane: orari inesistenti e ambigui bloccati',()=>{
  for(const local of ['2027-03-28T02:30','2027-10-31T02:30','2026-02-30T10:00','2026-12-01T25:00']){
    assert.throws(()=>formatting.italianLocalToISO(local));
  }
});
test('Area personale: lezioni limitate alle edizioni confermate e completate',()=>{
  const page=read('app/area-personale/corsi/page.tsx');
  assert.match(page,/readCourseChunks\(myCourseIds,\(group,da,a\)=>supabase\.from\('lezioni'\)/);
  assert.match(page,/\.in\('edizione_id',group\)\.is\('annullata_il',null\)/);
  assert.match(page,/editions\?\.find\(e=>e\.id===l\.edizione_id\)/);
});
test('Callback: nessun redirect esterno via percorso assoluto o backslash',()=>{
  const callback=read('app/auth/callback/route.ts');
  assert.match(callback,/!next\.startsWith\('\/\/'\)/);
  assert.match(callback,/!next\.includes\('\\\\'\)/);
  assert.match(callback,/candidate\.origin === request\.nextUrl\.origin/);
  assert.doesNotMatch(callback,/redirect\(new URL\(safeNext/);
});
test('Form richiesta: avviso di collaudo solo in modalità di prova',()=>{
  const form=read('components/ApplicationForm.tsx');
  assert.match(form,/testMode\?'Ambiente di prova/);
  assert.match(form,/Controlla i dati e le dichiarazioni/);
});
test('Certificato: date verificate prima della lettura e rimozione del transito',()=>{
  const action=read('app/area-personale/certificato/actions.ts');
  const validated=action.indexOf("if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(dal)");
  const loaded=action.indexOf("if(staged){");
  const removed=action.indexOf("await storage.remove([staged])");
  assert.ok(validated>=0&&loaded>validated&&removed>loaded);
});
test('Modifica edizione: direttore valido obbligatorio anche sul server',()=>{
  const actions=read('app/gestionale/corsi/actions.ts');
  assert.match(actions,/if\(!UUID_RE\.test\(direttore_id\)\)return \{field:'direttore_id'/);
});

test('Moduli: la modifica diretta non eredita filtri e paginazione della ricerca',()=>{
  const page=read('app/gestionale/moduli/[modulo]/page.tsx');
  assert.match(page,/const page=editId\?1:/);
  assert.match(page,/const safeSearch=editId\?'':cleanSearch\(q\)/);
});
test('Certificati: ricerca per nome e cognome sulle colonne della vista',()=>{
  const page=read('app/gestionale/moduli/[modulo]/page.tsx');
  assert.match(page,/personSorted\|\|medical\|\|module\.table==='persone'/);
  assert.match(page,/personSorted\|\|medical\?\['sort_cognome','sort_nome'\]:ui\.fields/);
});
