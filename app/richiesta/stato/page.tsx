import {Alert,StatusBadge,ButtonLink} from '@/components/ui/Primitives';
import Dichiarazioni from '@/components/Dichiarazioni';
import {isTestApplication} from '@/lib/application-config';
import Link from 'next/link';
import { requireUser, formatDate, statoLabel, type Stato, queryMessage } from '@/lib/security';
export default async function RequestStatus({searchParams}:{searchParams:Promise<{msg?:string}>}) {
  const {msg}=await searchParams;
  const {supabase,user}=await requireUser();
  const {data:r,error}=await supabase.from('richieste').select('*').eq('utente_id',user.id).maybeSingle();
  if (error) return <div className="container narrow"><h1>Impossibile leggere la richiesta</h1><p>Riprova o contatta la segreteria.</p></div>;
  if (!r) return <div className="container narrow"><p className="eyebrow">Area richiedente</p><h1>Nessuna domanda presentata</h1><p>Puoi compilare la domanda o salvare una bozza.</p><Link className="button" href="/richiesta/nuova">Compila domanda</Link></div>;
  return <div className="container narrow"><div className="page-intro"><p className="eyebrow">Area richiedente</p><h1>La tua domanda</h1><p>Qui trovi lo stato della tua richiesta di adesione.</p></div>
    {isTestApplication(r)&&<div className="notice warning">COLLAUDO — domanda simulata, non valida come adesione reale.</div>}
    {msg && <Alert tone={(msg==='inviata'&&r.inviata_il)||(msg==='salvata'&&r.stato==='bozza')?'success':'info'} announce>{msg==='inviata'&&!r.inviata_il?'Invio non confermato. Controlla lo stato della domanda.':msg==='salvata'&&r.stato!=='bozza'?'Consulta lo stato attuale della domanda.':queryMessage(msg)}</Alert>}
    <div className="panel status-panel"><div className="detail-top"><div><div className="muted tiny">Riferimento domanda</div><h2>{r.nome} {r.cognome}</h2><p className="tiny muted">#{r.id.slice(0,8).toUpperCase()}</p></div><StatusBadge tone={r.stato==='approvata'?'success':r.stato==='respinta'?'danger':r.stato==='integrazione_richiesta'?'warning':'info'}>{statoLabel[r.stato as Stato]}</StatusBadge></div>
      <div className="detail-grid"><div><span className="k">Richiedente</span><strong>{r.nome} {r.cognome}</strong></div><div><span className="k">Data invio</span><strong>{formatDate(r.inviata_il)}</strong></div><div><span className="k">Ultimo aggiornamento</span><strong>{formatDate(r.modificato_il)}</strong></div><div><span className="k">Email account</span><strong>{user.email}</strong></div></div>
      <ol className="sc-status-steps" aria-label="Avanzamento della domanda">{['Compilazione','Ricezione','Verifica','Esito'].map((step,i)=>{const current=r.stato==='bozza'?0:r.stato==='inviata'?1:['in_verifica','integrazione_richiesta'].includes(r.stato)?2:3;return <li key={step} aria-current={i===current?'step':undefined} className={i<current?'is-complete':''}><span>{i+1}</span>{step}</li>;})}</ol><Dichiarazioni dati={r}/>
      {r.nota_pubblica && <Alert tone={r.stato==='integrazione_richiesta'?'warning':'info'} title={r.stato==='integrazione_richiesta'?'Informazioni richieste dalla segreteria':'Messaggio della segreteria'}>{r.nota_pubblica}</Alert>}
      {r.stato==='bozza' && <div className="actions"><Link className="button" href="/richiesta/nuova">Continua compilazione</Link></div>}
      {r.stato==='integrazione_richiesta' && <div className="actions"><Link className="button" href="/richiesta/nuova">Completa le integrazioni richieste</Link></div>}
      {r.stato==='approvata' && <div className="actions"><Link className="button" href="/area-personale">Vai alla tua area personale</Link></div>}
      {['inviata','in_verifica'].includes(r.stato) && <p className="muted">La segreteria sta gestendo la tua pratica. Non sono richieste altre azioni al momento.</p>}{r.stato==='respinta'&&<p>Consulta il messaggio della segreteria. Per chiarimenti contattala direttamente.</p>}
    </div><p className="muted tiny">L'approvazione non conferma l'avvenuto pagamento della quota o il tesseramento.</p>
  </div>;
}
