import RemoveRecord from '@/components/RemoveRecord';
import Link from 'next/link';
import {requireStaff,formatDate,statoLabel,type Stato,queryMessage} from '@/lib/security';
export default async function Requests({searchParams}:{searchParams:Promise<{filtro?:string,msg?:string}>}){
  const {filtro,msg}=await searchParams;
  const {supabase}=await requireStaff();
  const valid=['bozza','inviata','in_verifica','integrazione_richiesta','approvata','respinta'];
  let query=supabase.from('richieste').select('id,nome,cognome,stato,utente_id,inviata_il,data_nascita').order('cognome').order('nome').order('id').limit(100);
  if(filtro && valid.includes(filtro)) query=query.eq('stato',filtro);
  const {data,error}=await query;
  return <><div className="page-intro"><p className="eyebrow">Segreteria</p><h1>Domande di adesione</h1><p>Controlla la documentazione e gestisci l'esito delle domande ricevute.</p></div>
    {msg && <p role="status" className="notice error">{({eliminato:'Domanda rimossa.',elimina_collegati:'Domanda protetta o con dati collegati.',elimina_conferma:'Conferma la rimozione.'} as Record<string,string>)[msg]??queryMessage(msg)}</p>}
    <div className="filterbar"><Link href="/gestionale/richieste" className={!filtro?'active':''}>Tutte</Link>{valid.filter(x=>x!=='bozza').map(k=><Link key={k} href={`/gestionale/richieste?filtro=${k}`} className={filtro===k?'active':''}>{statoLabel[k as Stato]}</Link>)}</div>
    {error?<div className="notice error">Impossibile leggere le domande. Verifica la configurazione.</div>:<div className="panel table-panel"><table><thead><tr><th>Richiedente</th><th>Riferimento</th><th>Invio</th><th>Stato</th><th></th></tr></thead><tbody>
      {data?.map(r=><tr key={r.id}><td><strong>{r.cognome} {r.nome}</strong></td><td>#{r.id.slice(0,8).toUpperCase()}</td><td>{formatDate(r.inviata_il)}</td><td><span className={`status status-${r.stato}`}>{statoLabel[r.stato as Stato]}</span></td><td><Link href={`/gestionale/richieste/${r.id}`}>Apri →</Link><RemoveRecord moduleKey="richieste" id={r.id} back="richieste"/></td></tr>)}
      {data?.length===0 && <tr><td colSpan={5} className="empty-cell">Nessuna domanda con questo filtro.</td></tr>}
    </tbody></table></div>}
    <p className="muted tiny">Sono visualizzate al massimo 100 domande in ordine alfabetico. Nelle prossime versioni saranno disponibili paginazione e ricerca.</p>
  </>;
}
