import EditForm from '@/components/EditForm';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import Link from 'next/link';
import {randomUUID} from 'node:crypto';
import {requireStaff} from '@/lib/security';
import {recordGuidedPayment} from './actions';

type Balance={id:string;persona_id:string;stagione_id:string;edizione_id?:string|null;importo_dovuto:string|number;versato:string|number;residuo:string|number;stato:string;scadenza:string|null};
type Person={id:string;nome:string;cognome:string};
type Course={id:string;nome:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const euros=(amount:string|number)=>Number(amount).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
const fmtDate=(date:string|null)=>date?date.split('-').reverse().join('/'):'—';
const feedback:Record<string,string>={rettificato:'Registrazione errata rimossa; saldi aggiornati e storico conservato.',eliminato:'Quota rimossa.',elimina_collegati:'Quota non rimovibile: contiene dati collegati o versamenti.',elimina_conferma:'Conferma la rimozione.',
 salvato:'Versamento registrato e movimento economico contabilizzato. Il saldo è stato aggiornato.',
 dati:'Controlla importo, data, metodo e dati del versamento.',
 eccede:'L’importo supera il residuo dovuto. Aggiorna la pagina e controlla il saldo.',
 duplicato:'Questa richiesta è già stata utilizzata con dati diversi oppure il versamento esiste già.',
 permessi:'Non hai i permessi per registrare un versamento.',
 database:'Esito non confermato. Controlla gli ultimi versamenti prima di riprovare, per evitare doppie registrazioni.',
};
function todayInRome(){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 return `${get('year')}-${get('month')}-${get('day')}`;
}
function linkFor(p:{tab:string;stagione:string;stato:string;persona:string},page:number){
 const query=new URLSearchParams({tab:p.tab,stagione:p.stagione,stato:p.stato,p:String(page)});
 if(p.persona)query.set('persona',p.persona);
 return `/gestionale/incassi?${query.toString()}`;
}
export default async function Incassi({searchParams}:{searchParams:Promise<{tab?:string;stagione?:string;stato?:string;persona?:string;p?:string;msg?:string}>}){
 const {supabase}=await requireStaff();
 const {data:admin}=await supabase.rpc('is_admin');
 const p=await searchParams;
 const {data:seasons,error:seasonError}=await supabase.from('stagioni').select('id,nome,attiva').order('dal',{ascending:false});
 const selectedSeason=(seasons??[]).find(s=>s.id===p.stagione)?.id??(seasons??[]).find(s=>s.attiva)?.id??(seasons??[])[0]?.id??'';
 const tab=p.tab==='corso'?'corso':'quota';
 const status=['non_pagata','parziale','pagata'].includes(p.stato??'')?p.stato!:'tutte';
 const personFilter=p.persona&&uuid.test(p.persona)?p.persona:'';
 const page=Math.max(1,Math.min(10000,Number.parseInt(p.p??'1',10)||1));
 const perPage=25;
 let balances:Balance[]=[];
 let count=0;
 let errorMessage='';
 if(selectedSeason){
  let query=supabase.from(tab==='quota'?'gest_elenco_saldi_quote':'gest_elenco_saldi_corsi').select('*',{count:'exact'}).eq('stagione_id',selectedSeason);
  if(status!=='tutte')query=query.eq('stato',status);
  if(personFilter)query=query.eq('persona_id',personFilter);
  const {data,error,count:total}=await query.order('sort_cognome').order('sort_nome').order('id',{ascending:true}).range((page-1)*perPage,page*perPage-1);
  if(error)errorMessage='Impossibile leggere i saldi. Verifica le migrazioni 0002 e 0006 e i permessi sul database.';
  else {balances=(data??[]) as unknown as Balance[];count=total??0;}
 }
 const peopleIds=[...new Set(balances.map(b=>b.persona_id))];
 const courseIds=[...new Set(balances.map(b=>b.edizione_id).filter((v):v is string=>Boolean(v)))];
 const [{data:people},{data:courses}]=await Promise.all([
  peopleIds.length?supabase.from('persone').select('id,nome,cognome').in('id',peopleIds):Promise.resolve({data:[]}),
  courseIds.length?supabase.from('edizioni_corsi').select('id,nome').in('id',courseIds):Promise.resolve({data:[]}),
 ]);
 const names=new Map(((people??[]) as Person[]).map(x=>[x.id,`${x.cognome} ${x.nome}`]));
 const courseNames=new Map(((courses??[]) as Course[]).map(x=>[x.id,x.nome]));
 let recentQuery=supabase.from('pagamenti').select('id,persona_id,quota_id,addebito_corso_id,importo,metodo,data_pagamento,riferimento').order('creato_il',{ascending:false}).limit(15);
 if(personFilter)recentQuery=recentQuery.eq('persona_id',personFilter);
 const {data:recent,error:recentError}=await recentQuery;
 const {data:historyPeople}=recent?.length?await supabase.from('persone').select('id,nome,cognome').in('id',[...new Set(recent.map(r=>r.persona_id))]):{data:[]};
 const historyNames=new Map(((historyPeople??[]) as Person[]).map(x=>[x.id,`${x.cognome} ${x.nome}`]));
 const filter={tab,stagione:selectedSeason,stato:status,persona:personFilter};
 const maxPage=Math.max(1,Math.ceil(count/perPage));
 return <>
  <div className="page-intro"><p className="eyebrow">Segreteria · Contabilità</p><h1>Incassi e saldi</h1>
   <p>Versamenti associativi e corsi, saldi aggiornati dal database e contabilizzazione automatica.</p></div>
  <div className="notice warning">Le registrazioni sono definitive e producono un movimento contabile. Usa importi reali soltanto dopo il collaudo su un progetto Supabase separato.</div>
  {p.msg&&feedback[p.msg]&&<p role="status" className={`notice ${p.msg==='salvato'?'success':'warning'}`}>{feedback[p.msg]}</p>}
  <form className="panel payment-filters" action="/gestionale/incassi" method="get">
   <label>Tipologia<select name="tab" defaultValue={tab}><option value="quota">Quote associative</option><option value="corso">Quote corsi</option></select></label>
   <label>Stagione<select name="stagione" defaultValue={selectedSeason}>{(seasons??[]).map(s=><option key={s.id} value={s.id}>{s.nome}{s.attiva?' (attiva)':''}</option>)}</select></label>
   <label>Stato<select name="stato" defaultValue={status}><option value="tutte">Tutti</option><option value="non_pagata">Non pagate</option><option value="parziale">Parziali</option><option value="pagata">Pagate</option></select></label>
   {personFilter&&<input type="hidden" name="persona" value={personFilter}/>}
   <button className="button" type="submit">Applica</button>
   <Link className="button ghost" href="/gestionale/moduli/quote">Gestisci quote</Link>
   <Link className="button ghost" href="/gestionale/moduli/addebiti">Gestisci addebiti corsi</Link>
  </form>
  {seasonError&&<p className="notice error">Impossibile leggere le stagioni.</p>}
  {!selectedSeason?<p className="notice warning">Crea prima una stagione sportiva per registrare i versamenti.</p>:null}
  {errorMessage&&<p className="notice error">{errorMessage}</p>}
  {!errorMessage&&selectedSeason&&<section className="panel">
   <h2>{tab==='quota'?'Quote associative':'Addebiti dei corsi'}</h2>
   <p className="tiny muted">{count} posizioni · Pagina {page} di {maxPage}. I saldi sono aggregati nel database, non calcolati da un campione di versamenti.</p>
   <div className="table-panel payment-table"><table><thead><tr><th>Socio</th><th>{tab==='quota'?'Scadenza':'Corso'}</th><th>Dovuto</th><th>Versato</th><th>Residuo</th><th>Azioni</th></tr></thead><tbody>
    {balances.map(b=><tr key={b.id}>
     <td><Link href={`/gestionale/soci/${b.persona_id}`}>{names.get(b.persona_id)??b.persona_id.slice(0,8)}</Link><p className="tiny muted">{b.stato.replaceAll('_',' ')}</p></td>
     <td>{tab==='quota'?fmtDate(b.scadenza):courseNames.get(b.edizione_id??'')??'—'}</td>
     <td>{euros(b.importo_dovuto)}</td><td>{euros(b.versato)}</td><td><strong>{euros(b.residuo)}</strong></td>
     <td><div className="sc-row-actions">{Number(b.residuo)>0?
      <Drawer title={'Registra versamento · '+(names.get(b.persona_id)??'Socio')} trigger="Registra versamento" primary><p>Dovuto: <strong>{euros(b.importo_dovuto)}</strong> · Versato: {euros(b.versato)} · Residuo: <strong>{euros(b.residuo)}</strong></p><EditForm action={recordGuidedPayment} className="payment-form">
       <input type="hidden" name="tab" value={tab}/><input type="hidden" name="debito_id" value={b.id}/>
       <input type="hidden" name="persona_id" value={b.persona_id}/><input type="hidden" name="richiesta_id" value={randomUUID()}/>
       <input type="hidden" name="stagione" value={selectedSeason}/><input type="hidden" name="filtro_persona" value={personFilter}/>
       <input type="hidden" name="stato" value={status}/>
       <label>Importo (€)<input name="importo" type="number" required min="0.01" step="0.01" max={Number(b.residuo).toFixed(2)} defaultValue={Number(b.residuo).toFixed(2)}/></label>
       <label>Data di versamento<input name="data_pagamento" type="date" required defaultValue={todayInRome()}/></label>
       <label>Canale di pagamento<select name="metodo" required defaultValue=""><option value="">Seleziona modalità</option><option value="bonifico">Bonifico Bancario</option><option value="contanti">Cassa</option><option value="pos">POS</option></select></label>
       <label>Riferimento<input name="riferimento" type="text" maxLength={150} placeholder="Facoltativo"/></label>
       <label>Note<input name="note" type="text" maxLength={1000} placeholder="Facoltative"/></label>
       <label className="payment-confirm"><input type="checkbox" name="conferma" required/> Confermo che il versamento è stato realmente ricevuto</label>
       <button className="button" type="submit">Registra definitivamente</button>
      </EditForm></Drawer>
      :<strong className="payment-paid">Saldo completo</strong>}
     <Link href={`/gestionale/moduli/${(tab==='quota'?'quote':'addebiti')}?edit=${b.id}`}>Gestisci quota</Link></div></td></tr>)}
    {!balances.length&&<tr><td colSpan={6}>Nessun addebito trovato per i filtri selezionati.</td></tr>}
   </tbody></table></div>
   <div className="pager"><span>{count} posizioni</span><div className="buttons">
    {page>1&&<Link className="button ghost" href={linkFor(filter,page-1)}>Precedente</Link>}
    {page<maxPage&&<Link className="button ghost" href={linkFor(filter,page+1)}>Successiva</Link>}
   </div></div>
  </section>}
  <section className="panel"><h2>Ultimi 15 versamenti {personFilter?'del socio':'registrati'}</h2>
   {admin===true&&<Link href="/gestionale/archivio-incassi">Tutti i versamenti e rettifiche</Link>}<p className="tiny muted">È un elenco delle registrazioni più recenti, non un rendiconto completo. Per il rendiconto usa l'area amministrativa.</p>
   {recentError?<p className="notice error">Impossibile leggere gli ultimi incassi.</p>:<div className="table-panel"><table><thead><tr><th>Data</th><th>Socio</th><th>Tipo</th><th>Importo</th><th>Metodo</th><th>Riferimento</th>{admin===true&&<th>Azioni</th>}</tr></thead><tbody>
    {[...(recent??[])].sort((a,b)=>(historyNames.get(a.persona_id)??'').localeCompare(historyNames.get(b.persona_id)??'','it')).map(r=><tr key={r.id}><td>{fmtDate(r.data_pagamento)}</td><td>{historyNames.get(r.persona_id)??r.persona_id.slice(0,8)}</td><td>{r.quota_id?'Quota':'Corso'}</td><td>{euros(r.importo)}</td><td>{r.metodo}</td><td>{r.riferimento??'—'}</td>{admin===true&&<td><Link href={`/gestionale/incassi/${r.id}`}>Modifica / rettifica</Link></td>}</tr>)}
    {!recent?.length&&<tr><td colSpan={6}>Nessun pagamento registrato.</td></tr>}
   </tbody></table></div>}
  </section>
 </>;
}
