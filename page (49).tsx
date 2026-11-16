import Link from 'next/link';
import { redirect } from 'next/navigation';
import ApplicationForm from '@/components/ApplicationForm';
import { queryMessage, requireUser } from '@/lib/security';
export default async function NewRequest({searchParams}:{searchParams:Promise<{msg?:string}>}) {
  const { msg } = await searchParams;
  const {supabase,user} = await requireUser();
  if (!user.email_confirmed_at) return <div className="container narrow"><h1>Verifica prima la tua email</h1><p>Per presentare la richiesta devi confermare l'indirizzo utilizzato nella registrazione.</p><Link href="/accedi">Torna all'accesso</Link></div>;
  const {data:request} = await supabase.from('richieste').select('*').eq('utente_id',user.id).maybeSingle();
  if (request && !['bozza','integrazione_richiesta'].includes(request.stato)) redirect('/richiesta/stato');
  return <div className="container narrow"><div className="page-intro"><p className="eyebrow">Adesione all'associazione</p><h1>{request?.stato==='integrazione_richiesta'?'Completa la tua domanda':'Richiedi l’adesione'}</h1><p>Compila i dati richiesti. La domanda sarà esaminata dalla segreteria.</p></div>
    <div className="notice warning"><strong>Ambiente tecnico di prova:</strong> utilizza solo dati inventati. Il sistema non è ancora autorizzato alla raccolta di dati personali reali.</div>
    {request?.stato==='integrazione_richiesta' && <div className="notice"><strong>Informazioni richieste dalla segreteria:</strong> {request.nota_pubblica}</div>}
    {msg && <div className="notice error" role="alert">{queryMessage(msg)}</div>}
    <ApplicationForm saved={request} />
  </div>;
}
