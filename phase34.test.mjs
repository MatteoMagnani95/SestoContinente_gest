import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const sql=read('supabase/migrations/0006_incassi_controllati.sql');
const code=read('app/gestionale/incassi/actions.ts');
const page=read('app/gestionale/incassi/page.tsx');
const pure={};
const js=ts.transpileModule(read('lib/payment-tools.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
new Function('exports',js)(pure);

test('Validazione importi: centesimi esatti, separatori, zero, negativo, notazione esponenziale',()=>{
 assert.equal(pure.paymentAmount('12,50'),12.5);
 assert.equal(pure.paymentAmount('0.01'),0.01);
 assert.equal(pure.paymentAmount('100'),100);
 for(const invalid of ['0','-10','1.234','0,001','1e5','NaN','','100.','1 000','10000000'])
  assert.equal(pure.paymentAmount(invalid),null,invalid);
});
test('Validazione date: anni bisestili e giorni inesistenti',()=>{
 assert.equal(pure.validPaymentDate('2028-02-29'),true);
 for(const invalid of ['2026-02-29','2026-13-01','2026-04-31','2026-1-1',''])
  assert.equal(pure.validPaymentDate(invalid),false,invalid);
});
test('Migrazione additiva, aggregazioni a livello DB, senza modificare movimenti storici',()=>{
 assert.match(sql,/add column if not exists idempotency_key uuid/i);
 assert.match(sql,/create unique index if not exists pagamenti_idempotency_key_unica/);
 assert.match(sql,/view public\.saldi_corsi with \(security_invoker=true\)/);
 assert.match(sql,/view public\.saldi_quote with \(security_invoker=true\)/);
 assert.match(sql,/sum\(p\.importo\)/);
 assert.doesNotMatch(sql,/truncate|drop table|delete from public\.pagamenti|delete from public\.movimenti_economici/i);
});
test('Solo RPC guidata con RLS senza insert diretta, ruoli verificati nel database',()=>{
 assert.match(sql,/drop policy if exists pagamenti_ins on public\.pagamenti/);
 assert.match(sql,/function public\.registra_pagamento_guidato/);
 assert.match(sql,/security definer set search_path = ''/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/public\.is_staff\(\)/);
 assert.match(sql,/grant execute on function public\.registra_pagamento_guidato[\s\S]*?to authenticated/);
 assert.match(code,/await requireStaff\(\)/);
 assert.match(code,/\.rpc\('registra_pagamento_guidato'/);
 assert.match(read('app/module-actions.ts'),/if\(key==='pagamenti'\) redirect\('\/gestionale\/incassi'\)/);
});
test('Concorrenza, idempotenza, impedimento del sovrapagamento',()=>{
 assert.match(sql,/for update of a/);
 assert.match(sql,/where (?:q\.)?id=new\.quota_id for update/);
 assert.match(sql,/new\.importo > v_dovuto-v_versato/);
 assert.match(sql,/idempotency_key=p_richiesta_id/);
 assert.match(sql,/v_riga\.registrato_da is distinct from v_utente/);
 assert.match(sql,/if new\.importo_dovuto<v_versato/);
 assert.match(sql,/before update of importo_dovuto/);
});
test('Interfaccia con saldi paginati e avviso di registrazione irreversibile',()=>{
 assert.match(page,/\.range\(\(page-1\)\*perPage,page\*perPage-1\)/);
 assert.match(page,/name="richiesta_id" value=\{randomUUID\(\)\}/);
 assert.match(page,/Le registrazioni sono definitive/);
 assert.match(read('components/StaffNav.tsx'),/\/gestionale\/incassi/);
 assert.match(read('app/gestionale/soci\/\[id\]\/page.tsx'),/\/gestionale\/incassi\?persona=/);
});
test('Conferma esplicita di operazione contabile prima della scrittura',()=>{
 assert.match(code,/form\.get\('conferma'\)!=='on'/);
 assert.match(page,/name="conferma" required/);
 assert.match(page,/Registra definitivamente/);
});
