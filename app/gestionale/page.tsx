import Link from 'next/link';
import {requireStaff} from '@/lib/security';
export default async function Dashboard(){
  const {supabase}=await requireStaff();
  const [{count:pending},{count:review},{count:approved},{count:members}] = await Promise.all([
    supabase.from('richieste').select('*',{head:true,count:'exact'}).eq('stato','inviata'),
    supabase.from('richieste').select('*',{head:true,count:'exact'}).eq('stato','in_verifica'),
    supabase.from('richieste').select('*',{head:true,count:'exact'}).eq('stato','approvata'),
    supabase.from('adesioni').select('*',{head:true,count:'exact'}),
  ]);
  return <><div className="page-intro"><p className="eyebrow">Segreteria · Panoramica</p><h1>Buon lavoro</h1><p>Le richieste di adesione e la situazione delle anagrafiche, in un unico posto.</p></div>
    <div className="kpi-grid"><article className="kpi"><span>Domande da prendere in carico</span><strong>{pending??'—'}</strong></article><article className="kpi"><span>In verifica</span><strong>{review??'—'}</strong></article><article className="kpi"><span>Domande approvate</span><strong>{approved??'—'}</strong></article><article className="kpi"><span>Adesioni inserite</span><strong>{members??'—'}</strong></article></div>
    <section className="panel"><h2>Operazioni rapide</h2><p className="muted">Consulta le domande, esamina le integrazioni e verifica le anagrafiche.</p><div className="buttons"><Link className="button" href="/gestionale/richieste">Gestisci le domande</Link><Link className="button ghost" href="/gestionale/soci">Consulta anagrafica</Link></div></section>
    <p className="muted tiny">I dati vengono letti da PostgreSQL con i permessi della segreteria.</p>
  </>;
}
