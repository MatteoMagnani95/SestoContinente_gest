import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,dependencies={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>dependencies[id]??require(id));return exports;
}
const h=load('lib/equipment-ui.ts'),p=load('lib/payment-tools.ts'),course=load('lib/course-tools.ts');
test('Inventario: non presenta un prestito aperto come disponibile né nasconde fuori servizio',()=>{
 assert.equal(h.equipmentState({stato:'disponibile'},true),'assegnata');
 assert.equal(h.equipmentState({stato:'fuori_servizio'},true),'fuori_servizio');
 assert.equal(h.equipmentState({stato:'assegnata'},false),'incongruente');
 assert.equal(h.revisionState(null,'2026-11-26','2026-12-26'),'non_acquisita');
 assert.equal(h.revisionState('2026-11-25','2026-11-26','2026-12-26'),'scaduta');
 assert.equal(h.revisionState('2026-12-26','2026-11-26','2026-12-26'),'in_scadenza');
});
test('Restituzione: conferma, data valida e scrittura condizionale sul prestito aperto',async()=>{
 const id='12345678-1234-4234-8234-123456789abc',calls=[];let current={assegnata_il:'2026-11-01',restituita_il:null},result={id};
 const q={select:()=>q,eq:(...args)=>{calls.push(args);return q;},is:(...args)=>{calls.push(args);return q;},update:changes=>{calls.push(changes);return q;},maybeSingle:async()=>({data:calls.some(c=>c.restituita_il)?result:current,error:null})};
 const a=load('app/gestionale/attrezzature/actions.ts',{'@/lib/security':{requireStaff:async()=>({supabase:{from:()=>q}})},'@/lib/course-tools':course,'@/lib/payment-tools':p,'@/lib/area-soci':{todayRome:()=> '2026-11-26'},'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:href=>{throw Error('REDIRECT '+href);}}});
 const f=new FormData();f.set('id',id);f.set('restituita_il','2026-11-26');assert.match((await a.returnEquipment(f)).error,/conferma/);assert.equal(calls.length,0);
 f.set('conferma','on');f.set('restituita_il','2026-10-31');assert.match((await a.returnEquipment(f)).error,/data/);
 f.set('restituita_il','2026-11-26');await assert.rejects(a.returnEquipment(f),/REDIRECT.*consegne/);assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='restituita_il'&&c[1]===null));
});
test('Prestiti e revisioni: trigger, indice univoco, date storiche protette, segnalazioni e filtri',()=>{
 const sql=read('supabase/migrations/20261111210200_gestionale_completo.sql');assert.match(sql,/unique index unica_assegnazione_attiva/);assert.match(sql,/controlla_consegna_attrezzatura/);assert.match(sql,/for update/);assert.match(sql,/sincronizza_stato_assegnazione/);
 const s=read('app/module-actions.ts');assert.match(s,/conferma_simile/);assert.match(s,/equipmentBefore/);assert.match(s,/update.eq\('stato',equipmentBefore.stato\)/);
 assert.match(read('app/gestionale/moduli/revisioni/page.tsx'),/Possibile duplicato da verificare/);assert.match(read('app/gestionale/moduli/consegne/page.tsx'),/ReturnEditor/);
 assert.match(read('app/gestionale/moduli/attrezzature/page.tsx'),/equipmentState/);
});

test('Similarità revisioni: normalizza maiuscole e spazi ai bordi senza confondere date o attrezzature',()=>{
 const base={attrezzatura_id:'a',data_intervento:'2026-11-25',tipo:'Manutenzione',prossimo_intervento:null};
 const key=h.revisionSimilarityKey(base);
 assert.equal(h.revisionSimilarityKey({...base,tipo:' manutenzione '}),key);
 assert.notEqual(h.revisionSimilarityKey({...base,tipo:'Verifica'}),key);
 assert.notEqual(h.revisionSimilarityKey({...base,attrezzatura_id:'b'}),key);
 assert.notEqual(h.revisionSimilarityKey({...base,data_intervento:'2026-11-26'}),key);
 assert.notEqual(h.revisionSimilarityKey({...base,prossimo_intervento:'2027-01-01'}),key);
 assert.match(read('app/gestionale/moduli/revisioni/page.tsx'),/const key=revisionSimilarityKey/);
});
