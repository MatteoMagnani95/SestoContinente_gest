import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const old=read('supabase/migrations/20261118001500_eliminazione_completa_account.sql');
const fix=read('supabase/migrations/20261118004000_fix_ambiguita_eliminazione_account.sql');
const body=(s,n)=>s.split('CREATE OR REPLACE FUNCTION public.'+n+'(')[1].split('END; $$;')[0];
const locals=['persone','pratiche','escluse','adesioni','iscrizioni','quote','addebiti','pagamenti','documenti','cfs'];
test('0017 changes only local variable identifiers in both functions and preserves the deletion plan',()=>{
 for(const n of ['admin_piano_eliminazione_0016','admin_avvia_eliminazione_account']){
  const patched=body(fix,n);
  assert.equal(patched.replace(new RegExp('\\bv_('+locals.join('|')+')\\b','g'),'$1'),body(old,n));
  for(const local of locals) assert.match(patched,new RegExp('\\bv_'+local+'\\s+(uuid|text)\\[\\]'));
  assert.doesNotMatch(patched,/ANY\(persone\)/);
 }
 assert.match(fix,/REVOKE ALL ON FUNCTION public\.admin_piano_eliminazione_0016\(uuid\) FROM PUBLIC,anon,authenticated/);
});
test('Preview errors show a diagnostic code without exposing raw SQL errors',()=>{
 const p=read('app/gestionale/utenti/[id]/elimina/page.tsx');
 assert.match(p,/diagnosticCode==='42702'/);assert.match(p,/codice \{diagnosticCode\}/);assert.doesNotMatch(p,/\{error\.message\}/);
});
