// Test strutturali offline. NON sostituiscono i test di integrazione PostgreSQL/Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('supabase/migrations/20261111210100_fase1.sql','utf8');
const read=(p)=>readFileSync(p,'utf8');
test('RLS abilitata su tutte le tabelle con dati personali',()=>{
  for(const table of ['richieste','persone','collegamenti_persone','relazioni_tutori','adesioni','eventi_pratica','ruoli_utente'])
    assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security;`));
});
test('Nessuna policy pubblica di modifica diretta delle anagrafiche',()=>{
  assert.doesNotMatch(sql,/create policy .* for (insert|update|delete) to (public|anon|authenticated)/i);
  assert.match(sql,/create or replace function public\.valuta_domanda/);
});
test('Approvazione atomica con protezione duplicati e audit',()=>{
  assert.match(sql,/for update;/);
  assert.match(sql,/persone_cf_univoco/);
  assert.match(sql,/anagrafica potenzialmente duplicata/i);
  assert.match(sql,/insert into public\.eventi_pratica/);
  assert.match(sql,/p_verifiche_confermate/);
});
test('I ruoli vengono verificati lato server',()=>{
  assert.match(read('lib/security.ts'),/requireStaff/);
  assert.match(read('app/actions.ts'),/await requireStaff\(\)/);
});
test('L’origine dei link email è configurata, non basata su header client',()=>{
  const actions=read('app/actions.ts');
  assert.match(actions,/process\.env\.NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(actions,/headers\(\)/);
});
