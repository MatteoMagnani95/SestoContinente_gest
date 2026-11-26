import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function load(path,deps={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};new Function('exports','require',js)(exports,id=>deps[id]??require(id));return exports;
}
const redirect=path=>{throw new Error('redirect:'+path);};
const form=(values)=>{const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,v);return f;};
test('Autenticazione: spazi della password preservati in login e registrazione; sessione immediata instradata',async()=>{
 const received=[];
 const auth={signInWithPassword:async v=>{received.push(v);return {error:null};},signUp:async v=>{received.push(v);return {data:{session:{}},error:null};}};
 const actions=load('app/actions.ts',{
  '@/lib/registrazione':{informativaRegistrazione:()=>({url:'https://example.test/privacy',versione:'1',test:false})},
  '@/lib/scelte':{versioneImmagini:'1'},'@/lib/application-input':load('lib/application-input.ts'),'@/lib/codice-fiscale':{},'next/navigation':{redirect},'next/cache':{},
  '@/lib/supabase/server':{createClient:async()=>({auth})},'@/lib/security':{},'@/lib/application-config':{},'@/lib/application-review':{},'@/lib/verifica-anagrafica':{}
 });
 const old=process.env.NEXT_PUBLIC_SITE_URL;process.env.NEXT_PUBLIC_SITE_URL='https://example.test';
 try{
  const password='  password 123 ';
  await assert.rejects(actions.loginAction(form({email:' user@example.test ',password})),/redirect:\/smista/);
  await assert.rejects(actions.registerAction(form({email:'user@example.test',password,confirm:password,presa_visione:'on'})),/redirect:\/smista/);
  assert.equal(received[0].password,password);assert.equal(received[1].password,password);
  assert.equal(received[0].email,'user@example.test');
 }finally{if(old===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=old;}
});
test('Istruttore: campo vuoto o manipolato non registra assenze; scelta no esplicita invece salva',async()=>{
 const writes=[];
 const role={select:()=>role,eq:()=>role,maybeSingle:async()=>({data:{ruolo:'istruttore'}})};
 const db={from:table=>table==='ruoli_utente'?role:{upsert:async row=>{writes.push(row);return {error:null};}}};
 const {recordAttendance}=load('app/istruttore/actions.ts',{'next/navigation':{redirect},'next/cache':{revalidatePath:()=>{}},'@/lib/security':{requireUser:async()=>({supabase:db,user:{id:'x'}})}});
 const ids={lezione_id:'11111111-1111-4111-8111-111111111111',persona_id:'22222222-2222-4222-8222-222222222222'};
 for(const presente of ['', 'invalid'])await assert.rejects(recordAttendance(form({...ids,presente})),/redirect:\/istruttore\?msg=errore/);
 assert.equal(writes.length,0);
 await assert.rejects(recordAttendance(form({...ids,presente:'no',nota_didattica:'nota'})),/redirect:\/istruttore\?msg=ok/);
 assert.equal(writes[0].presente,false);assert.equal(writes[0].nota_didattica,'nota');
});
test('Esportazione CSV: protezione delle formule precedute da spazi, tabulazioni o ritorni a capo',async()=>{
 const values=['=1+1','  =1+1','\t@SUM(A1)','\n+1','\uFEFF-1','testo normale','testo "citato"'];
 const query={select:()=>query,order:()=>query,range:async()=>({data:values.map((nome,i)=>({id:String(i),nome})),error:null})};
 const {GET}=load('app/gestionale/esporta/[modulo]/route.ts',{'@/lib/security':{requireStaff:async()=>({supabase:{from:()=>query},user:{}})},'@/lib/modules':{isModuleKey:()=>true,modules:{test:{table:'test',fields:[{name:'nome'}]}}}});
 const response=await GET(new Request('https://example.test'),{params:Promise.resolve({modulo:'test'})});
 assert.equal(response.status,200);
 const csv=await response.text();
 for(const value of values.slice(0,5))assert.ok(csv.includes('"'+ "'" +value+'"'),JSON.stringify(value));
 assert.ok(csv.includes('"testo normale"'));assert.ok(csv.includes('"testo ""citato"""'));
});
test('Area personale: saldo ufficiale della stagione attiva, non somma pagamenti campionati',()=>{
 const s=read('app/area-personale/page.tsx');
 assert.match(s,/from\('stagioni'\).*eq\('attiva',true\)/);
 assert.match(s,/from\('saldi_quote'\).*eq\('stagione_id',season.id\)/);
 assert.match(s,/from\('adesioni'\).*eq\('stagione_id',season.id\)/);
 assert.doesNotMatch(s,/from\('pagamenti'\)/);
 assert.match(s,/quota\.residuo/);
 assert.match(s,/certificato\?persona=\$\{p\.id\}/);
});
test('Report: conteggi esatti e residui ufficiali, finestre di calendario italiane',()=>{
 const s=read('app/gestionale/report/page.tsx');
 assert.match(s,/from\('saldi_quote'\)\.select\('id',\{head:true,count:'exact'\}\)\.gt\('residuo',0\)/);
 assert.match(s,/asRomeISO\(\x60\$\{shiftDay\(cutoff,1\)\}T00:00\x60\)/);
 assert.doesNotMatch(s,/from\('pagamenti'\)/);
});
test('Iscrizioni: paginazione nella stessa sezione, dati incompleti non trasformati in zero',()=>{
 const s=read('app/gestionale/corsi/page.tsx');
 assert.match(s,/iscrizioni\?'\/gestionale\/moduli\/iscrizioni':'\/gestionale\/corsi'/);
 assert.match(s,/href\(base,q,stato,stagione,requested\+1\)/);
 assert.match(s,/enrollmentError\?'—':n/);
 assert.match(read('app/area-personale/corsi/page.tsx'),/p\.id!==editions\?\.find\(e=>e\.id===edition\)\?\.direttore_id/);
});
test('Calendario: tutti gli editor di lezioni esistenti usano il percorso guidato',()=>{
 const page=read('app/gestionale/moduli/[modulo]/page.tsx'),actions=read('app/module-actions.ts');
 assert.match(page,/if\(modulo==='calendario'&&editId\)redirect/);
 assert.match(actions,/if\(key==='calendario'&&id\)redirect/);
});
test('Certificati: modifica diretta non eredita lo stato, ricerca include allievi senza record',()=>{
 const page=read('app/gestionale/moduli/[modulo]/page.tsx');
 assert.match(page,/if\(!editId&&medical&&stato/);
 assert.match(page,/missingQuery\.or\(/);
 assert.match(page,/missingTotal\?\.count/);
});
test('Istruttore: presenza e nota salvate riproposte; valori nulli non diventano assenti',()=>{
 const s=read('app/istruttore/page.tsx');
 assert.match(s,/from\('presenze'\)/);
 assert.match(s,/saved\?\.presente===true\?"si":saved\?\.presente===false\?"no":""/);
 assert.match(s,/saved\?\.nota_didattica/);
 assert.match(s,/from\('documenti'\).*eq\('ambito','didattica'\)/);
});
test('Domanda: nessun avviso di collaudo in produzione; il form mostra quello condizionale',()=>{
 assert.doesNotMatch(read('app/richiesta/nuova/page.tsx'),/Ambiente tecnico di prova/);
 assert.match(read('components/ApplicationForm.tsx'),/\{testMode&&/);
});
test('Selettore iscrizioni: il reset del modulo ripristina anche gli stati React',()=>{
 const s=read('components/EligibleEnrollmentSelect.tsx');assert.match(s,/addEventListener\('reset',reset\)/);assert.match(s,/setEdition\(''\);setPerson\(''\)/);
});
