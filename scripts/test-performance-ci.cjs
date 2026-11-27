// Synthetic benchmark, PostgreSQL CI only; every fixture is rolled back.
const {Client}=require('pg');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {performance}=require('node:perf_hooks');
async function main(){
 const url=new URL(process.env.TEST_0019_DATABASE_URL);
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/sesto_test_redesign');
 const db=new Client({connectionString:url.href});
 await db.connect();
 try{
  await db.query('begin');
  await db.query("set local statement_timeout='10s'");
  const a=randomUUID(),b=randomUUID();
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())',[a,a+'@example.invalid',b,b+'@example.invalid']);
  await db.query("insert into ruoli_utente(utente_id,ruolo) values($1,'socio'),($2,'socio')",[a,b]);
  await db.query("insert into notifiche(utente_id,tipo,riferimento,titolo,messaggio,creata_il) select u,'benchmark',n::text,'Sintetico','Test',now()-n*interval '1 second' from unnest(array[$1,$2]::uuid[]) u cross join generate_series(1,10000) n",[a,b]);
  await db.query('analyze notifiche');
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);
  const start=performance.now();
  const result=await db.query("select count(*)::int as total from notifiche where tipo='benchmark' and letta_il is null");
  assert.equal(result.rows[0].total,10000);
  const countMs=performance.now()-start;
  const seen=new Set(),times=[];
  for(const offset of [0,20,4980,9980]){
   const t=performance.now();
   const page=await db.query("select id,utente_id from notifiche where tipo='benchmark' and letta_il is null order by creata_il desc,id limit 20 offset $1",[offset]);
   times.push(Math.round((performance.now()-t)*100)/100);
   assert.equal(page.rowCount,20);
   for(const row of page.rows){assert.equal(row.utente_id,a);assert.ok(!seen.has(row.id));seen.add(row.id);}
  }
  assert.equal((await db.query("select count(*)::int as total from notifiche where utente_id=$1",[b])).rows[0].total,0);
  console.log(JSON.stringify({scenario:'notifiche sintetiche, RLS e pagine',rows:20000,visible:10000,countMs:Math.round(countMs*100)/100,pageMs:times,timeoutMs:10000}));
  // Candidate index experiment: same synthetic fixtures and role, no production DDL.
  // Report measurements, never impose a flaky wall-clock threshold in CI.
  const statements=[
   {name:'unread-count',sql:"select count(*)::int as total from notifiche where utente_id=$1 and letta_il is null",args:[a]},
   {name:'unread-first-page',sql:"select id,utente_id from notifiche where utente_id=$1 and letta_il is null order by creata_il desc,id limit 20",args:[a]},
   {name:'unread-deep-page',sql:"select id,utente_id from notifiche where utente_id=$1 and letta_il is null order by creata_il desc,id limit 20 offset 4980",args:[a]}
  ];
  const sample=async()=>{
   const out={};
   for(const item of statements){
    const warm=await db.query(item.sql,item.args);
    const times=[];
    for(let i=0;i<7;i++){const t=performance.now();const result=await db.query(item.sql,item.args);times.push(performance.now()-t);assert.deepEqual(result.rows,warm.rows);}
    times.sort((a,b)=>a-b);
    out[item.name]={medianMs:Math.round(times[3]*100)/100,result:warm.rows};
   }
   return out;
  };
  const before=await sample();
  await db.query('reset role');
  await db.query('create index sc_bench_notifiche_unread_order on public.notifiche (utente_id,creata_il desc,id) where letta_il is null');
  await db.query('analyze notifiche');
  await db.query('set local role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);
  const after=await sample();
  for(const item of statements)assert.deepEqual(after[item.name].result,before[item.name].result);
  assert.equal((await db.query("select count(*)::int as total from notifiche where utente_id=$1",[b])).rows[0].total,0);
  console.log(JSON.stringify({scenario:'candidate unread notification index',samples:7,rows:20000,metrics:statements.map(({name})=>({name,beforeMs:before[name].medianMs,afterMs:after[name].medianMs})),sameResults:true,rlsIsolated:true,productionChanges:false}));
  await db.query('rollback');
 }finally{await db.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
