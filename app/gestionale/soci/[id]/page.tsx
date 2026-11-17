import RemoveRecord from '@/components/RemoveRecord';
import CancelEditButton from '@/components/CancelEditButton';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff} from '@/lib/security';
import {formatValue} from '@/lib/format';
import CodiceFiscaleAssist from '@/components/CodiceFiscaleAssist';
import {updateMemberProfile,createMemberAdhesion} from '../actions';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Person={id:string;nome:string;cognome:string;data_nascita:string|null;luogo_nascita:string|null;codice_fiscale:string|null;indirizzo:string|null;cap:string|null;comune:string|null;email:string|null;telefono:string|null};
type Membership={id:string;stagione_id:string;stato:string;data_approvazione:string;note:string|null};
type Season={id:string;nome:string;attiva:boolean};
type Card={id:string;adesione_id:string;ente:string;numero_tessera:string|null;scade_il:string;stato:string};
type Payment={id:string;quota_id:string|null;addebito_corso_id:string|null;importo:number;data_pagamento:string;metodo:string};
type Balance={id:string;stagione_id:string;importo_dovuto:number;versato:number;residuo:number;stato:string};
type Enrollment={id:string;edizione_id:string;stato:string;iscritta_il:string};
type Edition={id:string;nome:string;corso_id:string;inizio:string;fine:string};
type Course={id:string;nome:string;tipo:string;livello:number|null};
type Cert={id:string;rilasciato_il:string;scade_il:string;idoneita_verificata:boolean};
type Patent={id:string;titolo:string;ente:string|null;numero_brevetto:string|null;ottenuto_il:string|null;scade_il:string|null};
type Qualification={id:string;titolo:string;ente:string|null;scade_il:string|null};
type Equipment={id:string;attrezzatura_id:string;assegnata_il:string;restituita_il:string|null};
type Document={id:string;nome:string;categoria:string;caricato_il:string};
type Guardian={minore_id:string;tutore_id:string;parentela:string};
const euro=(n:number|string|null|undefined)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(Number(n??0));
const statusLabel=(s:string)=>s.replaceAll('_',' ');
const statusMessage:Record<string,string>={eliminato:'Elemento rimosso.',elimina_collegati:'Rimozione non consentita: il record è collegato ad altri dati o è protetto.',elimina_conferma:'Conferma la rimozione.',database:'Rimozione non riuscita: verifica autorizzazioni e migrazione.',salvato:'Anagrafica aggiornata. La modifica è tracciata nel registro amministrativo.',
 adesione_creata:'Adesione registrata in stato «da perfezionare». Verificare separatamente quota e tesseramento.',
 cf:'Codice fiscale non coerente con i dati anagrafici, oppure comune/Stato di nascita non identificato. Verifica i dati e usa il CF ufficiale.', omocodia:'Omocodia: conferma la verifica documentale e indica la motivazione.', dati:'Alcuni dati non sono validi. Controlla la compilazione.',duplicato:'Esiste già un altro socio con questo codice fiscale.',
 adesione_esistente:'Per questa stagione esiste già un’adesione.',errore:'Operazione non riuscita. Controlla le autorizzazioni o i vincoli del database.'};
function dateState(value:string|null|undefined){
 if(!value)return {label:'Non indicata',kind:''};
 const target=new Date(`${value}T12:00:00Z`);
 const today=new Date();const now=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate(),12));
 const delta=Math.ceil((target.getTime()-now.getTime())/86400000);
 if(delta<0)return {label:'Scaduto',kind:'danger'};
 if(delta<=30)return {label:'In scadenza',kind:'warning'};
 return {label:'In corso di validità',kind:'success'};
}
function Section({id,title,href,children}:{id:string;title:string;href?:string;children:React.ReactNode}){
 return <section className="panel member-section" id={id}><div className="member-section-heading"><h2>{title}</h2>
 {href&&<Link href={href} className="member-mini-action">Apri gestione</Link>}</div>{children}</section>;
}
function None({children='Nessun elemento registrato.'}:{children?:string}){return <p className="muted tiny">{children}</p>;}

