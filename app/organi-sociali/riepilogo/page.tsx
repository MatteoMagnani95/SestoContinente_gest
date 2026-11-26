import {PageHeader,MetricCard,Alert} from '@/components/ui/Primitives';
import Link from 'next/link';
import {requireBoard} from '@/lib/security';
export default async function BoardSummary(){
 const {supabase}=await requireBoard();
 const {data,error}=await supabase.rpc('cda_report_sicuro');
 return <div className="container"><Link className="back-link" href="/organi-sociali">← Organi Sociali</Link>
 <div className="page-intro"><p className="eyebrow">Consiglio d'Amministrazione</p><h1>Riepilogo aggregato</h1><p>Report sintetico per le sedute. Nessun dato nominativo, sanitario o contabile.</p></div>
 {error?<p className="notice error">Report non disponibile. Riprova.</p>:
 <div className="sc-metrics">{(data??[]).map((r:{tipo:string;totale:number})=><MetricCard key={r.tipo} label={r.tipo} value={r.totale} icon="clipboard"/>)}</div>}
 </div>;
}
