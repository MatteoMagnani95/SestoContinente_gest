import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const file=(path)=>readFileSync(new URL(path,root),'utf8');
test('view con sicurezza invoker e senza privilegi anon',()=>{
 const sql=file('supabase/migrations/20261111210300_schede_soci.sql');
 assert.match(sql,/security_invoker\s*=\s*true/i);
 assert.match(sql,/revoke all on public\.schede_soci from public, anon/i);
 assert.match(sql,/grant select on public\.schede_soci to authenticated/i);
 assert.doesNotMatch(sql,/drop table|truncate table|delete from/i);
});
test('l’elenco soci usa ricerca, filtri e paginazione server',()=>{
 const source=file('app/gestionale/soci/page.tsx');
 for(const token of ['schede_soci','count:\'exact\'','range(','codice_fiscale.ilike','stagione_id'])assert.ok(source.includes(token),token);
});
test('schede protette da requireStaff e navigabili per UUID',()=>{
 const source=file('app/gestionale/soci/[id]/page.tsx');
 assert.match(source,/requireStaff\(\)/);
 assert.match(source,/uuid\.test\(id\)/);
 for(const table of ['adesioni','saldi_quote','pagamenti','iscrizioni_corsi','certificati_medici','brevetti_allievi','documenti','relazioni_tutori'])
  assert.ok(source.includes(`.from('${table}')`),table);
});
test('la modifica del socio è limitata allo staff e ai campi autorizzati',()=>{
 const src=file('app/gestionale/soci/actions.ts');
 assert.match(src,/requireStaff\(\)/);
 assert.match(src,/\.eq\('id',id\)/);
 assert.ok(!src.includes('service_role'));
 assert.ok(!src.includes('password'));
 assert.match(src,/da_perfezionare/);
});
test('è presente una prova RLS a due identità senza modifiche',()=>{
 const src=file('scripts/test-rls-due-soci.mjs');
 assert.match(src,/TEST_SOCIO_B_PASSWORD/);
 assert.doesNotMatch(src,/service_role|\.post\(|\.patch\(|\.delete\(/i);
 assert.ok(existsSync(new URL('supabase/verifiche/fase3_verifiche_sola_lettura.sql',root)));
});
