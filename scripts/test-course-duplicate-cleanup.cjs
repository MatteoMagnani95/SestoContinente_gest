const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Client}=require('pg');
async function main(){
 const url=process.env.TEST_0019_DATABASE_URL;
 const u=new URL(url);assert.ok(['127.0.0.1','localhost'].includes(u.hostname)&&u.pathname.startsWith('/sesto_test_'));
 const root=new Client({connectionString:url}),staff=new Client({connectionString:url}),member=new Client({connectionString:url});
 const scalar=async(c,sql,args=[])=>Object.values((await c.query(sql,args)).rows[0])[0];
 await Promise.all([root.connect(),staff.connect(),member.connect()]);
 try{
  const actor=randomUUID(),guest=randomUUID(),director=randomUUID(),student=randomUUID();
  await root.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now()),($3,$4,now())",[actor,actor+'@example.invalid',guest,guest+'@example.invalid']);
  await root.query("insert into ruoli_utente(utente_id,ruolo) values($1,'amministratore'),($2,'socio')",[actor,guest]);
  await root.query("insert into persone(id,nome,cognome) values($1,'Direttore','Collaudo'),($2,'Allievo','Collaudo')",[director,student]);
  for(const [client,id] of [[staff,actor],[member,guest]]){await client.query('set role authenticated');await client.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
  const season=await scalar(root,'select id from stagioni where attiva limit 1');
  const catalog=await scalar(staff,"insert into corsi(nome,tipo) values($1,'APNEA') returning id",['Hotfix '+randomUUID()]);
  const name='Duplicato '+randomUUID();
  const insert="insert into edizioni_corsi(corso_id,stagione_id,nome,inizio,fine,direttore_id,stato) values($1,$2,$3,'2026-10-01','2026-12-01',$4,$5) returning id";
  const cancelled=await scalar(staff,insert,[catalog,season,name,director,'annullato']);
  // Only on the disposable local DB: recreate the legacy duplicate preserved
  // by the historical migration. Restore the trigger before the test begins.
  await root.query('begin');
  let active;
  try{
   await root.query('alter table public.edizioni_corsi disable trigger identita_edizione');
   active=await scalar(root,insert.replace('direttore_id,stato)','direttore_id,stato,duplicato_storico)').replace('$4,$5)','$4,$5,true)'),[catalog,season,name,director,'attivo']);
   await root.query('set constraints all immediate');
   await root.query('alter table public.edizioni_corsi enable trigger identita_edizione');
   await root.query('commit');
  }catch(e){await root.query('rollback');throw e;}
  await assert.rejects(staff.query(insert,[catalog,season,'  '+name.toUpperCase()+'  ',director,'programmato']),{code:'P3419'});
  await assert.rejects(staff.query('update edizioni_corsi set duplicato_storico=false where id=$1',[active]),{code:'P3419'});
  const protectedEd=await scalar(staff,insert,[catalog,season,name+' protetto',director,'attivo']);
  await root.query("insert into qualifiche_istruttori(persona_id,titolo) values($1,'Qualifica sintetica')",[director]);
  for(const id of [active,cancelled,protectedEd])await root.query("insert into assegnazioni_istruttori(edizione_id,persona_id,ruolo) values($1,$2,'responsabile')",[id,director]);
  const adhesion=await scalar(root,"insert into adesioni(stagione_id,persona_id,stato) values($1,$2,'attiva') returning id",[season,student]);
  await root.query("insert into tesseramenti(adesione_id,ente,stato,scade_il) values($1,'Ente','attiva',current_date+100)",[adhesion]);
  const enrollment=await scalar(staff,"insert into iscrizioni_corsi(edizione_id,persona_id,stato) values($1,$2,'iscritto') returning id",[active,student]);
  const assignment=await scalar(root,"select id from assegnazioni_istruttori where edizione_id=$1",[active]);
  await assert.rejects(staff.query("select rimuovi_record_gestionale('assegnazioni_istruttori',$1)",[assignment]),{code:'P3414'});
  await assert.rejects(member.query("select elimina_edizione_annullata_vuota($1)",[cancelled]),{code:'42501'});
  await assert.rejects(staff.query("select elimina_edizione_annullata_vuota($1)",[active]),{code:'P3414'});
  await root.query("insert into lezioni(edizione_id,titolo,inizio,fine) values($1,'Lezione sintetica','2026-10-10 18:00+02','2026-10-10 19:00+02')",[protectedEd]);
  await root.query("update edizioni_corsi set stato='annullato' where id=$1",[protectedEd]);
  await assert.rejects(staff.query("select elimina_edizione_annullata_vuota($1)",[protectedEd]),{code:'P3414'});
  assert.equal(await scalar(root,"select count(*)::int from assegnazioni_istruttori where edizione_id=$1",[protectedEd]),1);
  await staff.query("select elimina_edizione_annullata_vuota($1)",[cancelled]);
  assert.equal(await scalar(root,"select count(*)::int from edizioni_corsi where id=$1",[cancelled]),0);
  assert.equal(await scalar(root,"select count(*)::int from assegnazioni_istruttori where edizione_id=$1",[cancelled]),0);
  assert.equal(await scalar(root,"select count(*)::int from edizioni_corsi where id=$1",[active]),1);
  assert.equal(await scalar(root,"select count(*)::int from assegnazioni_istruttori where edizione_id=$1",[active]),1);
  assert.equal(await scalar(root,"select count(*)::int from iscrizioni_corsi where id=$1 and edizione_id=$2 and stato='iscritto'",[enrollment,active]),1);
  assert.equal(await scalar(root,"select duplicato_storico from edizioni_corsi where id=$1",[active]),false);
  await assert.rejects(staff.query(insert,[catalog,season,name,director,'programmato']),{code:'P3419'});
  console.log('OK duplicate normalization, active responsibility protected, unauthorized deletion denied, cancelled empty edition atomically removed');
 }finally{await Promise.all([root.end(),staff.end(),member.end()]);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
