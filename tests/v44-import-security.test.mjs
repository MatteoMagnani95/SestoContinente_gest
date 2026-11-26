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

test('Staging: invia tutte le righe in una sola richiesta e verifica eventuale risposta incerta',async()=>{
 const code=ts.transpileModule(readFileSync(new URL('../app/gestionale/importazione/actions.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const make=({rowsError=null,count=201,checkError=null}={})=>{
  const writes=[],parsed=Array.from({length:201},(_,i)=>({codice_fiscale:'CF'+i,nome:'A',cognome:'B'}));
  const supabase={rpc:async()=>({data:[]}),from(table){
   if(table==='importazioni_batch')return {insert:()=>({select:()=>({single:async()=>({data:{id:'batch'}})})})};
   if(table==='importazioni_righe')return {insert:async rows=>{writes.push(rows);return {error:rowsError};},select:()=>({eq:async()=>({count,error:checkError})})};
   throw Error('unexpected table '+table);
  }};
  const deps={'next/navigation':{redirect:where=>{throw Error('REDIRECT '+where);}},'next/cache':{revalidatePath:()=>{}},'@/lib/import-file':{parseHistoricalFile:async()=>({rows:parsed,error:null})},'@/lib/security':{requireStaff:async()=>({supabase,user:{id:'staff'}})},'@/lib/importazione':{headings:()=>columns,normalizzaRiga:r=>r,erroriRiga:()=>[]}};
  const exported={};new Function('exports','require',code)(exported,id=>deps[id]??require(id));
  const form=new FormData();form.set('tipo','soci');form.set('file',new File(['test'],'test.csv'));
  return {writes,run:()=>exported.stageImport(form)};
 };
 for(const cfg of [{},{rowsError:{code:'NETWORK'}}]){
  const m=make(cfg);await assert.rejects(m.run(),/REDIRECT \/gestionale\/importazione\?batch=batch/);
  assert.equal(m.writes.length,1);assert.equal(m.writes[0].length,201);
 }
 for(const cfg of [{rowsError:{code:'NETWORK'},count:100},{rowsError:{code:'NETWORK'},checkError:{code:'NETWORK'}}]){
  const m=make(cfg);await assert.rejects(m.run(),/REDIRECT \/gestionale\/importazione\?msg=database/);
  assert.equal(m.writes.length,1);assert.equal(m.writes[0].length,201);
 }
});