export default async function MemberDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{msg?:string}>}){
 const {id}=await params;
 if(!uuid.test(id))notFound();
 const {supabase}=await requireStaff();
 const {data:personData,error:personError}=await supabase.from('persone')
  .select('id,nome,cognome,data_nascita,luogo_nascita,codice_fiscale,indirizzo,cap,comune,email,telefono,provincia_nascita,stato_nascita,provincia_residenza,stato_residenza,sesso_cf,codice_catastale_nascita,cf_omocodia_verificata,cf_override_motivo').eq('id',id).maybeSingle();
 if(personError||!personData)notFound();
 const person=personData as unknown as (Person&{provincia_nascita:string|null;stato_nascita:string|null;provincia_residenza:string|null;stato_residenza:string|null;sesso_cf:string|null;codice_catastale_nascita:string|null;cf_omocodia_verificata:boolean;cf_override_motivo:string|null});
 const [{data:seasonsData},{data:membershipsData,error:memberError},{data:balancesData,error:balanceError},
  {data:paymentsData},{data:enrollmentsData},{data:certsData},{data:patentsData},
  {data:qualificationsData},{data:assignmentsData},{data:documentsData},
  {data:guardianData},{data:wardData},{data:equipmentData}]=await Promise.all([
  supabase.from('stagioni').select('id,nome,attiva').order('dal',{ascending:false}),
  supabase.from('adesioni').select('id,stagione_id,stato,data_approvazione,note,verbale_cda_id').eq('persona_id',id).order('data_approvazione',{ascending:false}).limit(100),
  supabase.from('saldi_quote').select('id,stagione_id,importo_dovuto,versato,residuo,stato').eq('persona_id',id).limit(100),
  supabase.from('pagamenti').select('id,quota_id,addebito_corso_id,importo,data_pagamento,metodo').eq('persona_id',id).order('data_pagamento',{ascending:false}).limit(50),
  supabase.from('iscrizioni_corsi').select('id,edizione_id,stato,iscritta_il').eq('persona_id',id).order('iscritta_il',{ascending:false}).limit(100),
  supabase.from('certificati_medici').select('id,rilasciato_il,scade_il,idoneita_verificata').eq('persona_id',id).order('rilasciato_il',{ascending:false}).limit(50),
  supabase.from('brevetti_allievi').select('id,titolo,ente,numero_brevetto,ottenuto_il,scade_il').eq('persona_id',id).order('ottenuto_il',{ascending:false}).limit(50),
  supabase.from('qualifiche_istruttori').select('id,titolo,ente,scade_il').eq('persona_id',id).limit(50),
  supabase.from('assegnazioni_istruttori').select('id,edizione_id,ruolo').eq('persona_id',id).limit(100),
  supabase.from('documenti').select('id,nome,categoria,caricato_il').eq('persona_id',id).order('caricato_il',{ascending:false}).limit(50),
  supabase.from('relazioni_tutori').select('minore_id,tutore_id,parentela').eq('minore_id',id).limit(20),
  supabase.from('relazioni_tutori').select('minore_id,tutore_id,parentela').eq('tutore_id',id).limit(20),
  supabase.from('assegnazioni_attrezzature').select('id,attrezzatura_id,assegnata_il,restituita_il').eq('persona_id',id).order('assegnata_il',{ascending:false}).limit(50),
 ]);
 const seasons=(seasonsData??[]) as unknown as Season[];
 const memberships=(membershipsData??[]) as unknown as (Membership&{verbale_cda_id:string|null})[];
 const vIds=[...new Set(memberships.map(m=>m.verbale_cda_id).filter((v):v is string=>Boolean(v)))];
 const {data:boardMinutes}=vIds.length?await supabase.from('cda_verbali').select('id,data_consiglio').in('id',vIds):{data:[]};
 const balances=(balancesData??[]) as unknown as Balance[];
 const payments=(paymentsData??[]) as unknown as Payment[];
 const enrollments=(enrollmentsData??[]) as unknown as Enrollment[];
 const certs=(certsData??[]) as unknown as Cert[];
 const patents=(patentsData??[]) as unknown as Patent[];
 const qualifications=(qualificationsData??[]) as unknown as Qualification[];
 const assignments=(assignmentsData??[]) as unknown as {id:string;edizione_id:string;ruolo:string}[];
 const documents=(documentsData??[]) as unknown as Document[];
 const guardians=(guardianData??[]) as unknown as Guardian[];
 const wards=(wardData??[]) as unknown as Guardian[];
 const equipment=(equipmentData??[]) as unknown as Equipment[];
 const editionIds=[...new Set([...enrollments.map(x=>x.edizione_id),...assignments.map(x=>x.edizione_id)])];
 const [{data:editionsData},{data:cardsData},{data:equipmentNamesData}]=await Promise.all([
  editionIds.length?supabase.from('edizioni_corsi').select('id,nome,corso_id,inizio,fine').in('id',editionIds.slice(0,200)):
   Promise.resolve({data:[]}),
  memberships.length?supabase.from('tesseramenti').select('id,adesione_id,ente,numero_tessera,scade_il,stato')
   .in('adesione_id',memberships.map(x=>x.id)).limit(100):Promise.resolve({data:[]}),
  equipment.length?supabase.from('attrezzature').select('id,codice,categoria').in('id',equipment.map(x=>x.attrezzatura_id)):
   Promise.resolve({data:[]}),
 ]);
 const editions=(editionsData??[]) as unknown as Edition[];
 const cards=(cardsData??[]) as unknown as Card[];
 const courseIds=[...new Set(editions.map(x=>x.corso_id))];
 const {data:coursesData}=courseIds.length?await supabase.from('corsi').select('id,nome,tipo,livello').in('id',courseIds):{data:[]};
 const courses=(coursesData??[]) as unknown as Course[];
 const guardianIds=[...new Set([...guardians.map(g=>g.tutore_id),...wards.map(g=>g.minore_id)])];
 const {data:familyData}=guardianIds.length?await supabase.from('persone').select('id,nome,cognome').in('id',guardianIds):{data:[]};
 const family=(familyData??[]) as unknown as {id:string;nome:string;cognome:string}[];
 const seasonName=(key:string)=>seasons.find(s=>s.id===key)?.nome??'Stagione non trovata';
 const editionName=(key:string)=>{
  const ed=editions.find(e=>e.id===key);
  const course=courses.find(c=>c.id===ed?.corso_id);
  return ed?`${ed.nome}${course?` · ${course.tipo}${course.livello?` ${course.livello}`:''}`:''}`:'Edizione non disponibile';
 };
 const equipmentNames=(equipmentNamesData??[]) as unknown as {id:string;codice:string;categoria:string}[];
 const newSeasons=seasons.filter(s=>!memberships.some(m=>m.stagione_id===s.id));
 const active=memberships.find(m=>seasons.find(s=>s.id===m.stagione_id)?.attiva)??memberships[0];
 const newestCert=certs[0];
 const certState=dateState(newestCert?.scade_il);
 const debt=balances.reduce((sum,q)=>sum+Number(q.residuo),0);
 const {msg}=await searchParams;
 const partialErrors=Boolean(memberError||balanceError);
 return <>
  <div className="page-intro member-heading"><div><p className="eyebrow">Segreteria · Scheda unificata</p>
   <h1>{person.cognome} {person.nome}</h1>
   <p>{person.codice_fiscale??'Codice fiscale non registrato'} · {person.email??person.telefono??'Recapiti da completare'}</p></div>
   <Link className="button ghost" href="/gestionale/soci">Torna all’elenco</Link></div>
  {msg&&statusMessage[msg]&&<p role="status" className={`notice ${['salvato','adesione_creata'].includes(msg)?'success':'warning'}`}>{statusMessage[msg]}</p>}
  {partialErrors&&<p className="notice warning">Alcune sezioni non sono state caricate. Verifica che le migrazioni 0002 e 0003 siano applicate.</p>}
  <div className="member-summary-grid">
   <div className="panel member-summary"><span>Adesione · {active?seasonName(active.stagione_id):'non presente'}</span>
    <strong>{active?statusLabel(active.stato):'Da inserire'}</strong></div>
   <div className="panel member-summary"><span>Iscrizioni ai corsi</span><strong>{enrollments.length}</strong></div>
   <div className="panel member-summary"><span>Residuo quote associative</span><strong>{euro(debt)}</strong></div>
   <div className="panel member-summary"><span>Certificato più recente</span><strong>{newestCert?certState.label:'Non presente'}</strong></div>
  </div>
  <nav className="member-jump" aria-label="Sezioni della scheda">
   {['Anagrafica','Adesioni','Corsi','Pagamenti','Certificati','Brevetti','Documenti','Istruttore','Attrezzature','Famiglia']
    .map(x=><a key={x} href={`#${x.toLowerCase()}`}>{x}</a>)}
  </nav>
  <div className="member-sections">
   <Section id="anagrafica" title="Anagrafica e recapiti">
    <div className="detail-grid">
     <div><span className="k">Data e luogo di nascita</span><strong>{formatValue(person.data_nascita)} · {person.luogo_nascita??'—'}</strong></div>
     <div><span className="k">Codice fiscale</span><strong>{person.codice_fiscale??'—'}</strong></div>
     <div><span className="k">Indirizzo di residenza</span><strong>{[person.indirizzo,person.cap,person.comune].filter(Boolean).join(' · ')||'—'}</strong></div>
     <div><span className="k">Recapiti</span><strong>{person.email??'—'} · {person.telefono??'—'}</strong></div>
    </div>
    <details className="member-edit"><summary>Modifica anagrafica e recapiti</summary>
     <form action={updateMemberProfile} className="stack"><input type="hidden" name="id" value={person.id}/>
      <div className="form-grid">
       {(['nome','cognome','codice_fiscale','luogo_nascita','indirizzo','cap','comune','telefono','email'] as const).map(key=>
        <label key={key}>{({nome:'Nome',cognome:'Cognome',codice_fiscale:'Codice fiscale',luogo_nascita:'Comune di nascita (o città estera)',indirizzo:'Indirizzo di residenza',cap:'CAP',comune:'Comune di residenza',telefono:'Telefono',email:'Email'})[key]}
         <input name={key} type={key==='email'?'email':'text'} maxLength={key==='email'?254:key==='indirizzo'?250:key==='luogo_nascita'?150:100}
          required={key==='nome'||key==='cognome'} defaultValue={person[key]??''}/></label>)}
       <label>Data di nascita<input name="data_nascita" type="date" defaultValue={person.data_nascita??''}/></label>
       <label>Provincia nascita<input name="provincia_nascita" maxLength={2} defaultValue={person.provincia_nascita??''}/></label>
       <label>Stato di nascita<input name="stato_nascita" maxLength={100} defaultValue={person.stato_nascita??''}/></label>
       <label>Provincia residenza<input name="provincia_residenza" maxLength={2} defaultValue={person.provincia_residenza??''}/></label>
       <label>Stato residenza<input name="stato_residenza" maxLength={15} defaultValue={person.stato_residenza??''}/></label>
       <label>Sesso per CF<select name="sesso_cf" defaultValue={person.sesso_cf??''}><option value="">Non indicato</option><option value="M">M</option><option value="F">F</option></select></label>
       <label className="check-label"><input type="checkbox" name="cf_omocodia_verificata" defaultChecked={person.cf_omocodia_verificata}/><span>Omocodia verificata con documentazione</span></label>
       <label>Motivazione verifica documentale CF<input name="cf_override_motivo" maxLength={500} defaultValue={person.cf_override_motivo??''} placeholder="Es. omocodia attestata da tessera sanitaria"/></label>
      </div><CodiceFiscaleAssist/><div className="form-actions"><button type="submit" className="button">Salva anagrafica</button><CancelEditButton/></div>
      <p className="tiny muted">Le rettifiche vengono registrate nel registro operazioni, senza copiare i dati anagrafici nel log.</p>
     </form></details><RemoveRecord moduleKey="anagrafiche" id={person.id} back="soci"/>
   </Section>
   <Section id="adesioni" title="Adesioni e tesseramenti" href="/gestionale/moduli/adesioni">
    {memberships.length?<div className="table-panel"><table><thead><tr><th>Stagione</th><th>Stato</th><th>Data</th><th>Delibera CdA</th><th>Tessere</th><th>Azioni</th></tr></thead><tbody>
     {memberships.map(m=><tr key={m.id}><td>{seasonName(m.stagione_id)}</td><td><span className="status">{statusLabel(m.stato)}</span></td>
      <td>{formatValue(m.data_approvazione)}</td><td>{m.verbale_cda_id?<Link href={`/organi-sociali/documento/${m.verbale_cda_id}?tipo=pdf`}>{formatValue(boardMinutes?.find(x=>x.id===m.verbale_cda_id)?.data_consiglio??null)}</Link>:'In attesa di delibera'}</td><td>{cards.filter(c=>c.adesione_id===m.id).map(c=><div key={c.id} className="member-mini-row">
       {c.ente} · {c.numero_tessera??'Numero non indicato'} · {formatValue(c.scade_il)} ({statusLabel(c.stato)})<RemoveRecord moduleKey="tesseramenti" id={c.id} back={`socio:${id}`}/></div>)}
       {!cards.some(c=>c.adesione_id===m.id)&&'Nessuna tessera'}</td><td><RemoveRecord moduleKey="adesioni" id={m.id} back={`socio:${id}`}/></td></tr>)}
    </tbody></table></div>:<None>Non risultano adesioni per questa persona.</None>}
    {newSeasons.length>0&&<details className="member-edit"><summary>Registra adesione per una nuova stagione</summary>
     <form action={createMemberAdhesion} className="stack"><input type="hidden" name="id" value={id}/>
      <label>Stagione<select name="stagione_id" required defaultValue=""><option value="">Seleziona stagione</option>
       {newSeasons.map(s=><option key={s.id} value={s.id}>{s.nome}{s.attiva?' · attiva':''}</option>)}</select></label>
      <p className="tiny muted">La nuova adesione sarà «da perfezionare». Non verranno creati pagamenti o tesseramenti automatici.</p>
      <button className="button" type="submit">Registra adesione</button>
     </form></details>}
   </Section>
   <Section id="corsi" title="Corsi e iscrizioni" href="/gestionale/moduli/iscrizioni">
    {enrollments.length?<div className="table-panel"><table><thead><tr><th>Corso</th><th>Periodo</th><th>Iscrizione</th><th>Azioni</th></tr></thead><tbody>
     {enrollments.map(e=>{const ed=editions.find(x=>x.id===e.edizione_id);return <tr key={e.id}><td>{editionName(e.edizione_id)}</td>
      <td>{ed?`${formatValue(ed.inizio)} – ${formatValue(ed.fine)}`:'—'}</td><td>{statusLabel(e.stato)}</td><td><RemoveRecord moduleKey="iscrizioni" id={e.id} back={`socio:${id}`}/></td></tr>;})}
    </tbody></table></div>:<None>Nessuna iscrizione a corsi registrata.</None>}
   </Section>
   <Section id="pagamenti" title="Quote associative e versamenti" href={`/gestionale/incassi?persona=${id}`}>
    {balances.length?<div className="table-panel"><table><thead><tr><th>Stagione</th><th>Dovuto</th><th>Versato</th><th>Residuo</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>
     {balances.map(b=><tr key={b.id}><td>{seasonName(b.stagione_id)}</td><td>{euro(b.importo_dovuto)}</td>
      <td>{euro(b.versato)}</td><td><strong>{euro(b.residuo)}</strong></td><td>{statusLabel(b.stato)}</td><td><RemoveRecord moduleKey="quote" id={b.id} back={`socio:${id}`}/></td></tr>)}
    </tbody></table></div>:<None>Nessuna quota associativa registrata.</None>}
    <h3>Ultimi versamenti</h3>{payments.length?<div className="table-panel"><table><thead><tr><th>Data</th><th>Tipologia</th><th>Importo</th><th>Metodo</th></tr></thead><tbody>
     {payments.map(p=><tr key={p.id}><td>{formatValue(p.data_pagamento)}</td><td>{p.quota_id?'Quota associativa':'Iscrizione corso'}</td>
      <td>{euro(p.importo)}</td><td>{p.metodo}</td></tr>)}
    </tbody></table></div>:<None>Nessun versamento registrato.</None>}
    <p className="tiny muted">Le quote e gli importi dei corsi sono separati. I versamenti registrati non si modificano direttamente.</p>
   </Section>
   <Section id="certificati" title="Certificati medici — verifica amministrativa" href="/gestionale/moduli/certificati">
    <p className="tiny muted">Sono mostrate solo data di rilascio, scadenza e verifica amministrativa. Non inserire diagnosi o dati clinici.</p>
    {certs.length?<div className="table-panel"><table><thead><tr><th>Rilasciato</th><th>Scadenza</th><th>Validità temporale</th><th>Verifica</th><th>Azioni</th></tr></thead><tbody>
     {certs.map(c=><tr key={c.id}><td>{formatValue(c.rilasciato_il)}</td><td>{formatValue(c.scade_il)}</td>
      <td><span className={`member-state ${dateState(c.scade_il).kind}`}>{dateState(c.scade_il).label}</span></td>
      <td>{c.idoneita_verificata?'Verificato dalla segreteria':'Da verificare'}</td><td><RemoveRecord moduleKey="certificati" id={c.id} back={`socio:${id}`}/></td></tr>)}
    </tbody></table></div>:<None>Nessun certificato registrato.</None>}
   </Section>
   <Section id="brevetti" title="Brevetti conseguiti" href="/gestionale/moduli/brevetti">
    {patents.length?<div className="table-panel"><table><thead><tr><th>Brevetto</th><th>Ente</th><th>Conseguito</th><th>Scadenza</th><th>Azioni</th></tr></thead><tbody>
     {patents.map(p=><tr key={p.id}><td>{p.titolo}</td><td>{p.ente??'—'}</td><td>{formatValue(p.ottenuto_il)}</td><td>{formatValue(p.scade_il)}</td><td><RemoveRecord moduleKey="brevetti" id={p.id} back={`socio:${id}`}/></td></tr>)}
    </tbody></table></div>:<None>Nessun brevetto registrato.</None>}
   </Section>
   <Section id="documenti" title="Documenti collegati" href="/documenti">
    {documents.length?<ul className="member-docs">{documents.map(d=><li key={d.id}><Link href={`/documenti/${d.id}`}>{d.nome}</Link>
     <span className="muted tiny">{d.categoria} · {formatValue(d.caricato_il)}</span></li>)}</ul>:<None>Non risultano documenti collegati direttamente a questa anagrafica.</None>}
    <p className="tiny muted">Alcuni documenti caricati dall’account possono non essere ancora associati all'anagrafica: verifica nell'archivio.</p>
   </Section>
   <Section id="istruttore" title="Qualifiche e attività da istruttore" href="/gestionale/moduli/qualifiche">
    {qualifications.map(q=><div className="info-row" key={q.id}><span>{q.titolo}{q.ente?` · ${q.ente}`:''}</span><strong>{q.scade_il?`Scade ${formatValue(q.scade_il)}`:'Nessuna scadenza'}</strong><RemoveRecord moduleKey="qualifiche" id={q.id} back={`socio:${id}`}/></div>)}
    {assignments.map(a=><div className="info-row" key={a.id}><span>{editionName(a.edizione_id)}</span><strong>{statusLabel(a.ruolo)}</strong><RemoveRecord moduleKey="istruttori" id={a.id} back={`socio:${id}`}/></div>)}
    {qualifications.length===0&&assignments.length===0&&<None>Nessuna qualifica o assegnazione da istruttore.</None>}
   </Section>
   <Section id="attrezzature" title="Prestiti e consegne attrezzature" href="/gestionale/moduli/consegne">
    {equipment.length?<div className="table-panel"><table><thead><tr><th>Attrezzatura</th><th>Consegnata</th><th>Restituzione</th><th>Azioni</th></tr></thead><tbody>
     {equipment.map(e=><tr key={e.id}><td>{equipmentNames.find(x=>x.id===e.attrezzatura_id)?.codice??'Attrezzatura non trovata'}</td>
      <td>{formatValue(e.assegnata_il)}</td><td>{formatValue(e.restituita_il)}</td><td><RemoveRecord moduleKey="consegne" id={e.id} back={`socio:${id}`}/></td></tr>)}
    </tbody></table></div>:<None>Nessun prestito di attrezzatura registrato.</None>}
   </Section>
   <Section id="famiglia" title="Genitori, tutori e minori collegati">
    {[...guardians.map(g=>({id:g.tutore_id,label:'Tutore',parentela:g.parentela})),...wards.map(g=>({id:g.minore_id,label:'Minore',parentela:g.parentela}))]
     .sort((a,b)=>{const n=(id:string)=>{const p=family.find(x=>x.id===id);return `${p?.cognome??''} ${p?.nome??''}`;};return n(a.id).localeCompare(n(b.id),'it');}).map((f,i)=>{const related=family.find(x=>x.id===f.id);return <div className="info-row" key={`${f.id}-${i}`}>
      <span>{f.label} · {f.parentela}</span><strong>{related?<Link href={`/gestionale/soci/${f.id}`}>{related.cognome} {related.nome}</Link>:'Persona collegata non trovata'}</strong>
     </div>;})}
    {guardians.length===0&&wards.length===0&&<None>Nessuna relazione familiare registrata.</None>}
   </Section>
  </div>
  <p className="tiny muted">Le sezioni mostrano gli ultimi record disponibili (fino a 50 versamenti, brevetti e certificati; fino a 100 adesioni e iscrizioni). Per consultare l'intero storico utilizza i rispettivi moduli e le esportazioni.</p>
 </>;
}
