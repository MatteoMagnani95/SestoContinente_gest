import {redirect} from 'next/navigation';
import Link from 'next/link';
import { requireUser } from '@/lib/security';
export default async function PersonalArea() {
  const {supabase,user}=await requireUser();
  const {data:request}=await supabase.from('richieste').select('id,stato,persona_id').eq('utente_id',user.id).maybeSingle();
  if(request?.stato!=='approvata') redirect('/richiesta/stato');
  const {data:links}=await supabase.from('collegamenti_persone').select('persona_id,relazione').eq('utente_id',user.id);
  const ids=links?.map(x=>x.persona_id)??[];
  const {data:people}=ids.length?await supabase.from('persone').select('id,nome,cognome,email,telefono').in('id',ids):{data:[]};
  const {data:memberships}=ids.length?await supabase.from('adesioni').select('persona_id,stato').in('persona_id',ids):{data:[]};
  return <div className="container"><div className="page-intro"><p className="eyebrow">Area personale</p><h1>Benvenuto in Sesto Continente</h1><p>La domanda è stata approvata. Di seguito trovi le informazioni collegate al tuo account.</p></div>
    <div className="notice warning"><strong>Posizione associativa da completare.</strong> L'approvazione della domanda non comporta automaticamente il pagamento della quota, il tesseramento o l'accesso ai corsi.</div>
    <div className="cards">{people?.map(p=><article className="panel" key={p.id}><span className="eyebrow">{links?.find(l=>l.persona_id===p.id)?.relazione==='tutore'?'Minore rappresentato':'Profilo personale'}</span><h2>{p.nome} {p.cognome}</h2><p>{p.email??'Nessuna email personale associata'}</p><p className="muted">Adesione: {memberships?.find(a=>a.persona_id===p.id)?.stato.replaceAll('_',' ') ?? 'Non presente'}</p></article>)}</div>
    <div className="notice"><strong>Prossimamente:</strong> iscrizioni corsi, brevetti, certificati e documenti personali. Questi moduli non sono ancora attivi.</div>
    <Link href="/richiesta/stato">Consulta la domanda originale</Link>
  </div>;
}
