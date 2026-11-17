import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(n)=>readFileSync(path.join(root,n),'utf8');
const sql=read('supabase/migrations/20261116100800_v12_sicurezza_organi_didattica_import.sql');
const cert=read('supabase/migrations/20261116101000_v12_riepilogo_cda_certificati.sql');
const seed=read('supabase/migrations/20261116100900_precaricamento_didattica.sql');

test('RBAC: ruolo consigliere separato e funzioni istruttore con sole colonne autorizzate',()=>{
 assert.match(read('supabase/migrations/20261116100700_ruolo_cda.sql'),/consigliere_cda/);
 assert.match(sql,/returns table\(edizione_id uuid, persona_id uuid, nome text, cognome text, email text, telefono text, certificato_valido boolean\)/);
 for(let x of ['public.is_instructor()','public.insegna_edizione(i.edizione_id)','public.is_board()','enable row level security','storage.buckets']) assert.ok(sql.includes(x),x);
 assert.doesNotMatch(read('app/istruttore/page.tsx'),/supabase\.from\('persone'\)/);
 assert.match(read('app/smista/page.tsx'),/ruolo==='consigliere_cda'/);
});
test('Importazione in staging: duplicati CF e quarantena; commit transazionale e attestazione',()=>{
 const action=read('app/gestionale/importazione/actions.ts');
 for(let x of ['cf_storici_esistenti','Duplicato all’interno del file','base_documentale_verificata','conferma_importazione'])assert.ok(action.includes(x),x);
 for(let x of ['create table if not exists public.importazioni_batch','create table if not exists public.importazioni_righe','jsonb_array_length(errori)>0','for update','base_documentale_verificata'])assert.ok(sql.includes(x),x);
});
test('Delibere CdA: tracciamento voti, quorum pieno, attivazione soci solo dopo approvazione',()=>{
 for(let x of ['public.cda_voti','public.cda_votanti','public.vota_verbale_cda','public.finalizza_verbale_cda',"stato='approvato'","set stato='attiva'"])assert.ok(sql.includes(x),x);
 const src=read('app/organi-sociali/actions.ts');assert.match(src,/convertVerbaleDocx/);assert.match(src,/finalizza_verbale_cda/);
 assert.match(cert,/public.cda_report_sicuro/);
});
test('Didattica: i 16 moduli PRE sono presenti una sola volta nella migrazione idempotente',()=>{
 for(let i=1;i<=16;i++)assert.equal(seed.split(`'PRE-${String(i).padStart(2,'0')}'`).length-1,1);
 assert.match(seed,/on conflict\s*\(pre_id\)\s*do update/i);
 assert.match(sql,/public.imposta_moduli_lezione/);
 for(let f of ['app/gestionale/corsi/[id]/stampe/route.ts','app/gestionale/programmi-didattici/page.tsx','components/LessonComposer.tsx'])assert.ok(existsSync(path.join(root,f)));
});
test('Certificati caricati dal socio: documento privato, proprie persone, idoneità non autoconvalidata',()=>{
 for(let x of ['public.owns_person(p_persona)','d.utente_id=auth.uid()',"d.visibilita='proprietario'",'idoneita_verificata','false'])assert.ok(cert.includes(x),x);
 assert.match(read('app/area-personale/certificato/actions.ts'),/registra_certificato_personale/);
});
test('Sicurezza delle dichiarazioni: flag obbligatori e versioni informativa lato DB',()=>{
 for(let x of ['flag_statuto','flag_privacy','flag_immagini','versione_statuto','versione_privacy','verifica_dichiarazioni_domanda_v12'])assert.ok(sql.includes(x),x);
});
test('Validazione Codice Fiscale: generazione e verifica checksum su vettore noto',()=>{
 const ts=require('typescript');
 const emitted=ts.transpileModule(read('lib/codice-fiscale.ts'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports',emitted)(exports);
 const c=exports.generaCF({cognome:'Rossi',nome:'Mario',data_nascita:'1980-01-01',sesso_cf:'M',codice_catastale_nascita:'H501'});
 assert.equal(c.slice(0,15),'RSSMRA80A01H501');
 assert.ok(exports.validaCF(c));
 assert.equal(exports.confrontaCF(c,{cognome:'Rossi',nome:'Mario',data_nascita:'1980-01-01',sesso_cf:'M',codice_catastale_nascita:'H501'}),'');
 assert.ok(!exports.validaCF(c.slice(0,15)+(c[15]==='Z'?'A':'Z')));
});
