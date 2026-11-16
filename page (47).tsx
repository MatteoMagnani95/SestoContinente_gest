import Link from 'next/link';
import { queryMessage } from '@/lib/security';
export default async function Home({searchParams}:{searchParams:Promise<{msg?:string}>}){
  const {msg}=await searchParams;
  return <div className="hero-layout">
    <section className="hero"><p className="eyebrow">Associazione sportiva · Area riservata</p>
      <h1>Il mare ci unisce.<br/><em>Le attività, in un unico posto.</em></h1>
      <p>Richiedi l’adesione, segui la tua pratica e consulta le informazioni autorizzate. La segreteria gestisce le richieste in modo ordinato e sicuro.</p>
      {msg && <div className="notice error">{queryMessage(msg)}</div>}
      <div className="buttons"><Link className="button" href="/registrati">Richiedi adesione</Link><Link className="button ghost" href="/accedi">Ho già un account</Link></div>
    </section>
    <aside className="hero-card"><div className="wave-circle">≈</div><h2>Come funziona</h2>
      <ol><li>Registrati e conferma la tua email</li><li>Compila la richiesta di adesione</li><li>Attendi la verifica della segreteria</li><li>Accedi alla tua area personale</li></ol>
      <p className="muted tiny">La registrazione non equivale a iscrizione associativa approvata o quota pagata.</p>
    </aside>
  </div>;
}
