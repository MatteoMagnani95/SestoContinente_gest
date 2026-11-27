import assert from 'node:assert/strict';
import {Client} from 'pg';
const env=process.env;
assert.equal(env.QA_ISOLATED_ENV,'true');
assert.equal(env.SESTO_TEST_MODE,'true');
assert.equal(env.SESTO_EMAIL_MODE,'simulate');
const url=new URL(env.QA_DB_URL);
assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.port==='54322'&&url.pathname==='/postgres');
const api=new URL(env.NEXT_PUBLIC_SUPABASE_URL);
assert.ok(['127.0.0.1','localhost'].includes(api.hostname)&&api.port==='54321');
const db=new Client({connectionString:url.href});
await db.connect();
try{
 const {rows}=await db.query("select proname,prosecdef,provolatile,has_function_privilege('anon',oid,'EXECUTE') as anon_exec,has_function_privilege('authenticated',oid,'EXECUTE') as authenticated_exec from pg_proc where pronamespace='public'::regnamespace and proname=any($1::text[])",[['sc_perf_dashboard','sc_perf_soci_counts','sc_perf_incassi_totals','sc_perf_navigation','sc_perf_inventory','sc_perf_person_options','sc_perf_soci_page']]);
 assert.equal(rows.length,7);
 for(const row of rows){assert.equal(row.prosecdef,false);assert.equal(row.provolatile,'s');assert.equal(row.anon_exec,false);assert.equal(row.authenticated_exec,true);}
 console.log('Canonical migration verified on disposable local database; no DDL from installer');
}finally{await db.end();}
