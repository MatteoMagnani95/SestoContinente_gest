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
