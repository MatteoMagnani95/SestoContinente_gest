import {DataTable,FilterBar,SearchBar,Pagination} from '@/components/ui/DataTable';
import {PageHeader,StatusBadge,Alert} from '@/components/ui/Primitives';
import {pageNumber,listHref,singleSearchParams} from '@/lib/module-ui';
import {dateFilter,uuidReference,searchTerms,requestStates,pendingRequestStates,statusTone,exactCount} from '@/lib/secretariat';
import {asRomeISO} from '@/lib/course-tools';
import {shiftDay} from '@/lib/calendar-tools';
import {isTestApplication} from '@/lib/application-config';
import Link from 'next/link';
import {requireStaff,formatDate,statoLabel,type Stato,queryMessage} from '@/lib/security';
export default async function Requests({searchParams}:{searchParams:Promise<{filtro?:string;msg?:string;q?:string;p?:string;dal?:string;al?:string;ordine?:string}>}){
 const params=singleSearchParams(await searchParams);const {msg}=params,q=(params.q??'').slice(0,80),page=pageNumber(params.p),size=30,dal=dateFilter(params.dal),al=dateFilter(params.al);
 const filtro=params.filtro==='da_gestire'||requestStates.some(s=>s===params.filtro)?params.filtro:'';
 const ordine=['recenti','meno_recenti','nome_desc'].includes(params.ordine??'')?params.ordine:'nome';
 const {supabase}=await requireStaff();
 const fields='id,nome,cognome,stato,utente_id,inviata_il,data_nascita,versione_statuto,versione_privacy';
 function base(head=false){
  let query=supabase.from('richieste').select(fields,{count:'exact',head});
  const reference=uuidReference(q);
  if(reference)query=query.gte('id',reference.from).lte('id',reference.to);
  else for(const term of searchTerms(q))query=query.or('nome.ilike.%'+term+'%,cognome.ilike.%'+term+'%');
  if(dal)query=query.gte('inviata_il',asRomeISO(dal+'T00:00'));
  if(al)query=query.lt('inviata_il',asRomeISO(shiftDay(al,1)+'T00:00'));
  return query;
 }
 let query=base();
 if(filtro==='da_gestire')query=query.in('stato',[...pendingRequestStates]);
 else if(filtro)query=query.eq('stato',filtro);
 if(ordine==='recenti'||ordine==='meno_recenti')query=query.order('inviata_il',{ascending:ordine==='meno_recenti',nullsFirst:false});
 else if(ordine==='nome_desc')query=query.order('cognome',{ascending:false}).order('nome',{ascending:false});
 else query=query.order('cognome').order('nome');
 const [{data,error,count},...totals]=await Promise.all([query.order('id').range((page-1)*size,page*size-1),base(true),base(true).in('stato',[...pendingRequestStates]),...requestStates.map(s=>base(true).eq('stato',s))]);
 const messages:Record<string,string>={eliminato:'Domanda rimossa.',elimina_collegati:'Domanda protetta o con dati collegati.',elimina_conferma:'Conferma la rimozione.'};
 const filters=[{key:'',label:'Tutte'},{key:'da_gestire',label:'Da gestire'},...requestStates.map(s=>({key:s,label:statoLabel[s]}))];
 const href=(p:number,f=filtro)=>listHref({q,filtro:f,dal,al,ordine,p:String(p)});
 return <><PageHeader eyebrow="Segreteria" title="Domande di adesione" description="Esamina le pratiche ricevute, le integrazioni e gli esiti."/>
 {msg&&<Alert tone={msg==='eliminato'?'success':'info'} announce>{Object.hasOwn(messages,msg)?messages[msg]:queryMessage(msg)}</Alert>}
 <nav className="sc-secretariat-tabs" aria-label="Stato della domanda">{filters.map((item,i)=><Link key={item.key} aria-current={filtro===item.key?'page':undefined} href={href(1,item.key)}>{item.label} ({exactCount(totals[i])})</Link>)}</nav>
 <FilterBar><SearchBar query={q} placeholder="Cerca nominativo o riferimento" resetHref="/gestionale/richieste">{filtro&&<input type="hidden" name="filtro" value={filtro}/>}<label>Invio dal<input type="date" name="dal" defaultValue={dal}/></label><label>Invio al<input type="date" name="al" defaultValue={al}/></label><label>Ordina per<select name="ordine" defaultValue={ordine}><option value="nome">Cognome A–Z</option><option value="nome_desc">Cognome Z–A</option><option value="recenti">Invio più recente</option><option value="meno_recenti">Invio meno recente</option></select></label></SearchBar></FilterBar>
 {error?<Alert tone="danger" announce>Impossibile leggere le domande. Riprova o contatta l’amministratore.</Alert>:<DataTable label="Domande di adesione" mobileCards><thead role="rowgroup"><tr role="row">{['Richiedente','Invio','Stato','Azioni'].map(l=><th key={l} role="columnheader" scope="col">{l}</th>)}</tr></thead><tbody role="rowgroup">{data?.map(r=><tr key={r.id} role="row"><td role="cell" data-label="Richiedente"><Link href={'/gestionale/richieste/'+r.id}><strong>{r.cognome} {r.nome}</strong></Link><p className="tiny muted">#{r.id.slice(0,8).toUpperCase()}{isTestApplication(r)?' · COLLAUDO':''}</p></td><td role="cell" data-label="Invio">{formatDate(r.inviata_il)}</td><td role="cell" data-label="Stato"><StatusBadge tone={statusTone(r.stato)}>{statoLabel[r.stato as Stato]}</StatusBadge></td><td role="cell" data-label="Azioni"><Link className="sc-button sc-button-secondary" href={'/gestionale/richieste/'+r.id}>{r.stato==='inviata'?'Esamina domanda':r.stato==='in_verifica'?'Continua verifica':'Apri pratica'}</Link></td></tr>)}{!data?.length&&<tr><td colSpan={4} className="empty-cell">Nessuna domanda con questi filtri.</td></tr>}</tbody></DataTable>}
 <Pagination page={page} size={size} count={error?null:count} href={p=>href(p)} label="domande"/>
 </>;
}
