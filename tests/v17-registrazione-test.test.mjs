import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const exports={};new Function('exports',ts.transpileModule(read('lib/application-config.ts'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText)(exports);
const {applicationLegalConfig:config,isTestApplication}=exports;
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const real={STATUTO_VERSION:'1',PRIVACY_VERSION:'1',NEXT_PUBLIC_STATUTO_URL:'https://example.org/statuto.pdf',NEXT_PUBLIC_PRIVACY_URL:'https://example.org/privacy.pdf'};
test('Collaudo disattivato per default; configurazione reali ancora obbligatoria',()=>{
 assert.equal(config(a,{}).configured,false);assert.equal(config(a,real).configured,true);
 assert.equal(config(a,{...real,PRIVACY_VERSION:'DA_CONFIGURARE'}).configured,false);
 assert.equal(config(a,{...real,STATUTO_VERSION:'TEST-COLLAUDO-1'}).configured,false);
 assert.equal(config(a,{...real,NEXT_PUBLIC_PRIVACY_URL:'javascript:alert(1)'}).configured,false);
});
test('Collaudo globale per ogni UUID autenticato; documenti di prova separati dalle versioni reali',()=>{
 const env={SESTO_TEST_MODE:'true'};const c=config(a,env);
 assert.equal(c.configured,true);assert.equal(c.testMode,true);assert.equal(c.statutoVersion,'TEST-COLLAUDO-1');assert.match(c.privacyUrl,/documenti-test/);
 assert.equal(config(b,env).testMode,true);assert.equal(config('',env).testMode,false);assert.equal(config('not-an-id',env).testMode,false);
 assert.equal(config(a,{...real,...env}).testMode,true);assert.equal(config(a,real).testMode,false);
 assert.equal(isTestApplication({versione_statuto:c.statutoVersion}),true);assert.equal(isTestApplication({versione_statuto:'1'}),false);
});
test('Disattivazione esplicita; vecchia allowlist ignorata e nessun valore ambiguo abilita il collaudo',()=>{
 for(const value of ['false','0','1','yes','',undefined])assert.equal(config(a,{SESTO_TEST_MODE:value,SESTO_TEST_USER_IDS:a}).testMode,false);
 assert.equal(config(a,{...real,SESTO_TEST_MODE:'false',SESTO_TEST_USER_IDS:a}).configured,true);
 assert.equal(config(a,{SESTO_TEST_MODE:'false'}).configured,false);
});
test('Identità dal server, documenti fittizi protetti, tracciatura nelle schermate',()=>{
 const action=read('app/actions.ts'),page=read('app/richiesta/documenti-test/page.tsx');
 assert.match(action,/applicationLegalConfig\(user\.id\)/);assert.match(action,/p_versione_statuto:legal\.statutoVersion/);assert.match(action,/p_versione_immagini:legal\.testMode\?'TEST-COLLAUDO-1':versioneImmagini/);
 assert.match(action,/isTestApplication\(prior\)!==legal\.testMode/);assert.match(page,/requireUser\(\)/);assert.match(page,/!applicationLegalConfig\(user\.id\)\.testMode\)notFound/);
 for(const p of ['app/richiesta/stato/page.tsx','app/gestionale/richieste/page.tsx','app/gestionale/richieste/[id]/page.tsx'])assert.match(read(p),/isTestApplication\(r\)/);
});
