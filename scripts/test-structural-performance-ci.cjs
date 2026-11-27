// Proof of concept only: disposable PostgreSQL CI; DDL and all fixtures rolled back.
const {Client}=require('pg');
const {readFileSync}=require('node:fs');
const {randomUUID}=require('node:crypto');
const {performance}=require('node:perf_hooks');
const {setTimeout:delay}=require('node:timers/promises');
const assert=require('node:assert/strict');
async function main(){
 const url=new URL(process.env.TEST_0019_DATABASE_URL);
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/sesto_test_redesign');
 const db=new Client({connectionString:url.href});
 await db.connect();
 try{
  await db.query('begin');
  await db.query("set local statement_timeout='15s'");
  await db.query(readFileSync('scripts/qa-structural-rpc.sql','utf8'));
  const admin=randomUUID(),secretary=randomUUID(),member=randomUUID(),disabled=randomUUID();
  for(const [id,role] of [[admin,'amministratore'],[secretary,'segreteria'],[member,'socio'],[disabled,'segreteria']]){
   await db.query('insert into auth.users(id,email,email_confirmed_at,banned_until) values($1,$2,now(),$3)',[id,id+'@example.invalid',id===disabled?'2099-12-31':null]);
   await db.query('insert into public.ruoli_utente(utente_id,ruolo) values($1,$2)',[id,role]);
  }
  let season=(await db.query('select id from public.stagioni where attiva')).rows[0]?.id;
  if(!season)season=(await db.query("insert into public.stagioni(nome,dal,al,attiva) values($1,'2099-01-01','2099-12-31',true) returning id",['QA structural '+randomUUID()])).rows[0].id;
  const prefix='Bench'+randomUUID().replace(/-/g,'');
  await db.query("with p as (insert into public.persone(nome,cognome) select 'Sintetico',$1||lpad(n::text,5,'0') from generate_series(1,2000) n returning id) insert into public.adesioni(persona_id,stagione_id,stato) select id,$2,'attiva' from p",[prefix,season]);
  await db.query("insert into public.quote_associative(persona_id,stagione_id,importo_dovuto,scadenza) select p.id,$2,10.25,current_date+7 from public.persone p where p.cognome like $1",[prefix+'%',season]);
  const person=(await db.query("select id from public.persone where cognome like $1 order by id limit 1",[prefix+'%'])).rows[0].id;
  const debt=(await db.query("select id from public.quote_associative where persona_id=$1 and stagione_id=$2",[person,season])).rows[0].id;
  await db.query('analyze public.persone');await db.query('analyze public.adesioni');
  const role=async(id,dbRole='authenticated')=>{
   await db.query('reset role');
   await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id||'']);
   await db.query(dbRole==='anon'?'set local role anon':'set local role authenticated');
  };
  const denied=async(fn,code)=>{
   await db.query('savepoint deny_test');
   try{await assert.rejects(fn,e=>e.code===code);}finally{await db.query('rollback to savepoint deny_test');await db.query('release savepoint deny_test');}
  };
  const now=new Date().toISOString(),today=now.slice(0,10),cutoff=new Date(Date.parse(today+'T00:00:00Z')+30*86400000).toISOString().slice(0,10);
  const dashboardRpc=async(q)=>(await q('select public.sc_perf_dashboard($1,$2,$3) as data',[now,today,cutoff])).rows[0].data;
  const memberRpc=async(q,s,terms)=>(await q('select public.sc_perf_soci_counts($1,$2) as data',[s,terms])).rows[0].data;
  const states=['attiva','da_perfezionare','sospesa','cessata'];
  const memberOld=async(q,s,terms)=>{
   const args=[s,terms],where="where ($1::uuid is null or stagione_id=$1) and not exists(select 1 from unnest($2::text[]) t(term) where not(coalesce(nome,'') ilike '%'||term||'%' or coalesce(cognome,'') ilike '%'||term||'%' or coalesce(codice_fiscale,'') ilike '%'||term||'%'))";
   const results=await Promise.all([q('select count(*)::int as n from public.schede_soci '+where,args),...states.map(state=>q('select count(*)::int as n from public.schede_soci '+where+' and stato=$3',[...args,state]))]);
   return Object.fromEntries(['total',...states].map((k,i)=>[k,results[i].rows[0].n]));
  };
  const dashboardOld=async(q)=>{
   const scalar=async(sql,args=[])=>Number((await q(sql,args)).rows[0].n);
   const preview=async(table,fields,where,order,limit,args)=>{
    const row=(await q("select jsonb_build_object('count',(select count(*) from public."+table+' where '+where+"),'data',(select coalesce(jsonb_agg(to_jsonb(x) order by "+order+"),'[]'::jsonb) from (select "+fields+' from public.'+table+' where '+where+' order by '+order+' limit '+limit+') x)) as data',args)).rows[0].data;
    return row;
   };
   const seasonPromise=q('select id,nome from public.stagioni where attiva');
   const independent=Promise.all([
    scalar("select count(*) as n from public.richieste where stato in ('inviata','in_verifica','integrazione_richiesta')"),
    scalar("select count(*) as n from public.edizioni_corsi where stato='attivo'"),
    scalar("select count(*) as n from public.iscrizioni_corsi where stato='iscritto'"),
    scalar('select count(*) as n from public.attrezzature where prossima_revisione between $1 and $2',[today,cutoff]),
    scalar("select count(*) as n from public.stato_certificati where stato_certificato='valido' and scade_il between $1 and $2",[today,cutoff]),
    preview('eventi_soci','id,titolo,dal,al,stato',"dal >= $1 and stato <> 'annullato'",'dal,id',5,[today]),
    preview('lezioni','id,titolo,inizio,fine','annullata_il is null and inizio >= $1','inizio,id',8,[now]),
    q('select public.is_admin() as admin').then(r=>r.rows[0].admin)
   ]);
   const seasons=(await seasonPromise).rows,active=seasons.length===1?seasons[0]:null;
   const seasonal=active?Promise.all([
    scalar("select count(*) as n from public.adesioni where stagione_id=$1 and stato='attiva'",[active.id]),
    scalar("select count(*) as n from public.adesioni where stagione_id=$1 and stato='da_perfezionare'",[active.id]),
    scalar('select count(*) as n from public.saldi_quote where stagione_id=$1 and residuo>0',[active.id])
   ]):Promise.resolve([null,null,null]);
   const [[requests,courses,enrollments,revisions,certificates,events,lessons,admin],[adhesions,pendingAdhesions,quotes]]=await Promise.all([independent,seasonal]);
   return {season:active,requests,courses,enrollments,revisions,certificates,events,lessons,admin,adhesions,pendingAdhesions,quotes};
  };
  const financeRpc=async(q,args)=>(await q('select public.sc_perf_incassi_totals($1,$2,$3,$4,$5,$6,$7) as data',args)).rows[0].data;
  const financeOld=async(q,[tab,season,status,person,debt,dal,al])=>{
   const table=tab==='quota'?'gest_elenco_saldi_quote':'gest_elenco_saldi_corsi';
   const args=[season,status,person,debt,dal,al];
   const sql="select id,importo_dovuto,versato,residuo from public."+table+" where stagione_id=$1 and ($2='tutte' or ($2='residuo' and residuo>0) or stato::text=$2) and ($3::uuid is null or persona_id=$3) and ($4::uuid is null or id=$4) and ($5::date is null or scadenza >= $5) and ($6::date is null or scadenza <= $6) order by id limit 500 offset $7";
   let due=0n,paid=0n,residue=0n,settled=0,open=0;
   for(let offset=0;;offset+=500){
    const rows=(await q(sql,[...args,offset])).rows;
    for(const row of rows){
     const cents=v=>BigInt(Math.round(Number(v)*100));
     due+=cents(row.importo_dovuto);paid+=cents(row.versato);residue+=cents(row.residuo);
     if(cents(row.residuo)===0n)settled++;else open++;
    }
    if(rows.length<500)break;
   }
   return {due:Number(due)/100,paid:Number(paid)/100,residue:Number(residue)/100,settled,open};
  };
  const financialFilters=[
   ['quota',season,'tutte',null,null,null,null],
   ['quota',season,'residuo',person,debt,null,null],
   ['quota',season,'pagata',null,null,null,null],
   ['quota',season,'tutte',null,null,'1900-01-01','1900-01-02'],
   ['corso',season,'tutte',null,null,null,null]
  ];
  const query=(sql,args)=>db.query(sql,args);
  for(const id of [admin,secretary]){
   await role(id);
   assert.deepEqual(await dashboardRpc(query),await dashboardOld(query));
   for(const [s,t] of [[season,[prefix]],[null,[prefix,'Sintetico']],[season,['inesistente']],[null,[]]]){
    assert.deepEqual(await memberRpc(query,s,t),await memberOld(query,s,t));
   }
   assert.equal((await memberRpc(query,season,[prefix])).total,2000);
   for(const args of financialFilters)assert.deepEqual(await financeRpc(query,args),await financeOld(query,args));
   await denied(()=>memberRpc(query,season,['%']),'22023');
  }
  for(const id of [member,disabled,null]){
   await role(id,id?'authenticated':'anon');
   await denied(()=>dashboardRpc(query),'42501');
   await denied(()=>memberRpc(query,season,[]),'42501');
   await denied(()=>financeRpc(query,financialFilters[0]),'42501');
  }
  await role(admin);
  const results=[];
  for(const rtt of [0,40,80]){
   for(const [name,before,after] of [['dashboard',dashboardOld,dashboardRpc],['soci-counts',q=>memberOld(q,season,[prefix]),q=>memberRpc(q,season,[prefix])],['incassi-totals',q=>financeOld(q,financialFilters[0]),q=>financeRpc(q,financialFilters[0])]]){
    const sample=async(fn)=>{
     let requests=0;
     const q=async(sql,args)=>{requests++;if(rtt)await delay(rtt);return db.query(sql,args);};
     const t=performance.now(),value=await fn(q);
     return {ms:performance.now()-t,requests,value};
    };
    const a=[],b=[];
    for(let i=0;i<5;i++){
     const [x,y]=i%2?await (async()=>{const y=await sample(after),x=await sample(before);return [x,y];})():[await sample(before),await sample(after)];
     assert.deepEqual(x.value,y.value);a.push(x);b.push(y);
    }
    const median=list=>Math.round(list.map(x=>x.ms).sort((a,b)=>a-b)[2]*100)/100;
    results.push({name,simulatedRttMs:rtt,beforeRequests:a[0].requests,afterRequests:b[0].requests,beforeMedianMs:median(a),afterMedianMs:median(b)});
   }
  }
  console.log(JSON.stringify({scenario:'structural RPC proof; artificial per-request delay on local PostgreSQL, not browser latency',samples:5,syntheticPeople:2000,parity:true,deniedUnauthorized:true,results}));
  await db.query('rollback');
 }finally{await db.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
