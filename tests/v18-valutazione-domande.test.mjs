import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const exports={};new Function('exports',ts.transpileModule(read('lib/application-review.ts'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText)(exports);
const {decisionValidation:validate,declarationCheck,seasonCheck,duplicateCheck,escapeReviewPattern,reviewError}=exports;
const complete={presa_visione:true,flag_statuto:true,flag_privacy:true,versione_statuto:'TEST-COLLAUDO-1',versione_privacy:'TEST-COLLAUDO-1'};
const page=read('app/gestionale/richieste/[id]/page.tsx'),form=read('components/ApplicationReviewForm.tsx'),action=read('app/actions.ts');
test('Approvazione: conferma esplicita necessaria anche lato server, non per le altre decisioni',()=>{
 assert.match(validate('approvata',false,'',''),/Conferma/);assert.equal(validate('approvata',true,'',''),null);
 assert.equal(validate('integrazione',false,'Integrare il documento',''),null);assert.equal(validate('respinta',false,'','Motivazione valida'),null);
 assert.match(validate('integrazione',true,'  breve  ',''),/10 caratteri/);assert.match(validate('respinta',true,'',' '),/10 caratteri/);assert.match(validate('bozza',true,'',''),/valida/);
 assert.match(action,/await requireStaff\(\)[\s\S]*decisionValidation\(action,confirmed,message,internal\)[\s\S]*supabase\.rpc\('valuta_domanda'/);
 assert.match(action,/p_verifiche_confermate: confirmed/);assert.match(form,/disabled=\{pending\|\|!confirmed\|\|blocked\}/);
 assert.equal((form.match(/disabled=\{pending\}>Chiedi integrazione/g)||[]).length,1);assert.match(form,/disabled=\{pending\}>Respingi/);
});
test('Dichiarazioni: identifica flag, versione o presa visione mancanti; collaudo non confuso con documenti ufficiali',()=>{
 assert.equal(declarationCheck(complete).status,'ok');
 for(const key of Object.keys(complete)){const r={...complete,[key]:null};assert.equal(declarationCheck(r).status,'blocked',key);}
 assert.equal(declarationCheck({...complete,versione_privacy:'DA_CONFIGURARE'}).status,'blocked');assert.equal(declarationCheck({...complete,versione_statuto:'   '}).status,'blocked');
 assert.match(page,/isTestApplication\(r\)/);assert.match(form,/Approva \(collaudo\)/);assert.match(page,/approvata \(collaudo\)/);
});
test('Precontrolli: stagione, duplicati, errori di lettura e pattern letterali',()=>{
 assert.equal(seasonCheck(1,false).status,'ok');assert.equal(seasonCheck(0,false).status,'blocked');assert.equal(seasonCheck(2,false).status,'blocked');assert.equal(seasonCheck(null,true).status,'unknown');
 assert.equal(duplicateCheck([0,0],false).status,'ok');assert.equal(duplicateCheck([1,null],true).status,'blocked');assert.equal(duplicateCheck([0,null],true).status,'unknown');
 assert.equal(escapeReviewPattern('A%_\\B'),'A\\%\\_\\\\B');assert.match(page,/count:'exact',head:true/);assert.match(page,/escapeReviewPattern\(r\.cognome\)/);
});
test('Errori di valutazione: decodifica eccezioni note, codici SQL e nessuna esposizione delle informazioni grezze',()=>{
 for(const [msg,key] of [['Confermare le verifiche preliminari','verifiche'],['Domanda non in verifica','stato'],['Configurare una stagione attiva','stagione'],['Presa visione mancante','documentazione'],['Anagrafica potenzialmente duplicata: approvazione bloccata','duplicato']])assert.equal(reviewError({code:'P0001',message:msg}).key,key);
 for(const [code,key] of [['23505','univocita'],['23503','relazione'],['23514','vincolo'],['42501','permessi'],['PGRST202','migrazioni'],['40P01','concorrenza'],['xxxxx','database']]){
   const r=reviewError({code,message:'dato privato CF 123'});assert.equal(r.key,key);assert.doesNotMatch(r.message,/dato privato|123/);
 }
 assert.equal(reviewError({code:'P0001',message:'__proto__'}).key,'database');assert.match(action,/reason:mapped.key/);assert.doesNotMatch(action,/console\.error\('valuta_domanda non completata',error\)/);
});
test('Modulo conservativo: mantiene note e checkbox su errore, evita doppi invii, successo solo dopo RPC',()=>{
 assert.match(form,/e\.preventDefault\(\)/);assert.match(form,/if\(submitting\.current\)return/);assert.match(form,/value=\{message\}/);assert.match(form,/value=\{note\}/);assert.match(form,/if\(result\.error\)\{setError\(result\.error\);return;\}/);assert.match(form,/if\(!succeeded\)\{submitting\.current=false;setPending\(false\);\}/);
 assert.match(action,/if \(error\) \{[\s\S]*return \{error:`\$\{mapped.message\}/);assert.match(page,/msg!==\'approvata\'\|\|r.stato===\'approvata\'/);
});
