import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,resolve){const source=readFileSync(new URL(`../${path}`,import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;const exports={};new Function('exports','require',js)(exports,resolve);return exports;}
const cf=load('lib/codice-fiscale.ts',require);
const verification=load('lib/verifica-anagrafica.ts',n=>n==='./codice-fiscale'?cf:require(n));
const d={nome:'Mario',cognome:'Rossi',data_nascita:'1980-01-01',luogo_nascita:'Roma',provincia_nascita:'RM',stato_nascita:'Italia',sesso_cf:'M',codice_fiscale:'RSSMRA80A01H501U'};
// Mantiene il controllo bloccante: se il dataset reale non risolve un luogo noto,
// stampa diagnostica solo su questi dati sintetici, mai sugli utenti.
async function check(label,data,expectedStatus,expectedCode){
 const checked=await verification.verificaAnagrafica(data);
 if(checked.status!==expectedStatus||checked.code!==expectedCode){
  console.error(`Lookup ${label}: ${JSON.stringify(checked)}`);
  try{
   const connector=require('@marketto/belfiore-connector-embedded');
   const {CodiceFiscaleUtils}=require('@marketto/codice-fiscale-utils');
   const parser=new CodiceFiscaleUtils(connector.default??connector).parser;
   for(const [mode,args] of [['ISO',[data.data_nascita,label]],['Date',[new Date(`${data.data_nascita}T12:00:00Z`),label]],['array',[[1980,0,1],label]],['nome',[label]]]){
    try{const p=await parser.placeToCf(...args);console.error(`Belfiore ${label} ${mode}: ${JSON.stringify(p)}`);}catch(e){console.error(`Belfiore ${label} ${mode}: ${String(e)}`);}
   }
  }catch(e){console.error('Diagnostica Belfiore:',String(e));}
 }
 assert.equal(checked.status,expectedStatus,checked.message);
 assert.equal(checked.code,expectedCode,checked.message);
}
await check('Roma',d,'ok','H501');
await check('Bologna',{...d,luogo_nascita:'Bologna',provincia_nascita:'BO',codice_fiscale:''},'empty','A944');
const wrongProvince=await verification.verificaAnagrafica({...d,provincia_nascita:'BO'});
assert.equal(wrongProvince.status,'place','La provincia errata non deve essere accettata');
console.log('ARCHIVIO BELFIORE OK: Roma e Bologna; provincia, codice e vettore CF di controllo coerenti.');
