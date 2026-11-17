import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261117210000_iscrizioni_rimozioni_ordinamento.sql');
const generic=read('app/gestionale/moduli/[modulo]/page.tsx');
const detail=read('app/gestionale/corsi/[id]/page.tsx');
test('Iscrizioni: requisito comune per richiesta e conferma, solo stato iscritto per nuova iscrizione staff',()=>{
 assert.match(sql,/a\.stato='attiva'/);assert.match(sql,/t\.adesione_id=a\.id AND t\.stato='attiva'/);assert.match(sql,/t\.scade_il >= \(now\(\) AT TIME ZONE 'Europe\/Rome'\)::date/);assert.match(sql,/NEW\.stato IN \('in_attesa','iscritto'\)/);assert.match(sql,/s\.stagione_id=v_stagione/);
 assert.match(detail,/activeIds\.has\(person.id\)&&!currentIds\.has\(person.id\)/);assert.match(detail,/name="stato" value="iscritto"/);assert.match(read('app/gestionale/corsi/actions.ts'),/if\(stato!=='iscritto'\)/);assert.match(generic,/EligibleEnrollmentSelect/);assert.match(read('app/area-personale/corsi/page.tsx'),/eligibleFor\(e\.stagione_id,e\.id\)/);
});
test('Rimozioni: RPC autorizzata e whitelist; FK incluse quelle a cascata; una sola riga',()=>{
 const action=read('app/module-actions.ts');assert.match(sql,/auth\.uid\(\) IS NULL OR NOT coalesce\(public\.is_staff\(\),false\)/);assert.match(sql,/p_tabella NOT IN \(/);assert.match(sql,/c\.contype='f' AND c\.confrelid=target/);assert.match(sql,/FOR UPDATE/);assert.match(sql,/affected<>1/);assert.match(sql,/pagamento_id IS NOT NULL/);assert.match(sql,/p_tabella='richieste'.*stato='approvata'/);assert.match(sql,/REVOKE ALL ON FUNCTION public\.rimuovi_record_gestionale.*FROM PUBLIC, anon/);assert.match(action,/form\.get\('conferma'\)!=='on'/);assert.match(action,/mod\?\.appendOnly/);assert.match(generic,/<RemoveRecord moduleKey=\{modulo\}/);
});
test('Elenco anagrafiche e adesioni e schede collegate: Rimuovi, con conferma',()=>{
 const component=read('components/RemoveRecord.tsx');assert.match(component,/>Rimuovi<\/summary>/);assert.match(component,/name="conferma" required/);assert.match(read('app/gestionale/soci/page.tsx'),/moduleKey="adesioni"/);assert.match(read('app/gestionale/soci/[id]/page.tsx'),/moduleKey="anagrafiche"/);assert.match(read('app/gestionale/richieste/page.tsx'),/moduleKey="richieste"/);
});
test('Ordinamento prima della paginazione e viste RLS invoker',()=>{
 assert.match(sql,/gest_elenco_adesioni WITH \(security_invoker=true\)/);assert.match(sql,/gest_elenco_tesseramenti WITH \(security_invoker=true\)/);assert.match(sql,/gest_elenco_addebiti_corsi WITH \(security_invoker=true\)/);assert.match(generic,/query=query\.order\(primary[\s\S]*query\.order\(personSorted\?'sort_nome':'nome'[\s\S]*query\.order\('id'[\s\S]*\.range\(/);assert.match(read('app/gestionale/incassi/page.tsx'),/order\('sort_cognome'\)\.order\('sort_nome'\)/);assert.match(read('app/gestionale/richieste/page.tsx'),/order\('cognome'\)\.order\('nome'\)/);
});

test('CdA: rimozione logica con conservazione documentale, nessun file cancellato; bozze rimosse non modificabili',()=>{
 assert.match(sql,/p_tabella='cda_verbali' THEN[\s\S]*UPDATE public\.cda_verbali SET rimosso_il=now\(\)[\s\S]*stato='bozza' AND rimosso_il IS NULL/);assert.match(sql,/OLD\.rimosso_il IS NOT NULL THEN RAISE EXCEPTION/);assert.match(read('app/organi-sociali/page.tsx'),/\.is\('rimosso_il',null\)/);assert.match(read('app/organi-sociali/archivio/page.tsx'),/Bozze rimosse/);
});
test('Ruoli: revoca amministrativa con protezione amministratore e quorum; nessuna cancellazione di account',()=>{
 assert.match(sql,/public\.rimuovi_ruolo_gestionale/);assert.match(sql,/p_utente=auth\.uid\(\) OR \(SELECT count\(\*\) FROM public\.ruoli_utente WHERE ruolo='amministratore'\)<=1/);assert.match(sql,/v\.stato='in_approvazione'/);assert.doesNotMatch(sql,/DELETE FROM auth\.users/i);assert.match(read('app/gestionale/utenti/page.tsx'),/action=\{removeRole\}/);
});
