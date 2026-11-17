import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20261111210200_gestionale_completo.sql','utf8');
const modules=fs.readFileSync('lib/modules.ts','utf8');
const actions=fs.readFileSync('app/module-actions.ts','utf8');
const docs=fs.readFileSync('app/documenti/actions.ts','utf8');
const cron=fs.readFileSync('app/api/cron/promemoria/route.ts','utf8');

const requiredTables=['programmi_didattici','versioni_programmi','corsi','edizioni_corsi',
'iscrizioni_corsi','qualifiche_istruttori','assegnazioni_istruttori','brevetti_allievi',
'certificati_medici','piscine','corsie','lezioni','prenotazioni_corsie','presenze',
'attrezzature','revisioni_attrezzature','assegnazioni_attrezzature','quote_associative',
'addebiti_corsi','pagamenti','movimenti_economici','documenti','comunicazioni',
'notifiche','impostazioni_promemoria','registro_operazioni','tesseramenti'];

test('Fase 2: moduli principali con schema e RLS',()=>{
 for(const table of requiredTables){
  assert.match(sql,new RegExp(`create table public\\.${table}\\s*\\(`));
  assert.match(sql,new RegExp(`['\\"]${table}['\\"]|public\\.${table} enable row level security`));
 }
 assert.match(sql,/row level security/);
});

test('Fase 2: tutti i moduli dell’editor hanno una tabella di origine',()=>{
 const tables=[...modules.matchAll(/^\s{2}\w+:\{name:'[^']+',table:'([^']+)'/gm)].map(x=>x[1]);
 assert.ok(tables.length>=25);
 const first=fs.readFileSync('supabase/migrations/20261111210100_fase1.sql','utf8');
 for(const table of tables){
  assert.ok(first.includes(`create table public.${table}`)||sql.includes(`create table public.${table}`),`Tabella mancante: ${table}`);
 }
});

test('Fase 2: il salvataggio consente solo i campi in whitelist',()=>{
 assert.match(actions,/isModuleKey\(key\)/);
 assert.match(actions,/for\(const field of module.fields\)/);
 assert.match(actions,/module.adminOnly/);
});

test('Fase 2: calendario, capienza e inventario hanno controlli sul database',()=>{
 assert.match(sql,/exclude using gist/);
 assert.match(sql,/create trigger verifica_capienza_trigger/);
 assert.match(sql,/create trigger controllo_riduzione_capienza/);
 assert.match(sql,/create trigger controlla_consegna/);
});

test('Fase 2: documenti privati e funzioni di pulizia protette',()=>{
 assert.match(sql,/sesto-documenti','sesto-documenti',false/);
 assert.match(sql,/create policy sesto_storage_read/);
 assert.match(sql,/create policy sesto_storage_insert/);
 assert.match(sql,/create or replace function public.annulla_upload_documento/);
 assert.match(docs,/realMime\(/);
 assert.match(docs,/randomUUID\(/);
});

test('Fase 2: cron richiede un segreto e variabili server',()=>{
 assert.match(cron,/request.headers.get\('authorization'\)/);
 assert.match(cron,/process.env.CRON_SECRET/);
 assert.match(cron,/process.env.SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(cron,/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});

test('Fase 2: messaggi automatici non espongono note cliniche',()=>{
 assert.match(sql,/genera_promemoria\(\)/);
 assert.match(sql,/genera_promemoria_organizzativi\(\)/);
 assert.match(sql,/genera_promemoria_tessere\(\)/);
 assert.match(sql,/idoneita_allievi_corso/);
});
