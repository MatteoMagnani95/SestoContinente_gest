import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
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
 await db.query('begin');
 await db.query(await readFile(new URL('./qa-structural-rpc.sql',import.meta.url),'utf8'));
 await db.query("notify pgrst,'reload schema'");
 await db.query('commit');
 console.log('Structural RPC fixtures installed in disposable local database');
}finally{await db.end();}
