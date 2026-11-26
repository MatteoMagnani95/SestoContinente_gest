import Dichiarazioni from '@/components/Dichiarazioni';
import {isTestApplication} from '@/lib/application-config';
import Link from 'next/link';
import { requireUser, formatDate, statoLabel, type Stato, queryMessage } from '@/lib/security';
export default async function RequestStatus({searchParams}:{searchParams:Promise<{msg?:string}>}) {
  const {msg}=await searchParams;
  const {supabase,user}=await requireUser();
  const {data:r,error}=await supabase.from('richieste').select('*').eq('utente_id',user.id).maybeSingle();
  if (error) return <div className="container narrow"><h1>Impossibile leggere la richiesta</h1><p>Verifica la configurazione del database.</p></div>;
  if (!r) return <div className="container narrow"><p className="eyebrow">Area richiedente</p><h1>Nessuna domanda presentata</h1><p>Puoi compilare la domanda o salvare una bozza.</p><Link className="button" href="/richiesta/nuova">Compila domanda</Link></div>;
  return <div className="container narrow"><div className="page-intro"><p className="eyebrow">Area richiedente</p><h1>La tua domanda</h1><p>Qui trovi lo stato della tua richiesta di adesione.</p></div>
    {isTestApplication(r)&&<div className="notice warning">COLLAUDO — domanda simulata, non valida come adesione reale.</div>}
    {msg && <div className="notice success" role="status">{queryMessage(msg)}</div>}
    <div className="panel status-panel"><div className="detail-top"><div><div className="muted tiny">Riferimento domanda</div><h2>#{r.id.slice(0,8).toUpperCase()}</h2></div><span className={`status status-${r.stato}`}>{statoLabel[r.stato as Stato]}</span></div>
      <div className="detail-grid"><div><span className="k">Richiedente</span><strong>{r.nome} {r.cognome}</strong></div><div><span className="k">Data invio</span><strong>{formatDate(r.inviata_il)}</strong></div><div><span className="k">Ultimo aggiornamento</span><strong>{formatDate(r.modificato_il)}</strong></div><div><span className="k">Email account</span><strong>{user.email}</strong></div></div>
      <Dichiarazioni dati={r}/>
      {r.nota_pubblica && <div className="notice">{r.nota_pubblica}</div>}
      {r.stato==='bozza' && <div className="actions"><Link className="button" href="/richiesta/nuova">Continua compilazione</Link></div>}
      {r.stato==='integrazione_richiesta' && <div className="actions"><Link className="button" href="/richiesta/nuova">Correggi e reinvia</Link></div>}
      {r.stato==='approvata' && <div className="actions"><Link className="button" href="/area-personale">Vai alla tua area personale</Link></div>}
      {['inviata','in_verifica'].includes(r.stato) && <p className="muted">La segreteria sta gestendo la tua pratica. Non sono richieste altre azioni al momento.</p>}
    </div><p className="muted tiny">L'approvazione non conferma l'avvenuto pagamento della quota o il tesseramento.</p>
  </div>;
}
