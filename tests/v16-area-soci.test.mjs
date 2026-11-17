import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261117223000_area_soci_eventi.sql');
const section=(start,end)=>sql.slice(sql.indexOf(`FUNCTION public.${start}`),sql.indexOf(`FUNCTION public.${end}`));
test('Area soci: titolare, adesione attiva, stagione nei suoi termini, quota saldata; nessuna eccezione solo per ruolo',()=>{
 const access=section('area_soci_persona_attiva','area_soci_accesso');
 assert.match(access,/a\.stato='attiva' AND s\.attiva/);
 assert.match(access,/BETWEEN s\.dal AND s\.al/);assert.match(access,/q\.importo_dovuto <= COALESCE\(\(SELECT sum\(p\.importo\)/);
 assert.match(access,/c\.utente_id=auth\.uid\(\) AND c\.relazione='titolare'/);assert.doesNotMatch(access,/is_staff/);
 assert.match(read('app/area-soci/page.tsx'),/if\(!people\.length\)return/);assert.match(read('components/SiteHeader.tsx'),/access\.data===true/);
});
test('Capienza: lock condiviso, indice univoco per richieste attive, prenotazioni in attesa occupano posti',()=>{
 const booking=section('area_soci_iscrivi','area_soci_decidi');
 assert.match(booking,/FOR UPDATE[\s\S]*count\(\*\)[\s\S]*>=e\.posti[\s\S]*INSERT INTO public\.eventi_soci_iscrizioni/);
 assert.match(booking,/revisione_prenotazioni=revisione_prenotazioni\+1/);assert.match(sql,/CREATE UNIQUE INDEX eventi_soci_una_prenotazione[\s\S]*WHERE stato IN \('in_attesa','approvata'\)/);
 assert.match(section('area_soci_salva_evento','area_soci_iscrivi'),/FOR UPDATE[\s\S]*p_posti<v_occupati/);
 assert.match(section('area_soci_decidi','area_soci_partecipanti'),/FOR UPDATE[\s\S]*UPDATE public\.eventi_soci_iscrizioni/);
});
test('Ruoli e privacy partecipanti: nessuna scrittura diretta; responsabile o staff; partecipanti ordinati e altri soci non visibili',()=>{
 assert.match(sql,/REVOKE ALL ON public\.eventi_soci,public\.eventi_soci_iscrizioni FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT SELECT ON public\.eventi_soci,public\.eventi_soci_iscrizioni TO authenticated/);
 assert.match(sql,/public\.is_instructor\(\)[\s\S]*e\.responsabile_id=auth\.uid\(\)/);
 assert.match(sql,/eventi_soci_iscrizioni_lettura[\s\S]*utente_id=auth\.uid\(\)/);
 assert.match(section('area_soci_decidi','area_soci_partecipanti'),/p_esito='approvata' AND NOT public\.area_soci_persona_attiva/);
 assert.match(sql,/ORDER BY p\.cognome,p\.nome,i\.richiesta_il/);
});
test('Documenti associativi: RLS restrittiva e pubblicazione limitata ad amministratori',()=>{
 assert.match(sql,/documenti_soci_attivi[\s\S]*AS RESTRICTIVE FOR SELECT[\s\S]*public\.area_soci_accesso\(\)/);
 assert.match(sql,/documenti_soci_pubblica_admin[\s\S]*AS RESTRICTIVE FOR INSERT[\s\S]*public\.is_admin\(\)/);
 assert.match(sql,/documenti_soci_modifica_admin[\s\S]*AS RESTRICTIVE FOR UPDATE/);
 assert.match(read('app/area-soci/page.tsx'),/\.eq\('ambito','associazione'\)\.eq\('visibilita','soci'\)/);
});
test('Registrazione: messaggio di configurazione, verifica live server autenticata, esito non distruttivo',()=>{
 const form=read('components/ApplicationForm.tsx'),actions=read('app/actions.ts'),assist=read('components/CodiceFiscaleAssist.tsx');
 assert.match(form,/e\.preventDefault\(\)/);assert.match(form,/if\(result\.error\)\{setError\(result\.error\);return;/);assert.match(form,/disabled=\{pending\|\|cfBlocked\|\|!legalConfigured\}/);
 assert.match(assist,/checkIdentityAction\(identity\)/);assert.match(assist,/ticket===seq/);assert.match(assist,/notice[\s\S]*'error'/);
 assert.match(actions,/if\(!legal\.configured\)return \{error:/);assert.match(actions,/checkIdentityAction[\s\S]*auth\.getUser\(\)/);assert.match(actions,/if\(cf&&!\['ok','omocodia'\]\.includes\(check\.status\)\)return/);
});
test('Rimozioni: schede principali prive di azioni distruttive dirette, editor separato dal form di salvataggio',()=>{
 for(const f of ['app/gestionale/richieste/page.tsx','app/gestionale/soci/page.tsx','app/gestionale/corsi/page.tsx'])assert.doesNotMatch(read(f),/<RemoveRecord/);
 const editor=read('app/gestionale/moduli/[modulo]/page.tsx');
 assert.match(editor,/<\/form>\s*\{record&&!module\.appendOnly&&<RemoveRecord/);
 assert.match(editor,/if\(editId\)query=query\.eq\('id',editId\)/);
 assert.match(read('app/gestionale/soci/[id]/page.tsx'),/<\/form><RemoveRecord moduleKey="anagrafiche"/);
});
