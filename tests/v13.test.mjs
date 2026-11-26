import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
function load(file,imports){const js=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;const exports={};new Function('exports','require',js)(exports,n=>{if(n in imports)return imports[n];throw Error(`Mock non previsto: ${n}`);});return exports;}
const cf=load('lib/codice-fiscale.ts',{});
const places={ROMA:{belfioreCode:'H501',province:'RM'},BOLOGNA:{belfioreCode:'A944',province:'BO'},FRANCIA:{belfioreCode:'Z110'}};
const verify=load('lib/verifica-anagrafica.ts',{'./codice-fiscale':cf,'@marketto/belfiore-connector-embedded':{},'@marketto/codice-fiscale-utils':{CodiceFiscaleUtils:class {parser={placeToCf:async(_date,place)=>places[place.toUpperCase()]??null};}}});
const identity={nome:'Mario',cognome:'Rossi',data_nascita:'1980-01-01',luogo_nascita:'Roma',provincia_nascita:'RM',stato_nascita:'Italia',sesso_cf:'M',codice_fiscale:'RSSMRA80A01H501U'};
test('CF: vettore noto, data femminile, quattro consonanti, checksum e data impossibile',()=>{
 assert.equal(cf.generaCF({...identity,codice_catastale_nascita:'H501'}),identity.codice_fiscale);
 assert.equal(cf.generaCF({...identity,nome:'Cristina',sesso_cf:'F',codice_catastale_nascita:'H501'}).slice(0,11),'RSSCST80A41');
 assert.throws(()=>cf.generaCF({...identity,data_nascita:'1980-02-30',codice_catastale_nascita:'H501'}));
 const malformed='111111111111111';assert.equal(cf.validaCF(malformed+cf.controlloCF(malformed)),false);
 assert.equal(cf.validaCF('RSSMRA80A01H501A'),false);
});
test('CF: lookup Belfiore (mock), coerenza completa e provincia errata',async()=>{
 assert.equal((await verify.verificaAnagrafica(identity)).status,'ok');
 const noCf=await verify.verificaAnagrafica({...identity,codice_fiscale:''});assert.equal(noCf.code,'H501');assert.equal(noCf.status,'empty');
 assert.equal((await verify.verificaAnagrafica({...identity,provincia_nascita:'BO'})).status,'place');
 assert.equal((await verify.verificaAnagrafica({...identity,luogo_nascita:'Bologna',provincia_nascita:'BO'})).status,'mismatch');
 assert.equal((await verify.verificaAnagrafica({...identity,sesso_cf:''})).status,'incomplete');
 const france=await verify.verificaAnagrafica({...identity,stato_nascita:'Francia',luogo_nascita:'Parigi',provincia_nascita:'',codice_fiscale:''});assert.equal(france.code,'Z110');
});
test('CF: fallback del dataset, validità storica e risultati discordanti',async()=>{
 const record={belfioreCode:'H501',province:' rm ',creationDate:new Date('1884-09-11'),expirationDate:new Date('9999-12-31')};
 const make=fn=>load('lib/verifica-anagrafica.ts',{'./codice-fiscale':cf,'@marketto/belfiore-connector-embedded':{},'@marketto/codice-fiscale-utils':{CodiceFiscaleUtils:class {parser={placeToCf:fn};}}});
 const isoOnly=make(async(date,name)=>date==='1980-01-01'&&name?.toUpperCase()==='ROMA'?record:null);
 assert.equal((await isoOnly.verificaAnagrafica(identity)).status,'ok');
 const fallback=make(async(...args)=>args.length===1&&args[0].toUpperCase()==='ROMA'?record:null);
 assert.equal((await fallback.verificaAnagrafica(identity)).status,'ok');
 assert.equal((await fallback.verificaAnagrafica({...identity,provincia_nascita:'BO'})).status,'place');
 const expired=make(async(...args)=>args.length===1?{...record,expirationDate:new Date('1979-12-31')}:null);
 assert.equal((await expired.verificaAnagrafica(identity)).status,'place');
 const missingDates=make(async(...args)=>args.length===1?{province:'RM',belfioreCode:'H501'}:null);
 assert.equal((await missingDates.verificaAnagrafica(identity)).status,'place');
 const conflict=make(async(...args)=>args.length===1?{...record,belfioreCode:'H502'}:record);
 assert.equal((await conflict.verificaAnagrafica(identity)).status,'place');
});
test('CF: omocodia vera e incongruenza non aggirabile con flag',async()=>{
 const partial=identity.codice_fiscale.slice(0,14)+'M';const omocode=partial+cf.controlloCF(partial);const d={...identity,codice_fiscale:omocode};
 assert.equal((await verify.verificaAnagrafica(d)).status,'omocodia');
 assert.equal((await verify.validaSalvataggioAnagrafica(d,null,false,'')).error,'omocodia');
 assert.equal((await verify.validaSalvataggioAnagrafica(d,null,true,'Tessera sanitaria verificata')).omocodia,true);
 const wrong={...identity,nome:'Luigi'};assert.equal((await verify.validaSalvataggioAnagrafica(wrong,null,true,'Motivo documentato')).error,'cf');
 const legacy={...identity,sesso_cf:'',codice_catastale_nascita:'H501'};const saved=await verify.validaSalvataggioAnagrafica(legacy,legacy,false,'');assert.equal(saved.error,null);assert.equal(saved.code,'H501');
});
test('Home e annullamento: percorso per ruolo, un solo pulsante, nessuna generazione automatica CF',()=>{
 assert.match(read('components/SiteHeader.tsx'),/href=\{homeFor\(access\)\}/);
 assert.match(read('app/smista/page.tsx'),/redirect\('\/gestionale'\)/);
 assert.match(read('components/CancelEditButton.tsx'),/form\.reset\(\)/);
 assert.match(read('components/GlobalCancelButtons.tsx'),/\[data-cancel-form\]/);
 assert.doesNotMatch(read('components/CodiceFiscaleAssist.tsx'),/Genera CF|input\.value\s*=/);
 for(const path of ['app/actions.ts','app/gestionale/soci/actions.ts','app/module-actions.ts'])assert.match(read(path),/verificaAnagrafica|validaSalvataggioAnagrafica/);
});
test('CdA: archivio protetto, versioni in sola lettura, nuova migrazione additiva e blocco modifica dopo apertura votazione',()=>{
 const sql=read('supabase/migrations/20261117190000_archivio_cda_anagrafica.sql');
 assert.match(sql,/public\.is_staff\(\)/);assert.match(sql,/v\.stato<>'bozza'/);assert.match(sql,/FOR UPDATE/);assert.match(sql,/INSERT INTO public\.cda_versioni_bozze/);assert.match(sql,/ENABLE ROW LEVEL SECURITY/);assert.match(sql,/salva_domanda_v12\(/);assert.match(sql,/AFTER UPDATE OF stato ON public\.richieste/);
 assert.doesNotMatch(sql,/\b(TRUNCATE|DROP TABLE|DELETE FROM)\b/i);
 for(const path of ['app/organi-sociali/archivio/page.tsx','app/organi-sociali/archivio/[id]/page.tsx','app/organi-sociali/documento/[id]/route.ts'])assert.match(read(path),/requireBoard/);
 assert.match(read('app/organi-sociali/actions.ts'),/upsert:false/);assert.match(read('lib/cda-pdf.ts'),/NON APPROVATA/);
});

test('CF: placeToCf 3.1.3 restituisce il codice stringa; il lookup inverso deve convalidare provincia e data',async()=>{
 const metadata={belfioreCode:'H501',province:'RM',creationDate:new Date('1884-09-11'),expirationDate:new Date('9999-12-31')};
 const make=(record,dated=true)=>load('lib/verifica-anagrafica.ts',{'./codice-fiscale':cf,'@marketto/belfiore-connector-embedded':{},'@marketto/codice-fiscale-utils':{CodiceFiscaleUtils:class {parser={placeToCf:async(...args)=>((dated||args.length===1)&&args.at(-1)?.toUpperCase()==='ROMA')?'H501':null,cfToBirthPlace:async(code)=>{assert.equal(code.slice(11,15),'H501');assert.equal(code.slice(6,11),'80A01');return record;}};}}});
 assert.equal((await make(metadata).verificaAnagrafica(identity)).status,'ok');
 assert.equal((await make(metadata).verificaAnagrafica({...identity,provincia_nascita:'BO'})).status,'place');
 assert.equal((await make({...metadata,belfioreCode:'H502'}).verificaAnagrafica(identity)).status,'place');
 assert.equal((await make({...metadata,expirationDate:new Date('1979-12-31')}).verificaAnagrafica(identity)).status,'place');
 assert.equal((await make(metadata,false).verificaAnagrafica(identity)).status,'ok');
 assert.equal((await make(null).verificaAnagrafica(identity)).status,'place');
 assert.equal((await make({belfioreCode:'H501',province:'RM'}).verificaAnagrafica(identity)).status,'place');
});
