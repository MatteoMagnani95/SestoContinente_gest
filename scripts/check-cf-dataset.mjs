import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
function load(path,resolve){const source=readFileSync(new URL(`../${path}`,import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;const exports={};new Function('exports','require',js)(exports,resolve);return exports;}
const cf=load('lib/codice-fiscale.ts',require);
const verification=load('lib/verifica-anagrafica.ts',n=>n==='./codice-fiscale'?cf:require(n));
const d={nome:'Mario',cognome:'Rossi',data_nascita:'1980-01-01',luogo_nascita:'Roma',provincia_nascita:'RM',stato_nascita:'Italia',sesso_cf:'M',codice_fiscale:'RSSMRA80A01H501U'};
const checked=await verification.verificaAnagrafica(d);assert.equal(checked.status,'ok',checked.message);assert.equal(checked.code,'H501');
const other=await verification.verificaAnagrafica({...d,luogo_nascita:'Bologna',provincia_nascita:'BO',codice_fiscale:''});assert.equal(other.code,'A944',other.message);
console.log('ARCHIVIO BELFIORE OK: Roma e Bologna; vettore CF di controllo coerente.');
