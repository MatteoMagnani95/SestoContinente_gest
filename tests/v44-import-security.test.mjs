import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ExcelJS from 'exceljs';
const require=createRequire(import.meta.url),ts=require('typescript');
const js=ts.transpileModule(readFileSync(new URL('../lib/import-file.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const exports={};new Function('exports','require',js)(exports,require);
const {parseHistoricalFile}=exports;
const columns=['nome','cognome'];
const csv=(text)=>parseHistoricalFile(Buffer.from(text),'prova.csv',columns);
async function xlsx(rows){
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Collaudo');
 for(const row of rows)sheet.addRow(row);
 return parseHistoricalFile(Buffer.from(await workbook.xlsx.writeBuffer()),'prova.xlsx',columns);
}
test('CSV: colonne sconosciute non diventano proprietà, valori quotati conservati',async()=>{
 const result=await csv('\uFEFFnome,cognome,__proto__,constructor,prototype,extra\n"Mario, Test",Rossi,maligno,maligno,maligno,altro');
 assert.equal(result.error,null);
 assert.deepEqual(Object.keys(result.rows[0]),columns);
 assert.equal(result.rows[0].nome,'Mario, Test');
 assert.equal(result.rows[0].cognome,'Rossi');
 assert.equal(Object.getPrototypeOf(result.rows[0]),Object.prototype);
});
test('CSV: intestazioni duplicate, mancanti e oltre 1000 record rifiutati',async()=>{
 assert.equal((await csv('nome,nome,cognome\nA,B,C')).error,'intestazioni');
 assert.equal((await csv('nome,altro\nA,B')).error,'intestazioni');
 assert.equal((await csv('nome,cognome\n'+'A,B\n'.repeat(1000))).rows.length,1000);
 assert.equal((await csv('nome,cognome\n'+'A,B\n'.repeat(1001))).error,'righe');
});
test('ExcelJS: roundtrip reale e allowlist intestazioni, duplicate e mancanti',async()=>{
 const result=await xlsx([['nome','cognome','__proto__','extra'],['Anna','Rossi','maligno','extra']]);
 assert.equal(result.error,null);
 assert.deepEqual(Object.keys(result.rows[0]),columns);
 assert.equal(result.rows[0].nome,'Anna');
 assert.equal(result.rows[0].cognome,'Rossi');
 assert.equal(Object.getPrototypeOf(result.rows[0]),null);
 assert.equal((await xlsx([['nome','cognome','nome'],['A','B','C']])).error,'intestazioni');
 assert.equal((await xlsx([['nome','extra'],['A','B']])).error,'intestazioni');
});
test('ExcelJS: rifiuta fogli troppo estesi senza importazione parziale',async()=>{
 const workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet('Collaudo');
 sheet.addRow(columns);sheet.getCell('A1002').value='Fuori limite';
 const result=await parseHistoricalFile(Buffer.from(await workbook.xlsx.writeBuffer()),'prova.xlsx',columns);
 assert.equal(result.error,'righe');
});

test('Staging: una sola RPC atomica per lotto e tutte le righe, esito non confermato bloccato',async()=>{
 const code=ts.transpileModule(readFileSync(new URL('../app/gestionale/importazione/actions.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const make=({rpcError=null,batch='00000000-0000-4000-8000-000000000001'}={})=>{
  const writes=[],parsed=Array.from({length:201},(_,i)=>({codice_fiscale:'CF'+i,nome:'A',cognome:'B'}));
  const supabase={rpc:async(name,payload)=>{
   if(name==='cf_storici_esistenti')return {data:[]};
   if(name==='crea_anteprima_importazione'){writes.push(payload);return {data:batch,error:rpcError};}
   throw Error('unexpected RPC '+name);
  },from(){throw Error('staging must not write tables separately');}};
  const deps={'next/navigation':{redirect:where=>{throw Error('REDIRECT '+where);}},'next/cache':{revalidatePath:()=>{}},'@/lib/import-file':{parseHistoricalFile:async()=>({rows:parsed,error:null})},'@/lib/security':{requireStaff:async()=>({supabase,user:{id:'staff'}})},'@/lib/importazione':{headings:()=>columns,normalizzaRiga:r=>r,erroriRiga:()=>[]}};
  const exported={};new Function('exports','require',code)(exported,id=>deps[id]??require(id));
  const form=new FormData();form.set('tipo','soci');form.set('file',new File(['test'],'test.csv'));
  return {writes,run:()=>exported.stageImport(form)};
 };
 const success=make();await assert.rejects(success.run(),/REDIRECT \/gestionale\/importazione\?batch=00000000/);
 assert.equal(success.writes.length,1);assert.equal(success.writes[0].p_righe.length,201);
 assert.equal(success.writes[0].p_tipo,'soci');assert.equal(success.writes[0].p_base_documentale,false);
 for(const cfg of [{rpcError:{code:'NETWORK'}},{batch:null}]){
  const m=make(cfg);await assert.rejects(m.run(),/REDIRECT \/gestionale\/importazione\?msg=database/);
  assert.equal(m.writes.length,1);assert.equal(m.writes[0].p_righe.length,201);
 }
});

test('Importazione: date reali e UUID edizione normalizzati',()=>{
 const source=readFileSync(new URL('../lib/importazione.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const lib={};new Function('exports','require',js)(lib,id=>id==='./codice-fiscale'?{validaCF:()=>true}:require(id));
 for(const date of ['2025-02-29','2026-04-31','2026-13-01','0000-01-01']){
  assert.ok(lib.erroriRiga({nome:'A',cognome:'B',data_nascita:date},'soci').some(e=>e.includes('Data nascita')));
 }
 assert.deepEqual(lib.erroriRiga({nome:'A',cognome:'B',data_nascita:'2024-02-29'},'soci'),[]);
 const row=lib.normalizzaRiga({edizione_id:'ABCDEF01-1234-4000-8000-ABCDEF012345',data_brevetto:'2026-02-30'},'corsi');
 assert.equal(row.edizione_id,'abcdef01-1234-4000-8000-abcdef012345');
 assert.ok(lib.erroriRiga(row,'corsi').some(e=>e.includes('Data brevetto')));
});
test('Importazione corsi: lookup in blocchi, nessuna query UUID invalida',async()=>{
 const code=ts.transpileModule(readFileSync(new URL('../app/gestionale/importazione/actions.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const ids=Array.from({length:201},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
 const parsed=[...ids,'invalido'].map((edizione_id,i)=>({edizione_id,codice_fiscale:'CF'+i,brevetto:''}));
 const reads=[],writes=[];
 const supabase={rpc:async(name,payload)=>{
  if(name==='cf_storici_esistenti')return {data:parsed.map(r=>({codice_fiscale:r.codice_fiscale}))};
  if(name==='crea_anteprima_importazione'){writes.push(payload);return {data:ids[0]};}
  throw Error('unexpected RPC '+name);
 },from(table){
  assert.equal(table,'edizioni_corsi');
  return {select:()=>({in:async(field,values)=>{assert.equal(field,'id');reads.push(values);return {data:values.map(id=>({id}))};}})};
 }};
 const deps={'next/navigation':{redirect:where=>{throw Error('REDIRECT '+where);}},'next/cache':{revalidatePath:()=>{}},'@/lib/import-file':{parseHistoricalFile:async()=>({rows:parsed,error:null})},'@/lib/security':{requireStaff:async()=>({supabase})},'@/lib/importazione':{headings:()=>columns,normalizzaRiga:r=>r,erroriRiga:()=>[],IMPORT_EDITION_UUID:/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i}};
 const exported={};new Function('exports','require',code)(exported,id=>deps[id]??require(id));
 const form=new FormData();form.set('tipo','corsi');form.set('file',new File(['test'],'test.csv'));
 await assert.rejects(exported.stageImport(form),/REDIRECT \/gestionale\/importazione\?batch=/);
 assert.deepEqual(reads.map(r=>r.length),[100,100,1]);assert.deepEqual(reads.flat(),ids);
 assert.equal(writes.length,1);assert.equal(writes[0].p_righe.length,202);
 assert.deepEqual(writes[0].p_righe[0].errori,[]);assert.ok(writes[0].p_righe.at(-1).errori.includes('Edizione corso non trovata'));
});
