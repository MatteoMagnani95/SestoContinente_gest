import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireStaff,formatDate,statoLabel,type Stato,queryMessage} from '@/lib/security';
import {takeApplicationAction,decideApplicationAction} from '@/app/actions';
function Row({label,value}:{label:string,value:React.ReactNode}){
  return <div className="info-row"><span className="k">{label}</span><strong>{value || '—'}</strong></div>;
}
export default async function Review({params,searchParams}:{params:Promise<{id:string}>,searchParams:Promise<{msg?:string}>}){
  const {id}=await params;
  const {msg}=await searchParams;
  const {supabase}=await requireStaff();
  const {data:r}=await supabase.from('richieste').select('*').eq('id',id).maybeSingle();
  if(!r) notFound();
  const {data:events}=await supabase.from('eventi_pratica').select('evento,creato_il,nota_interna').eq('richiesta_id',r.id).order('creato_il',{ascending:false});
  return <><Link href="/gestionale/richieste" className="back-link">← Torna alle domande</Link>
    <div className="page-intro"><p className="eyebrow">Dettaglio della pratica #{r.id.slice(0,8).toUpperCase()}</p><h1>{r.nome} {r.cognome}</h1><span className={`status status-${r.stato}`}>{statoLabel[r.stato as Stato]}</span></div>
    {msg && <p role="status" className={`notice ${['presa','approvata','integrazione','respinta'].includes(msg)?'success':'error'}`}>{queryMessage(msg)}</p>}
    <div className="review-grid"><section className="panel"><h2>Dati forniti</h2>
      <Row label="Nome" value={`${r.nome} ${r.cognome}`}/><Row label="Data di nascita" value={formatDate(r.data_nascita)}/>
      <Row label="Comune / luogo di nascita" value={r.luogo_nascita}/><Row label="Provincia e Stato di nascita" value={[r.provincia_nascita,r.stato_nascita].filter(Boolean).join(" · ")}/><Row label="Sesso per CF" value={r.sesso_cf}/><Row label="Codice catastale" value={r.codice_catastale_nascita}/><Row label="Codice fiscale" value={r.codice_fiscale??'Non indicato'}/>
      <Row label="Residenza" value={`${r.indirizzo}, ${r.cap} ${r.comune}`}/><Row label="Telefono" value={r.telefono}/>
      <Row label="Tutore" value={r.nome_tutore?`${r.nome_tutore} ${r.cognome_tutore} (${r.parentela_tutore})`:'Non previsto'}/>
      <Row label="Presa visione" value={r.presa_visione?'Registrata (simulazione)':'Non registrata'}/>
      <Row label="Data invio" value={formatDate(r.inviata_il)}/>
      {r.nota_pubblica && <div className="notice">Comunicazione al richiedente: {r.nota_pubblica}</div>}
      {r.stato==='inviata' && <form action={takeApplicationAction} className="actions"><input type="hidden" name="id" value={id}/><button type="submit" className="button">Prendi in carico</button></form>}
      {r.stato==='in_verifica' && <>
        <div className="notice warning"><strong>Prima di decidere:</strong> verifica possibili duplicati, identità e poteri del tutore, competenza statutaria, completezza della documentazione e idoneità della stagione. Il controllo automatico dei duplicati viene ripetuto dal database prima dell'approvazione.</div>
        <h3>Decisione della segreteria</h3>
        <form action={decideApplicationAction} className="stack"><input type="hidden" name="id" value={id}/>
          <label>Messaggio per eventuale integrazione<textarea name="messaggio" rows={3} placeholder="Indica le informazioni da correggere (minimo 10 caratteri)"/></label>
          <label>Motivazione interna (obbligatoria per il rifiuto)<textarea name="motivo_interno" rows={3} placeholder="Visibile soltanto alla segreteria"/></label>
          <label className="check-label"><input name="verifiche_confermate" type="checkbox"/><span>Confermo di aver effettuato le verifiche previste prima dell’approvazione, incluse identità, duplicati e competenza a deliberare.</span></label>
          <div className="form-actions wrap"><button className="button" name="action" value="approvata" type="submit">Approva</button><button className="button ghost" name="action" value="integrazione" type="submit">Chiedi integrazione</button><button className="button danger" name="action" value="respinta" type="submit">Respingi</button></div>
        </form>
      </>}
    </section><aside className="panel"><h2>Storico delle operazioni</h2>
      {events?.map((e,i)=><div className="timeline-item" key={i}><strong>{e.evento.replaceAll('_',' ')}</strong><small>{formatDate(e.creato_il)}</small>{e.nota_interna && <p className="muted">Nota interna: {e.nota_interna}</p>}</div>)}
      {!events?.length && <p className="muted">Nessuna operazione registrata.</p>}
      <p className="muted tiny">Le note interne non sono leggibili dal richiedente.</p>
    </aside></div>
  </>;
}
