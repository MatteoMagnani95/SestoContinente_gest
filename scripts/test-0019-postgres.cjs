// Eseguire sul database locale usa-e-getta predisposto per il collaudo (driver pg).
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {Client} = require('pg');
async function main() {
 const connectionString = process.env.TEST_0019_DATABASE_URL;
 if(!connectionString || !['localhost','127.0.0.1'].includes(new URL(connectionString).hostname) || !/^\/sesto_test_/.test(new URL(connectionString).pathname)) throw Error('Usare un database locale sesto_test_ dedicato.');
 const clients=[];
 async function session(account) {
  const c=new Client({connectionString});await c.connect();clients.push(c);
  if(account){await c.query('set role authenticated');await c.query("select set_config('request.jwt.claim.sub',$1,false)",[account]);}
  return c;
 }
 async function scalar(c,sql,args=[]){const result=await c.query(sql,args);return Object.values(result.rows[0])[0];}
 try{
  const root=await session(), utenti=Array.from({length:5},()=>randomUUID()), persone=utenti.map(()=>randomUUID());
  const [socio,altro,staff,c1,c2]=utenti,[allievo,secondo,dir,cons1,cons2]=persone;
  for(let i=0;i<utenti.length;i++){
   await root.query('insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,now(),$3)',[utenti[i],utenti[i]+'@example.invalid',i===0?{presa_visione:'si',versione_privacy:'test',immagini:'no',versione_immagini:'foto1'}:{}]);
   await root.query('insert into persone(id,nome,cognome) values($1,$2,$3)',[persone[i],'Persona','Collaudo'+i]);
   await root.query("insert into collegamenti_persone values($1,$2,'titolare')",[utenti[i],persone[i]]);
   await root.query("insert into ruoli_utente(utente_id,ruolo) values($1,$2)",[utenti[i],['socio','socio','segreteria','consigliere_cda','consigliere_cda'][i]]);
  }
  const [a,b,s,s2,v1,v2]=await Promise.all([socio,altro,staff,staff,c1,c2].map(session));
  const salva="select salva_domanda_v19('Nome','Cognome','1990-01-01','Roma','','Via Prova','00100','Roma','00000001','','','',true,true,$1,'stat1','priv1',true,'RM','Italia','M','foto1','Contatto Prova','00000002')";
  const pratica=await scalar(a,salva,[false]);
  assert.deepEqual((await a.query('select stato,immagini_scelta,immagini_versione from richieste where id=$1',[pratica])).rows[0],{stato:'inviata',immagini_scelta:false,immagini_versione:'foto1'});
  await a.query("select scegli_immagini(true,'foto1')");await a.query("select scegli_immagini(false,'foto1')");
  assert.equal(await scalar(a,"select scelta from scelte_iscrizione where tipo='immagini' order by id desc limit 1"),false);
  assert.equal(await scalar(b,"select count(*)::int from scelte_iscrizione where utente_id=$1",[socio]),0);
  console.log('OK adesione con rifiuto, consenso revocabile e separazione persone');

  // Nuova UI: provenienza e confronto atomico della scelta visualizzata.
  const currentChoice=()=>scalar(a,"select id::text from scelte_iscrizione where tipo='immagini' order by id desc limit 1");
  const oldChoice=await currentChoice();
  await a.query("select scegli_immagini_verificata(true,'foto1',$1)",[oldChoice]);
  const positive=await currentChoice();
  assert.equal(await scalar(a,"select origine from scelte_iscrizione where id=$1",[positive]),'profilo');
  await a.query("select scegli_immagini_verificata(false,'foto1',$1)",[positive]);
  const revoked=await currentChoice();
  await assert.rejects(a.query("select scegli_immagini_verificata(true,'foto1',$1)",[positive]),{code:'P3508'});
  await a.query("select scegli_immagini_verificata(false,'foto1',$1)",[positive]);
  assert.equal(await currentChoice(),revoked);
  assert.equal(await scalar(a,"select scelta from scelte_iscrizione where id=$1",[revoked]),false);
  assert.equal(await scalar(a,"select origine from scelte_iscrizione where tipo='privacy' order by id limit 1"),'registrazione');
  const saveV20=salva.replace('salva_domanda_v19','salva_domanda_v20').replace(/\)$/,',$2)');
  await assert.rejects(a.query(saveV20,[true,positive]),{code:'P3508'});
  // La verifica della modalità precede la scrittura anche quando la RPC è invocata direttamente.
  await assert.rejects(a.query(saveV20.replace("'stat1'","'TEST-COLLAUDO-1'"),[false,revoked]),{code:'P3509'});
  await assert.rejects(a.query("select registra_scelta_verificata(true,'foto1',$1,'domanda')",[revoked]),{code:'42501'});
  assert.equal(await currentChoice(),revoked);
  const draftV20=saveV20.replace("'Nome','Cognome'","'Altro','Collaudo'").replace("'priv1',true","'priv1',false");
  const draft=await scalar(b,draftV20,[true,null]);
  assert.equal(await scalar(b,"select origine from scelte_iscrizione where tipo='immagini' order by id desc limit 1"),'domanda');
  assert.equal(await scalar(b,'select immagini_scelta from richieste where id=$1',[draft]),true);
  assert.equal(await scalar(a,'select count(*)::int from richieste where id=$1',[draft]),0);
  console.log('OK dichiarazioni: origine, revoca protetta, retry e separazione modalità');

  const season=await scalar(root,"select id from stagioni where attiva limit 1");
  for(const p of [allievo,dir,secondo]){
   const ad=await scalar(root,"insert into adesioni(stagione_id,persona_id,stato) values($1,$2,'attiva') returning id",[season,p]);
   await root.query("insert into tesseramenti(adesione_id,ente,stato,scade_il) values($1,'Ente','attiva',current_date+100)",[ad]);
  }
  const catalog=await scalar(s,"insert into corsi(nome,tipo) values($1,'APNEA') returning id",['Collaudo '+randomUUID()]);
  const edSql="insert into edizioni_corsi(corso_id,stagione_id,nome,inizio,fine,direttore_id) values($1,$2,'Gruppo','2026-10-01','2026-12-01',$3) returning id";
  const concurrent=await Promise.allSettled([s,s2].map(c=>scalar(c,edSql,[catalog,season,dir])));
  assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);
  assert.ok(['23505','P3419'].includes(concurrent.find(x=>x.status==='rejected').reason.code));
  const ed=concurrent.find(x=>x.status==='fulfilled').value;
  await scalar(s,edSql.replace('2026-10-01','2026-10-02'),[catalog,season,dir]);
  const enroll="insert into iscrizioni_corsi(edizione_id,persona_id,stato) values($1,$2,'iscritto')";
  await assert.rejects(s.query(enroll,[ed,dir]),{code:'P3421'});
  await s.query(enroll,[ed,allievo]);await assert.rejects(s.query(enroll,[ed,allievo]),{code:'23505'});
  await assert.rejects(s.query('update edizioni_corsi set direttore_id=$1 where id=$2',[allievo,ed]),{code:'P3421'});
  const brevetto=await scalar(s,"insert into brevetti_allievi(edizione_id,persona_id,titolo) values($1,$2,'Apnea') returning id",[ed,allievo]);
  await s.query('update edizioni_corsi set direttore_id=$1 where id=$2',[secondo,ed]);
  assert.equal(await scalar(s,'select rilasciato_da_id from brevetti_allievi where id=$1',[brevetto]),dir);
  // Riproduce un brevetto già presente prima dell'introduzione del direttore.
  await root.query('begin');
  await root.query('alter table brevetti_allievi disable trigger firma_brevetto');
  const storico=await scalar(root,"insert into brevetti_allievi(persona_id,titolo) values($1,'Storico') returning id",[allievo]);
  await root.query('alter table brevetti_allievi enable trigger firma_brevetto');
  await root.query('commit');
  await s.query("update brevetti_allievi set titolo='Titolo corretto' where id=$1",[storico]);
  assert.equal(await scalar(s,'select rilasciato_da_nome from brevetti_allievi where id=$1',[storico]),null);
  await assert.rejects(s.query('update brevetti_allievi set edizione_id=$1 where id=$2',[ed,storico]),{code:'P3422'});
  assert.ok((await s.query("select campi from cronologia_scheda('corso',$1)",[ed])).rows.some(r=>r.campi?.includes('direttore_id')));
  assert.ok((await s.query("select autore,registrata_il,campi from cronologia_scheda('corso',$1)",[ed])).rows.some(r=>r.campi?.includes('direttore_id') && r.autore==='Persona Collaudo2' && r.registrata_il));
  assert.equal(await scalar(a,"select count(*)::int from cronologia_scheda('corso',$1)",[ed]),0);
  console.log('OK edizioni concorrenti, edizione distinta, conflitti bidirezionali, brevetto storico e cronologia');

  // Incarichi: rifiuta discrepanze nuove anche via SQL diretto; allinea con consenso.
  for(const person of [dir,secondo,allievo,cons1])await s.query("insert into qualifiche_istruttori(persona_id,titolo) values($1,'Qualifica sintetica')",[person]);
  const assign="insert into assegnazioni_istruttori(edizione_id,persona_id,ruolo) values($1,$2,'responsabile') returning id";
  await assert.rejects(s.query(assign,[ed,dir]),{code:'P3510'});
  const responsible=await scalar(s,assign,[ed,secondo]);
  await assert.rejects(s.query('update edizioni_corsi set direttore_id=$1 where id=$2',[dir,ed]),{code:'P3510'});
  await assert.rejects(s.query("update assegnazioni_istruttori set ruolo='aiuto' where id=$1",[responsible]),{code:'P3510'});
  const align='select allinea_direttore_responsabile($1,$2,$3,$4)';
  await assert.rejects(a.query(align,[ed,dir,secondo,secondo]),{code:'42501'});
  await assert.rejects(s.query(align,[ed,allievo,secondo,secondo]),{code:'P3421'});
  const aligned=await Promise.allSettled([s,s2].map((db,i)=>db.query(align,[ed,i===0?dir:cons1,secondo,secondo])));
  assert.equal(aligned.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(aligned.find(r=>r.status==='rejected').reason.code,'P3511');
  assert.equal(await scalar(s,"select e.direttore_id=a.persona_id from edizioni_corsi e join assegnazioni_istruttori a on a.edizione_id=e.id where a.id=$1",[responsible]),true);
  assert.equal(await scalar(s,'select rilasciato_da_id from brevetti_allievi where id=$1',[brevetto]),dir);
  console.log('OK direzione: coerenza, permessi, allineamento concorrente, incarico e brevetto storico');

  async function file(){
   const id=randomUUID(),path=socio+'/certificati/'+id+'.jpg';
   await a.query("insert into documenti(id,nome,categoria,ambito,visibilita,utente_id,persona_id,percorso_storage,mime,dimensione_bytes,caricato_da) values($1,'File di prova','Certificato medico','personale','proprietario',$2,$3,$4,'image/jpeg',12,$2)",[id,socio,allievo,path]);
   await root.query("insert into storage.objects(bucket_id,name) values('sesto-documenti',$1)",[path]);
   const cert=await scalar(a,'select registra_certificato_personale($1,$2,current_date,current_date+30)',[allievo,id]);
   return {id,cert,path};
  }
  const primo=await file();await s.query("update certificati_medici set esito_verifica='valido' where id=$1",[primo.cert]);const nuovo=await file();
  assert.equal(await scalar(a,'select stato_certificato from stato_certificati where id=$1',[nuovo.cert]),'in_attesa');
  for(const c of [a,s])assert.equal(await scalar(c,'select legge_certificato($1)',[nuovo.id]),true);
  assert.equal(await scalar(b,'select legge_certificato($1)',[nuovo.id]),false);
  assert.equal(await scalar(b,'select count(*)::int from documenti where id=$1',[nuovo.id]),0);
  for(const c of [a,b,s])assert.equal(await scalar(c,'select count(*)::int from storage.objects where name=$1',[nuovo.path]),0);
  console.log('OK titolare e staff autorizzati, altro allievo escluso, accesso diretto storage bloccato, nuovo file in attesa');
  for(const p of [cons1,cons2])await s.query("insert into cda_componenti(persona_id,carica,dal,al) values($1,'Consigliere',current_date,(current_date+interval '4 years')::date)",[p]);
  const verb=randomUUID(),path=verb+'/bozza.docx';
  await s.query("insert into cda_verbali(id,data_consiglio,oggetto,tipo,percorso_docx,creato_da) values($1,current_date,'Collaudo','Gestione Ordinaria / Altro',$2,$3)",[verb,path,staff]);
  await s.query('select prepara_verbale_cda($1)',[verb]);
  await assert.rejects(v1.query('select approva_versione_cda($1,$2)',[verb,path]),{code:'P0001'});
  await assert.rejects(v1.query('select leggi_versione_cda($1,$2,$3)',[verb,path,c1]),{code:'42501'});
  await root.query('select leggi_versione_cda($1,$2,$3)',[verb,path,c1]);
  assert.equal(await scalar(v1,'select count(*)::int from firme_verbale($1) where votato_il is not null',[verb]),0);
  assert.equal(await scalar(v1,'select approva_versione_cda($1,$2)',[verb,path]),false);
  assert.equal(await scalar(v1,'select approva_versione_cda($1,$2)',[verb,path]),false);
  assert.equal(await scalar(v1,'select stato from cda_verbali where id=$1',[verb]),'in_approvazione');
  assert.equal(await scalar(v2,'select count(*)::int from firme_verbale($1) where votato_il is not null',[verb]),1);
  const nuova=randomUUID();for(const f of ['bozza.docx','bozza.anteprima.pdf','bozza.deliberato.pdf'])await root.query("insert into storage.objects(bucket_id,name) values('sesto-cda',$1)",[nuova+'/'+f]);
  await s.query('select sostituisci_verbale($1,$2,$3)',[verb,path,nuova]);
  await assert.rejects(v2.query('select approva_versione_cda($1,$2)',[verb,path]),{code:'P0001'});
  assert.equal(await scalar(v1,'select count(*)::int from firme_verbale($1) where votato_il is not null',[nuova]),0);
  for(const [i,c] of [v1,v2].entries()){
   await root.query('select leggi_versione_cda($1,$2,$3)',[nuova,nuova+'/bozza.docx',i===0?c1:c2]);
   assert.equal(await scalar(c,'select approva_versione_cda($1,$2)',[nuova,nuova+'/bozza.docx']),i===1);
  }
  assert.equal(await scalar(v1,'select count(*)::int from firme_verbale($1) where votato_il is not null',[verb]),1);
  assert.equal(await scalar(v2,'select stato from cda_verbali where id=$1',[nuova]),'approvato');
  console.log('OK lettura distinta dal voto, prima approvazione, doppio voto, sostituzione, unanimità e finalizzazione');
 }finally{await Promise.all(clients.map(c=>c.end()));}
}
main().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1;});
