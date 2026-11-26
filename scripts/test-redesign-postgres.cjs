// Avviare su un database locale sesto_test_ con tutte le migrazioni applicate.
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {Client} = require('pg');

async function main() {
  const url = new URL(process.env.TEST_0019_DATABASE_URL);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname) && /^\/sesto_test_/.test(url.pathname));
  const clients = [];
  async function session(userId) {
    const db = new Client({connectionString:url.href});
    await db.connect();
    clients.push(db);
    if (userId) {
      await db.query('set role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[userId]);
    }
    return db;
  }
  async function value(db,sql,args=[]) {
    const {rows:[row]} = await db.query(sql,args);
    return Object.values(row)[0];
  }
  try {
    const root = await session(), staffId = randomUUID(), memberId = randomUUID();
    for (const [id,role] of [[staffId,'amministratore'],[memberId,'socio']]) {
      await root.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id+'@example.invalid']);
      await root.query('insert into ruoli_utente(utente_id,ruolo) values($1,$2)',[id,role]);
    }
    const [staff,otherStaff,member] = await Promise.all([staffId,staffId,memberId].map(session));
    const item = await value(staff,"insert into attrezzature(codice,categoria) values($1,'Collaudo') returning id",[randomUUID()]);
    const createRevision = "select registra_revisione($1,$2,current_date-1,current_date+30,$3,'OK',12.50,null,$4)";
    const first = [randomUUID(),item,'Manutenzione',false];
    await assert.rejects(member.query(createRevision,first),{code:'42501'});
    const ids = await Promise.all([staff,otherStaff].map(db=>value(db,createRevision,first)));
    assert.deepEqual(ids,[first[0],first[0]]);
    await assert.rejects(staff.query(createRevision,[first[0],item,'Altro',true]),{code:'P3502'});
    await assert.rejects(staff.query(createRevision,[randomUUID(),item,' manutenzione ',false]),{code:'P3503'});
    const pair = await Promise.allSettled([staff,otherStaff].map(db=>value(db,createRevision,[randomUUID(),item,'Verifica',false])));
    assert.equal(pair.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(pair.find(r=>r.status==='rejected').reason.code,'P3503');
    await staff.query(createRevision,[randomUUID(),item,'Verifica',true]);
    assert.equal(await value(staff,'select count(*)::int from revisioni_attrezzature where attrezzatura_id=$1',[item]),3);
    await staff.query("insert into revisioni_attrezzature(attrezzatura_id,data_intervento,tipo) values($1,current_date-8,'Storico')",[item]);
    assert.equal(await value(staff,'select ultima_revisione=current_date-1 and prossima_revisione=current_date+30 from attrezzature where id=$1',[item]),true);
    await assert.rejects(staff.query('update revisioni_attrezzature set prossimo_intervento=current_date+90 where id=$1',[first[0]]),{code:'P3504'});
    const secondItem=await value(staff,"insert into attrezzature(codice,categoria) values($1,'Collaudo') returning id",[randomUUID()]);
    const latest=await value(staff,createRevision,[randomUUID(),secondItem,'Annuale',false]);
    const historical=await value(staff,"insert into revisioni_attrezzature(attrezzatura_id,data_intervento,tipo) values($1,current_date-10,'Storico') returning id",[secondItem]);
    await staff.query('update revisioni_attrezzature set data_intervento=current_date-9 where id=$1',[historical]);
    await staff.query('update revisioni_attrezzature set prossimo_intervento=current_date+60 where id=$1',[latest]);
    assert.equal(await value(staff,'select ultima_revisione=current_date-1 and prossima_revisione=current_date+60 from attrezzature where id=$1',[secondItem]),true);
    await assert.rejects(staff.query('update revisioni_attrezzature set prossimo_intervento=null where id=$1',[latest]),{code:'P3504'});
    console.log('OK revisioni: permesso, due sessioni, retry, duplicato, storico e scadenza');

    const person = await value(staff,"insert into persone(nome,cognome) values('Socio','Collaudo') returning id");
    const lend = 'insert into assegnazioni_attrezzature(attrezzatura_id,persona_id,assegnata_il) values($1,$2,current_date) returning id';
    const loans = await Promise.allSettled([staff,otherStaff].map(db=>value(db,lend,[item,person])));
    assert.equal(loans.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(loans.find(r=>r.status==='rejected').reason.code,'23505');
    assert.equal(await value(staff,'select stato from attrezzature where id=$1',[item]),'assegnata');
    await staff.query('update assegnazioni_attrezzature set restituita_il=current_date where id=$1',[loans.find(r=>r.status==='fulfilled').value]);
    assert.equal(await value(staff,'select stato from attrezzature where id=$1',[item]),'disponibile');
    console.log('OK prestito: doppia consegna concorrente e disponibilità dopo restituzione');

    const debt = await value(staff,'insert into quote_associative(persona_id,stagione_id,importo_dovuto) select $1,id,100 from stagioni where attiva returning id',[person]);
    const pay = "select registra_pagamento_guidato($1,$2,null,$3,current_date,'contanti',null,null,$4)";
    const part = [person,debt,60,randomUUID()];
    const receipts = await Promise.all([staff,otherStaff].map(db=>value(db,pay,part)));
    assert.equal(receipts[0],receipts[1]);
    assert.equal(await value(staff,'select count(*)::int from movimenti_economici where pagamento_id=$1',[receipts[0]]),1);
    await assert.rejects(staff.query(pay,[person,debt,41,randomUUID()]),{code:'P3401'});
    const final = await value(staff,pay,[person,debt,40,randomUUID()]);
    const residual = () => value(staff,'select residuo::int from saldi_quote where id=$1',[debt]);
    assert.equal(await residual(),0);
    await staff.query("select admin_rettifica_incasso($1,'Rettifica di collaudo')",[final]);
    assert.equal(await residual(),40);
    console.log('OK incassi: retry concorrente, movimento unico, saldo, eccedenza e rettifica');

    // Il destinatario può leggere e aggiornare solo le proprie notifiche.
    const notification = await value(root,"insert into notifiche(utente_id,tipo,riferimento,titolo,messaggio) values($1,'collaudo',$2,'Prova','Messaggio sintetico') returning id",[memberId,randomUUID()]);
    const otherNotification = await value(root,"insert into notifiche(utente_id,tipo,riferimento,titolo,messaggio) values($1,'collaudo',$2,'Prova','Messaggio sintetico') returning id",[staffId,randomUUID()]);
    assert.equal(await value(member,'select count(*)::int from notifiche where id=$1',[otherNotification]),0);
    await member.query('select segna_notifica_letta($1)',[otherNotification]);
    assert.equal(await value(root,'select letta_il is null from notifiche where id=$1',[otherNotification]),true);
    await member.query('select segna_notifica_letta($1)',[notification]);
    const readAt = await value(root,'select letta_il::text from notifiche where id=$1',[notification]);
    assert.ok(readAt);
    await member.query('select segna_notifica_letta($1)',[notification]);
    assert.equal(await value(root,'select letta_il::text from notifiche where id=$1',[notification]),readAt);
    console.log('OK notifiche: isolamento tra account, lettura e idempotenza');

    // Ultimo posto di un evento: due account realmente distinti e due transazioni.
    // La stagione viene adattata al giorno di esecuzione esclusivamente nel DB effimero.
    const season = await value(root,"update stagioni set dal=current_date-30,al=current_date+100 where attiva returning id");
    const member2Id=randomUUID();
    await root.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[member2Id,member2Id+'@example.invalid']);
    await root.query("insert into ruoli_utente(utente_id,ruolo) values($1,'socio')",[member2Id]);
    const member2=await session(member2Id);
    const participants=[];
    for(const account of [memberId,member2Id]){
      const p=await value(root,"insert into persone(nome,cognome) values('Socio','Evento') returning id");
      participants.push(p);
      await root.query("insert into collegamenti_persone values($1,$2,'titolare')",[account,p]);
      await root.query("insert into adesioni(persona_id,stagione_id,stato) values($1,$2,'attiva')",[p,season]);
      await root.query("insert into quote_associative(persona_id,stagione_id,importo_dovuto) values($1,$2,10)",[p,season]);
      const quota=await value(root,'select id from quote_associative where persona_id=$1 and stagione_id=$2',[p,season]);
      await staff.query(pay,[p,quota,10,randomUUID()]);
    }
    const event=await value(staff,"select area_soci_salva_evento(null,'Evento di prova','Luogo','Descrizione',current_date+2,current_date+2,0,1,'aperto')");
    const join='select area_soci_iscrivi($1,$2)';
    await assert.rejects(member.query(join,[event,participants[1]]),{code:'42501'});
    const booked=await Promise.allSettled([member,member2].map((db,i)=>value(db,join,[event,participants[i]])));
    assert.equal(booked.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(booked.find(r=>r.status==='rejected').reason.code,'P3416');
    const winner=booked.findIndex(r=>r.status==='fulfilled'), loser=1-winner;
    const accounts=[member,member2], reservation=booked[winner].value;
    assert.equal(await value(accounts[winner],join,[event,participants[winner]]),reservation);
    assert.equal(await value(staff,'select area_soci_posti($1)',[event]),0);
    assert.equal(await value(accounts[loser],'select count(*)::int from eventi_soci_iscrizioni where id=$1',[reservation]),0);
    await assert.rejects(accounts[loser].query("select area_soci_decidi($1,$2,'ritirata')",[event,reservation]),{code:'42501'});
    await staff.query("select area_soci_decidi($1,$2,'approvata')",[event,reservation]);
    await accounts[winner].query("select area_soci_decidi($1,$2,'ritirata')",[event,reservation]);
    assert.equal(await value(staff,'select area_soci_posti($1)',[event]),1);
    const next=await value(accounts[loser],join,[event,participants[loser]]);
    await staff.query("select area_soci_salva_evento($1,'Evento di prova','Luogo','Descrizione',current_date+2,current_date+2,0,1,'annullato')",[event]);
    assert.equal(await value(staff,'select stato from eventi_soci_iscrizioni where id=$1',[next]),'annullata');
    await assert.rejects(accounts[winner].query(join,[event,participants[winner]]),{code:'P3415'});
    console.log('OK eventi: ultimo posto concorrente, retry, isolamento, ritiro e annullamento');

    // Due corsi sulla stessa corsia: fallimento atomico e intervalli adiacenti.
    const catalog=await value(staff,"insert into corsi(nome,tipo) values($1,'APNEA') returning id",['Collaudo '+randomUUID()]);
    const editions=[];
    for(const name of ['Primo','Secondo'])editions.push(await value(staff,"insert into edizioni_corsi(corso_id,stagione_id,nome,inizio,fine,direttore_id) values($1,$2,$3,current_date,current_date+10,$4) returning id",[catalog,season,name,person]));
    const pool=await value(staff,"insert into piscine(nome) values('Piscina di prova') returning id");
    const lane=await value(staff,'insert into corsie(piscina_id,numero) values($1,1) returning id',[pool]);
    const createLesson="select crea_lezione_guidata($1,$2,(current_date+1+time '10:00') at time zone 'Europe/Rome',(current_date+1+time '11:00') at time zone 'Europe/Rome',$3,array[$4]::uuid[],null,null)";
    const collision=await Promise.allSettled([staff,otherStaff].map((db,i)=>value(db,createLesson,[editions[i],'Lezione '+i,pool,lane])));
    assert.equal(collision.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(collision.find(r=>r.status==='rejected').reason.code,'23P01');
    const successful=collision.findIndex(r=>r.status==='fulfilled'), lesson=collision[successful].value;
    assert.equal(await value(staff,'select count(*)::int from lezioni where edizione_id=any($1::uuid[])',[editions]),1);
    const adjacent=await value(staff,createLesson.replace("time '10:00'","time '11:00'").replace("time '11:00') at time zone 'Europe/Rome',$3","time '12:00') at time zone 'Europe/Rome',$3"),[editions[1-successful],'Adiacente',pool,lane]);
    const modify="select modifica_lezione_e_corsie($1,'Modificata',(current_date+1+time '10:30') at time zone 'Europe/Rome',(current_date+1+time '11:30') at time zone 'Europe/Rome',$2,array[$3]::uuid[],null,null,null)";
    await assert.rejects(staff.query(modify,[lesson,pool,lane]),{code:'23P01'});
    assert.equal(await value(staff,"select titolo from lezioni where id=$1",[lesson]),'Lezione '+successful);
    assert.equal(await value(staff,"select count(*)::int from prenotazioni_corsie where lezione_id=$1 and stato='confermata'",[lesson]),1);
    await staff.query("update prenotazioni_corsie set fine=fine-interval '15 minutes' where lezione_id=$1",[lesson]);
    await assert.rejects(staff.query(modify,[lesson,pool,lane]),{code:'P3505'});
    assert.equal(await value(staff,"select extract(epoch from (fine-inizio))::int from prenotazioni_corsie where lezione_id=$1",[lesson]),2700);
    await staff.query('select annulla_lezione_guidata($1)',[adjacent]);
    assert.equal(await value(staff,"select count(*)::int from prenotazioni_corsie where lezione_id=$1 and stato='confermata'",[adjacent]),0);
    console.log('OK calendario: conflitto concorrente, rollback atomico, adiacenza, tutela prenotazioni parziali e annullamento');

    // Registro presenze: il ruolo istruttore non può modificare la lezione,
    // ma deve poter acquisire il lock tramite il trigger protetto.
    const teacherId=randomUUID();
    await root.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[teacherId,teacherId+'@example.invalid']);
    await root.query("insert into ruoli_utente(utente_id,ruolo) values($1,'istruttore')",[teacherId]);
    await root.query("insert into collegamenti_persone values($1,$2,'titolare')",[teacherId,person]);
    const teacher=await session(teacherId);
    await staff.query("insert into assegnazioni_istruttori(edizione_id,persona_id,ruolo) values($1,$2,'responsabile')",[editions[successful],person]);
    const learner=participants[0];
    const adhesion=await value(root,'select id from adesioni where persona_id=$1 and stagione_id=$2',[learner,season]);
    await root.query("insert into tesseramenti(adesione_id,ente,stato,scade_il) values($1,'Ente','attiva',current_date+50)",[adhesion]);
    await staff.query("insert into iscrizioni_corsi(edizione_id,persona_id,stato) values($1,$2,'iscritto')",[editions[successful],learner]);
    const register="insert into presenze(lezione_id,persona_id,presente) values($1,$2,true)";
    await assert.rejects(member.query(register,[lesson,learner]),{code:'42501'});
    const fresh=await value(staff,"select crea_lezione_guidata($1,'Registro',(current_date+2+time '10:00') at time zone 'Europe/Rome',(current_date+2+time '11:00') at time zone 'Europe/Rome',null,array[]::uuid[],null,null)",[editions[successful]]);
    const reverse=await value(staff,"select crea_lezione_guidata($1,'Registro inverso',(current_date+3+time '10:00') at time zone 'Europe/Rome',(current_date+3+time '11:00') at time zone 'Europe/Rome',null,array[]::uuid[],null,null)",[editions[successful]]);
    async function waitForLock(blocked,blocker){
      for(let i=0;i<100;i++){
        if(await value(root,'select $2::int=any(pg_blocking_pids($1::int))',[blocked,blocker]))return;
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      throw Error('Lock concorrente non rilevato');
    }
    const pidTeacher=await value(teacher,'select pg_backend_pid()'),pidStaff=await value(otherStaff,'select pg_backend_pid()');
    await teacher.query('begin');
    await teacher.query(register,[fresh,learner]);
    const cancellation=otherStaff.query('select annulla_lezione_guidata($1)',[fresh]).then(()=>null,e=>e);
    try{await waitForLock(pidStaff,pidTeacher);await teacher.query('commit');}
    catch(e){await teacher.query('rollback');await cancellation;throw e;}
    assert.equal((await cancellation)?.code,'P0001');
    assert.equal(await value(staff,'select annullata_il is null from lezioni where id=$1',[fresh]),true);
    await assert.rejects(staff.query("update lezioni set fine=fine+interval '15 minutes' where id=$1",[fresh]),{code:'P3507'});
    await assert.rejects(staff.query('update lezioni set annullata_il=now() where id=$1',[fresh]),{code:'P3507'});
    await assert.rejects(staff.query('update lezioni set annullata_il=now() where id=$1',[lesson]),{code:'P3507'});
    await otherStaff.query('begin');
    await otherStaff.query('select annulla_lezione_guidata($1)',[reverse]);
    const attendance=teacher.query(register,[reverse,learner]).then(()=>null,e=>e);
    try{await waitForLock(pidTeacher,pidStaff);await otherStaff.query('commit');}
    catch(e){await otherStaff.query('rollback');await attendance;throw e;}
    assert.equal((await attendance)?.code,'P3506');
    assert.equal(await value(staff,'select count(*)::int from presenze where lezione_id=$1',[reverse]),0);
    console.log('OK presenze: istruttore assegnato, doppio ordine concorrente, annullamento e modifica diretta protetti');

    // Scadenze: solo residui positivi, destinatari collegati e retry idempotente.
    await root.query("update quote_associative set scadenza=current_date+7 where id=$1 or persona_id=$2",[debt,participants[0]]);
    await root.query("update impostazioni_promemoria set giorni_anticipo=array[7],attivo=true where tipo='quota_associativa'");
    await assert.rejects(member.query('select genera_promemoria()'),{code:'42501'});
    const service=await session();
    await service.query('set role service_role');
    await service.query("select set_config('request.jwt.claim.role','service_role',false)");
    await service.query('select genera_promemoria()');
    const dueCount=()=>value(root,"select count(*)::int from notifiche where tipo='quota_associativa' and utente_id=$1 and riferimento=$2",[teacherId,debt+':7']);
    assert.equal(await dueCount(),1);
    assert.equal(await value(root,"select count(*)::int from notifiche n join quote_associative q on split_part(n.riferimento,':',1)=q.id::text where n.tipo='quota_associativa' and q.persona_id=$1",[participants[0]]),0);
    await service.query('select genera_promemoria()');
    assert.equal(await dueCount(),1);
    await staff.query(pay,[person,debt,40,randomUUID()]);
    assert.equal(await residual(),0);
    await service.query('select genera_promemoria()');
    assert.equal(await dueCount(),1);
    console.log('OK scadenze: quota residua, esclusione saldate, destinatario, idempotenza e ruolo cron');



  } finally {
    await Promise.all(clients.map(db=>db.end()));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
