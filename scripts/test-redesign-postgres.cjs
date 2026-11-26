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

  } finally {
    await Promise.all(clients.map(db=>db.end()));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
