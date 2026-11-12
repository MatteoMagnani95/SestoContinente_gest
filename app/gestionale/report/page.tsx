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
  supabase.from('lezioni').select('id,titolo,inizio').is('annullata_il',null).gte('inizio',new Date().toISOString()).order('inizio').limit(10),
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
 let financialError=false;
 if(admin){
  const year=new Intl.DateTimeFormat('en-GB',{year:'numeric',timeZone:'Europe/Rome'}).format(new Date());
  const {data,error}=await supabase.rpc('riepilogo_contabile_periodo',{
   p_dal:`${year}-01-01`,p_al:`${year}-12-31`
  });
  if(error||!data){financialError=true;} else {
   const r=data as unknown as {entrate:string|number;uscite:string|number;saldo:string|number};
   financial={entrate:Number(r.entrate),uscite:Number(r.uscite),saldo:Number(r.saldo)};
  }
 }
 return <><div className="page-intro"><p className="eyebrow">Segreteria · Controlli</p><h1>Report e scadenze</h1><p>Scadenze già superate o previste nei prossimi 30 giorni. Dati amministrativi, non diagnosi mediche.</p></div>
 <div className="kpi-grid"><article className="kpi"><span>Revisioni attrezzature</span><strong>{equipment.length}</strong></article><article className="kpi"><span>Certificati in scadenza</span><strong>{medical.length}</strong></article><article className="kpi"><span>Quote con residuo</span><strong>{pending.length}</strong></article><article className="kpi"><span>Lezioni imminenti</span><strong>{lezioni?.length??0}</strong></article></div>
 <section className="panel"><h2>Riepilogo delle scadenze</h2><p>Attrezzature: {equipment.map(x=>x.codice).join(', ')||'nessuna'}.</p><p>Certificati: {medical.length} posizioni da verificare in <Link href="/gestionale/moduli/certificati">Certificati medici</Link>.</p><p>Quote: {pending.length} posizioni in <Link href="/gestionale/moduli/quote">Quote associative</Link>.</p></section>
 {financialError&&<p className="notice error">Rendiconto non disponibile: controlla la migrazione 0005 e i permessi.</p>}
 {financial&&<section className="panel"><h2>Economia anno corrente</h2><div className="kpi-grid"><article className="kpi"><span>Entrate</span><strong>{formatValue(financial.entrate,'importo')}</strong></article><article className="kpi"><span>Uscite</span><strong>{formatValue(financial.uscite,'importo')}</strong></article><article className="kpi"><span>Saldo</span><strong>{formatValue(financial.saldo,'importo')}</strong></article></div><p className="tiny muted">Totali aggregati nel database, senza campionamento. <Link href="/gestionale/economia">Apri il rendiconto completo</Link>. Non sostituisce la contabilità ufficiale.</p></section>}
 <p className="muted tiny">Le scadenze in questa pagina restano una vista preliminare con limiti di lettura. Per i totali contabili usa il rendiconto SQL completo. Non usare i conteggi di scadenza come attestazioni ufficiali.</p>
 </>;
}
