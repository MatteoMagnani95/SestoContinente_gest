import {PageHeader,MetricCard,StatusBadge,Alert,ButtonLink} from '@/components/ui/Primitives';
import {DataTable,Pagination} from '@/components/ui/DataTable';
import SearchableSelect from '@/components/ui/SearchableSelect';
import PaymentReview from '@/components/PaymentReview';
import {tutteLePagine} from '@/lib/pagine';
import {balanceTotals,dateFilter,methodLabel} from '@/lib/finance-ui';
import EditForm from '@/components/EditForm';
import {Drawer,ConfirmDialog} from '@/components/ui/Drawer';
import ActionForm from '@/components/ui/ActionForm';
import Link from 'next/link';
import {randomUUID} from 'node:crypto';
import {requireStaffForRender as requireStaff} from '@/lib/security';
import {recordGuidedPayment} from './actions';
import {structuralRpc,readFinanceTotals} from '@/lib/structural-qa';

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
function linkFor(p:{tab:string;stagione:string;stato:string;persona:string;dal:string;al:string;debito:string},page:number){
 const query=new URLSearchParams({tab:p.tab,stagione:p.stagione,stato:p.stato,p:String(page)});
 if(p.persona)query.set('persona',p.persona);if(p.dal)query.set('dal',p.dal);if(p.al)query.set('al',p.al);if(p.debito)query.set('debito',p.debito);
 return `/gestionale/incassi?${query.toString()}`;
}
export default async function Incassi({searchParams}:{searchParams:Promise<{tab?:string;stagione?:string;stato?:string;persona?:string;p?:string;msg?:string;dal?:string;al?:string;debito?:string}>}){
 const {supabase}=await requireStaff();
 const [{data:admin},p,{data:seasons,error:seasonError},{data:allPeople,error:peopleError}]=await Promise.all([
  supabase.rpc('is_admin'),
  searchParams,
  tutteLePagine((da,a)=>supabase.from('stagioni').select('id,nome,attiva').order('dal',{ascending:false}).order('id').range(da,a)),
  tutteLePagine((da,a)=>supabase.from('persone').select('id,nome,cognome').order('cognome').order('nome').order('id').range(da,a))
 ]);
 const dal=dateFilter(p.dal),al=dateFilter(p.al),debt=p.debito&&uuid.test(p.debito)?p.debito:'';
 const selectedSeason=p.stagione?((seasons??[]).find(s=>s.id===p.stagione)?.id??''):((seasons??[]).find(s=>s.attiva)?.id??(seasons??[])[0]?.id??'');
 const tab=p.tab==='corso'?'corso':'quota';
 const status=['non_pagata','parziale','pagata','residuo'].includes(p.stato??'')?p.stato!:'tutte';
 const personFilter=p.persona&&uuid.test(p.persona)?p.persona:'';
 const page=Math.max(1,Math.min(10000,Number.parseInt(p.p??'1',10)||1));
 const perPage=25;
 let recentQuery=supabase.from('pagamenti').select('id,persona_id,quota_id,addebito_corso_id,importo,metodo,data_pagamento,riferimento').order('creato_il',{ascending:false}).limit(15);
 if(personFilter)recentQuery=recentQuery.eq('persona_id',personFilter);
 const recentPromise=Promise.resolve(recentQuery);
 let balances:Balance[]=[];
 let count=0;let totals:ReturnType<typeof balanceTotals>|null=null;
 let errorMessage='';
 if(selectedSeason){
  let query=supabase.from(tab==='quota'?'gest_elenco_saldi_quote':'gest_elenco_saldi_corsi').select('*',{count:'exact'}).eq('stagione_id',selectedSeason);
  if(status==='residuo')query=query.gt('residuo',0);else if(status!=='tutte')query=query.eq('stato',status);
  if(personFilter)query=query.eq('persona_id',personFilter);
  if(debt)query=query.eq('id',debt);if(dal)query=query.gte('scadenza',dal);if(al)query=query.lte('scadenza',al);
  const [{data,error,count:total},aggregate]=await Promise.all([
   query.order('sort_cognome').order('sort_nome').order('id',{ascending:true}).range((page-1)*perPage,page*perPage-1),
   (async()=>{
    const optimized=readFinanceTotals(await structuralRpc(supabase,'sc_perf_incassi_totals',{p_tab:tab,p_season:selectedSeason,p_status:status,p_person:personFilter||null,p_debt:debt||null,p_dal:dal||null,p_al:al||null}));
    if(optimized)return {optimized,data:null,error:null};
    const legacy=await tutteLePagine((da,a)=>{let q=supabase.from(tab==='quota'?'gest_elenco_saldi_quote':'gest_elenco_saldi_corsi').select('id,importo_dovuto,versato,residuo').eq('stagione_id',selectedSeason);if(status==='residuo')q=q.gt('residuo',0);else if(status!=='tutte')q=q.eq('stato',status);if(personFilter)q=q.eq('persona_id',personFilter);if(debt)q=q.eq('id',debt);if(dal)q=q.gte('scadenza',dal);if(al)q=q.lte('scadenza',al);return q.order('id').range(da,a);});
    return {...legacy,optimized:null};
   })()
  ]);
  if(error||dal&&al&&dal>al)errorMessage='Impossibile leggere i saldi o intervallo di scadenza non valido.';
  else {balances=(data??[]) as unknown as Balance[];count=total??0;
   if(aggregate.optimized)totals=aggregate.optimized;
   else if(!aggregate.error&&aggregate.data)try{totals=balanceTotals(aggregate.data as Balance[]);}catch{}
  }
 }
 const peopleIds=[...new Set(balances.map(b=>b.persona_id))];
 const courseIds=[...new Set(balances.map(b=>b.edizione_id).filter((v):v is string=>Boolean(v)))];
 const [{data:people},{data:courses}]=await Promise.all([
  peopleIds.length?supabase.from('persone').select('id,nome,cognome').in('id',peopleIds):Promise.resolve({data:[]}),
  courseIds.length?supabase.from('edizioni_corsi').select('id,nome').in('id',courseIds):Promise.resolve({data:[]}),
 ]);
 const names=new Map(((people??[]) as Person[]).map(x=>[x.id,`${x.cognome} ${x.nome}`]));
 const courseNames=new Map(((courses??[]) as Course[]).map(x=>[x.id,x.nome]));
 const {data:recent,error:recentError}=await recentPromise;
 const {data:historyPeople}=recent?.length?await supabase.from('persone').select('id,nome,cognome').in('id',[...new Set(recent.map(r=>r.persona_id))]):{data:[]};
 const historyNames=new Map(((historyPeople??[]) as Person[]).map(x=>[x.id,`${x.cognome} ${x.nome}`]));
 const filter={tab,stagione:selectedSeason,stato:status,persona:personFilter,dal,al,debito:debt};
 const maxPage=Math.max(1,Math.ceil(count/perPage));
 return <>
  <PageHeader area="finance" icon="wallet" marine eyebrow="Segreteria · Contabilità" title="Incassi e saldi" description="Versamenti associativi e corsi, saldi aggiornati dal database e contabilizzazione automatica." actions={admin===true?<><ButtonLink href="/gestionale/archivio-incassi" variant="secondary" icon="archive">Archivio incassi</ButtonLink><ButtonLink href="/gestionale/moduli/contabilita" variant="secondary">Contabilità</ButtonLink></>:undefined}/>
  <nav className="sc-operation-tabs" aria-label="Tipologia incassi">{([['quota','Quote associative'],['corso','Quote corsi']] as const).map(([key,label])=><Link className={'sc-button '+(tab===key?'sc-button-primary':'sc-button-secondary')} key={key} href={linkFor({...filter,tab:key,debito:key===tab?debt:''},1)} aria-current={tab===key?'page':undefined}>{label}</Link>)}</nav>
  <div className="notice warning">Le registrazioni sono definitive e producono un movimento contabile. Verifica la ricezione del pagamento prima della conferma.</div>
  {typeof p.msg==='string'&&Object.hasOwn(feedback,p.msg)&&<p role="status" className={`notice ${p.msg==='salvato'?'success':'warning'}`}>{feedback[p.msg]}</p>}
  <form className="panel payment-filters" action="/gestionale/incassi" method="get">
   <input type="hidden" name="tab" value={tab}/>{debt&&<input type="hidden" name="debito" value={debt}/>} 
   <label>Stagione<select name="stagione" defaultValue={selectedSeason} required><option value="">Seleziona stagione…</option>{(seasons??[]).map(s=><option key={s.id} value={s.id}>{s.nome}{s.attiva?' (attiva)':''}</option>)}</select></label>
   <label>Stato<select name="stato" defaultValue={status}><option value="tutte">Tutti</option><option value="residuo">Con residuo da incassare</option><option value="non_pagata">Non pagate</option><option value="parziale">Parziali</option><option value="pagata">Pagate</option></select></label>
   <div className="sc-field"><label htmlFor="payment-person">Socio</label><SearchableSelect id="payment-person" name="persona" label="Socio" value={personFilter} options={(allPeople??[]).map(p=>({value:p.id,label:p.cognome+" "+p.nome}))}/></div><label>Scadenza dal<input type="date" name="dal" defaultValue={dal}/></label><label>Scadenza al<input type="date" name="al" defaultValue={al}/></label>
   <button className="button" type="submit">Applica</button><ButtonLink variant="secondary" href="/gestionale/incassi">Azzera filtri</ButtonLink>
   <Link className="button ghost" href="/gestionale/moduli/quote">Gestisci quote</Link>
   <Link className="button ghost" href="/gestionale/moduli/addebiti">Gestisci addebiti corsi</Link>
  </form>
  {seasonError&&<p className="notice error">Impossibile leggere le stagioni.</p>}
  {!selectedSeason?<p className="notice warning">{p.stagione?'La stagione selezionata non è disponibile. Scegline un’altra.':'Crea prima una stagione sportiva per registrare i versamenti.'}</p>:null}
  {errorMessage&&<p className="notice error">{errorMessage}</p>}
  {peopleError&&<Alert tone="warning">Elenco soci non disponibile.</Alert>}
  {totals?<div className="sc-metrics sc-finance-kpis"><MetricCard area="teaching" icon="wallet" label="Totale dovuto" value={euros(totals.due)}/><MetricCard area="finance" icon="wallet" label="Totale incassato" value={euros(totals.paid)}/><MetricCard area="equipment" icon="clock" label="Residuo complessivo" value={euros(totals.residue)}/><MetricCard area="secretariat" icon="check" label="Posizioni saldate" value={totals.settled}/><MetricCard area="event" icon="warning" label="Da saldare" value={totals.open}/></div>:selectedSeason&&<Alert tone="warning">Totali delle posizioni filtrate non disponibili.</Alert>}
  {!errorMessage&&selectedSeason&&<section className="panel">
   <h2>{tab==='quota'?'Quote associative':'Addebiti dei corsi'}</h2>
   <p className="tiny muted">{count} posizioni · Pagina {page} di {maxPage}. I totali comprendono tutte le posizioni corrispondenti ai filtri.</p>
   <DataTable label="Saldi delle quote" mobileCards><thead><tr><th>Socio</th><th>Scadenza / causale</th><th>Dovuto</th><th>Versato</th><th>Residuo</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>
    {balances.map(b=><tr key={b.id}>
     <td data-label="Socio"><Link href={`/gestionale/soci/${b.persona_id}`}>{names.get(b.persona_id)??'Nominativo non disponibile'}</Link></td>
     <td data-label="Scadenza / causale">{fmtDate(b.scadenza)}{tab==='corso'&&<p>{courseNames.get(b.edizione_id??'')??'Corso non disponibile'}</p>}</td>
     <td data-label="Dovuto" className="sc-money">{euros(b.importo_dovuto)}</td><td data-label="Versato" className="sc-money">{euros(b.versato)}</td><td data-label="Residuo" className="sc-money"><strong>{euros(b.residuo)}</strong></td><td data-label="Stato"><StatusBadge tone={b.stato==='pagata'?'success':b.stato==='parziale'?'warning':b.stato==='non_pagata'?'danger':'neutral'}>{b.stato.replaceAll('_',' ')}</StatusBadge></td>
     <td data-label="Azioni"><div className="sc-row-actions">{Number(b.residuo)>0?
      <Drawer title={'Registra versamento · '+(names.get(b.persona_id)??'Socio')} trigger="Registra versamento" primary><p>Causale: {tab==='quota'?'Quota associativa':courseNames.get(b.edizione_id??'')??'Quota corso'}</p><p>Dovuto: <strong>{euros(b.importo_dovuto)}</strong> · Versato: {euros(b.versato)} · Residuo: <strong>{euros(b.residuo)}</strong></p><EditForm action={recordGuidedPayment} className="payment-form">
       <input type="hidden" name="tab" value={tab}/><input type="hidden" name="debito_id" value={b.id}/>
       <input type="hidden" name="persona_id" value={b.persona_id}/><input type="hidden" name="richiesta_id" value={randomUUID()}/>
       <input type="hidden" name="stagione" value={selectedSeason}/><input type="hidden" name="filtro_persona" value={personFilter}/>
       <input type="hidden" name="stato" value={status}/><input type="hidden" name="dal" value={dal}/><input type="hidden" name="al" value={al}/><input type="hidden" name="debito" value={debt}/>
       <label>Importo (€)<input name="importo" type="number" required min="0.01" step="0.01" max={Number(b.residuo).toFixed(2)} defaultValue={Number(b.residuo).toFixed(2)}/></label>
       <label>Data di versamento<input name="data_pagamento" type="date" required defaultValue={todayInRome()}/></label>
       <label>Canale di pagamento<select name="metodo" required defaultValue=""><option value="">Seleziona modalità</option><option value="bonifico">Bonifico Bancario</option><option value="contanti">Cassa</option><option value="pos">POS</option></select></label>
       <label>Riferimento<input name="riferimento" type="text" maxLength={150} placeholder="Facoltativo"/></label>
       <label>Note<input name="note" type="text" maxLength={1000} placeholder="Facoltative"/></label>
       <PaymentReview residuo={Number(b.residuo)}/><label className="payment-confirm"><input type="checkbox" name="conferma" required/> Confermo che il versamento è stato realmente ricevuto</label>
       <button className="button" type="submit">Registra definitivamente</button>
      </EditForm></Drawer>
      :<strong className="payment-paid">Saldo completo</strong>}
     <Link href={`/gestionale/moduli/${(tab==='quota'?'quote':'addebiti')}?edit=${b.id}`}>Gestisci quota</Link><Link href={'/gestionale/incassi/posizione/'+b.id+'?tab='+tab}>Visualizza versamenti</Link></div></td></tr>)}
    {!balances.length&&<tr><td colSpan={7}>Nessun addebito trovato per i filtri selezionati.</td></tr>}
   </tbody></DataTable><Pagination page={page} size={perPage} count={count} href={p=>linkFor(filter,p)} label="posizioni"/>
  </section>}
  <section className="panel sc-finance-recent"><h2>Ultimi 15 versamenti {personFilter?'del socio':'registrati'}</h2>
   {admin===true&&<Link href={'/gestionale/archivio-incassi'+(personFilter?'?persona='+personFilter:'')}>Storico completo dei versamenti e rettifiche</Link>}<p className="tiny muted">È un elenco delle registrazioni più recenti, non un rendiconto completo. Per il rendiconto usa l'area amministrativa.</p>
   {recentError?<p className="notice error">Impossibile leggere gli ultimi incassi.</p>:<div className="table-panel"><table><thead><tr><th>Data</th><th>Socio</th><th>Tipo</th><th>Importo</th><th>Metodo</th><th>Riferimento</th>{admin===true&&<th>Azioni</th>}</tr></thead><tbody>
    {(recent??[]).map(r=><tr key={r.id}><td>{fmtDate(r.data_pagamento)}</td><td>{historyNames.get(r.persona_id)??'Nominativo non disponibile'}</td><td>{r.quota_id?'Quota':'Corso'}</td><td className="sc-money">{euros(r.importo)}</td><td>{methodLabel(r.metodo)}</td><td>{r.riferimento??'—'}</td>{admin===true&&<td><Link href={`/gestionale/incassi/${r.id}`}>Rettifica</Link></td>}</tr>)}
    {!recent?.length&&<tr><td colSpan={6}>Nessun pagamento registrato.</td></tr>}
   </tbody></table></div>}
  </section>
 </>;
}
