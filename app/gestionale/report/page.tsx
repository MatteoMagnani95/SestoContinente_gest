import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {formatValue} from '@/lib/format';
export default async function Report(){
 const {supabase,user}=await requireStaff();
 const [{data:attrezzature},{data:certificati},{data:quote},{data:pagamenti},{data:lezioni},{data:admin}]=await Promise.all([
  supabase.from('attrezzature').select('id,codice,prossima_revisione').not('prossima_revisione','is',null).order('prossima_revisione').limit(80),
  supabase.from('certificati_medici').select('id,persona_id,scade_il').order('scade_il').limit(80),
  supabase.from('quote_associative').select('id,persona_id,importo_dovuto,scadenza').order('scadenza').limit(200),
  supabase.from('pagamenti').select('quota_id,importo').limit(1000),
  supabase.from('lezioni').select('id,titolo,inizio').gte('inizio',new Date().toISOString()).order('inizio').limit(10),
  supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle()
 ]);
 const today=new Date();const in30=new Date(Date.now()+30*86400e3);
 const expiring=(date:string|null)=>date&&new Date(date+'T12:00:00')<=in30;
 const equipment=attrezzature?.filter(r=>expiring(r.prossima_revisione))??[];
 const medical=certificati?.filter(r=>expiring(r.scade_il))??[];
 const pending=quote?.filter(q=>{
  const total=pagamenti?.filter(p=>p.quota_id===q.id).reduce((a,p)=>a+Number(p.importo),0)??0;
  return total<Number(q.importo_dovuto) && (q.scadenza===null || new Date(q.scadenza+'T12:00:00')<in30);
 })??[];
 let financial:null|{entrate:number;uscite:number;saldo:number}=null;
 if(admin){
 const {data}=await supabase.from('movimenti_economici').select('tipo,importo').gte('data_movimento',`${today.getFullYear()}-01-01`).limit(5000);
 const entrate=data?.filter(x=>x.tipo==='entrata').reduce((sum,x)=>sum+Number(x.importo),0)??0;
 const uscite=data?.filter(x=>x.tipo==='uscita').reduce((sum,x)=>sum+Number(x.importo),0)??0;
 financial={entrate,uscite,saldo:entrate-uscite};
 }
 return <><div className="page-intro"><p className="eyebrow">Segreteria · Controlli</p><h1>Report e scadenze</h1><p>Scadenze già superate o previste nei prossimi 30 giorni. Dati amministrativi, non diagnosi mediche.</p></div>
 <div className="kpi-grid"><article className="kpi"><span>Revisioni attrezzature</span><strong>{equipment.length}</strong></article><article className="kpi"><span>Certificati in scadenza</span><strong>{medical.length}</strong></article><article className="kpi"><span>Quote con residuo</span><strong>{pending.length}</strong></article><article className="kpi"><span>Lezioni imminenti</span><strong>{lezioni?.length??0}</strong></article></div>
 <section className="panel"><h2>Riepilogo delle scadenze</h2><p>Attrezzature: {equipment.map(x=>x.codice).join(', ')||'nessuna'}.</p><p>Certificati: {medical.length} posizioni da verificare in <Link href="/gestionale/moduli/certificati">Certificati medici</Link>.</p><p>Quote: {pending.length} posizioni in <Link href="/gestionale/moduli/quote">Quote associative</Link>.</p></section>
 {financial&&<section className="panel"><h2>Economia anno corrente</h2><div className="kpi-grid"><article className="kpi"><span>Entrate</span><strong>{formatValue(financial.entrate,'importo')}</strong></article><article className="kpi"><span>Uscite</span><strong>{formatValue(financial.uscite,'importo')}</strong></article><article className="kpi"><span>Saldo</span><strong>{formatValue(financial.saldo,'importo')}</strong></article></div><p className="tiny muted">Rendicontazione gestionale interna. Non sostituisce la contabilità ufficiale.</p></section>}
 <p className="muted tiny">Le tabelle di riepilogo hanno limiti tecnici di campionamento (1.000 versamenti e 5.000 movimenti). Prima dell'uso contabile definitivo andranno implementati report aggregati e paginazione sul database.</p>
 </>;
}
