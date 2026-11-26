import {DataTable,FilterBar,SearchBar,Pagination} from '@/components/ui/DataTable';
import {cleanSearch,pageNumber,listHref} from '@/lib/module-ui';
import {isTestApplication} from '@/lib/application-config';
import Link from 'next/link';
import {requireStaff,formatDate,statoLabel,type Stato,queryMessage} from '@/lib/security';
export default async function Requests({searchParams}:{searchParams:Promise<{filtro?:string,msg?:string,q?:string,p?:string}>}){
  const {filtro,msg,q='',p}=await searchParams;const page=pageNumber(p),size=30;
  const {supabase}=await requireStaff();
  const valid=['bozza','inviata','in_verifica','integrazione_richiesta','approvata','respinta'];
  let query=supabase.from('richieste').select('id,nome,cognome,stato,utente_id,inviata_il,data_nascita,versione_statuto,versione_privacy',{count:'exact'});
  if(filtro && valid.includes(filtro)) query=query.eq('stato',filtro);
  const search=cleanSearch(q);if(search)query=query.or('nome.ilike.%'+search+'%,cognome.ilike.%'+search+'%');
  const {data,error,count}=await query.order('cognome').order('nome').order('id').range((page-1)*size,page*size-1);
  return <><div className="page-intro"><p className="eyebrow">Segreteria</p><h1>Domande di adesione</h1><p>Controlla la documentazione e gestisci l'esito delle domande ricevute.</p></div>
    {msg && <p role="status" className="notice error">{({eliminato:'Domanda rimossa.',elimina_collegati:'Domanda protetta o con dati collegati.',elimina_conferma:'Conferma la rimozione.'} as Record<string,string>)[msg]??queryMessage(msg)}</p>}
    <div className="filterbar"><Link href={listHref({q})} className={!filtro?'active':''}>Tutte</Link>{valid.filter(x=>x!=='bozza').map(k=><Link key={k} href={listHref({q,filtro:k})} className={filtro===k?'active':''}>{statoLabel[k as Stato]}</Link>)}</div>
    <FilterBar><SearchBar query={q} placeholder="Cerca nome o cognome" resetHref="/gestionale/richieste">{filtro&&<input type="hidden" name="filtro" value={filtro}/>}</SearchBar></FilterBar>
    {error?<div className="notice error">Impossibile leggere le domande. Verifica la configurazione.</div>:<DataTable label="Domande di adesione"><thead><tr><th>Richiedente</th><th>Riferimento</th><th>Invio</th><th>Stato</th><th></th></tr></thead><tbody>
      {data?.map(r=><tr key={r.id}><td><strong>{r.cognome} {r.nome}</strong>{isTestApplication(r)&&<small className="muted"> · COLLAUDO</small>}</td><td>#{r.id.slice(0,8).toUpperCase()}</td><td>{formatDate(r.inviata_il)}</td><td><span className={`status status-${r.stato}`}>{statoLabel[r.stato as Stato]}</span></td><td><Link href={`/gestionale/richieste/${r.id}`}>Apri →</Link></td></tr>)}
      {data?.length===0 && <tr><td colSpan={5} className="empty-cell">Nessuna domanda con questo filtro.</td></tr>}
    </tbody></DataTable>}
    <Pagination page={page} size={size} count={error?null:count} href={page=>listHref({q,filtro,p:String(page)})}/>
  </>;
}
