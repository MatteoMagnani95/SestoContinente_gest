import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {formatValue} from '@/lib/format';
import {romeDay,shiftDay} from '@/lib/calendar-tools';
import {asRomeISO} from '@/lib/course-tools';
export default async function Report(){
 const {supabase,user}=await requireStaff();
 const cutoff=shiftDay(romeDay(new Date().toISOString()),30);
 const now=new Date().toISOString();
 const [equipment,medical,pending,lessons,{data:admin}]=await Promise.all([
  supabase.from('attrezzature').select('id,codice,prossima_revisione',{count:'exact'}).lte('prossima_revisione',cutoff).order('prossima_revisione').order('id').limit(80),
  supabase.from('certificati_medici').select('id',{head:true,count:'exact'}).lte('scade_il',cutoff),
  supabase.from('saldi_quote').select('id',{head:true,count:'exact'}).gt('residuo',0).or(`scadenza.is.null,scadenza.lte.${cutoff}`),
  supabase.from('lezioni').select('id',{head:true,count:'exact'}).is('annullata_il',null).gte('inizio',now).lt('inizio',asRomeISO(`${shiftDay(cutoff,1)}T00:00`)),
  supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle()
 ]);
 const count=(result:{count:number|null;error:unknown})=>result.error?'—':result.count??'—';
 const errors=[equipment,medical,pending,lessons].some(r=>r.error);
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
 <div className="kpi-grid"><article className="kpi"><span>Revisioni attrezzature</span><strong>{count(equipment)}</strong></article><article className="kpi"><span>Certificati in scadenza</span><strong>{count(medical)}</strong></article><article className="kpi"><span>Quote con residuo</span><strong>{count(pending)}</strong></article><article className="kpi"><span>Lezioni imminenti</span><strong>{count(lessons)}</strong></article></div>
 {errors&&<p className="notice error" role="alert">Uno o più conteggi non sono disponibili; i valori mancanti non equivalgono a zero.</p>}
 <section className="panel"><h2>Riepilogo delle scadenze</h2><p>Attrezzature: {equipment.error?'elenco non disponibile':equipment.data?.map(x=>x.codice).join(', ')||'nessuna'}{!equipment.error&&(equipment.count??0)>80?' (prime 80; apri il modulo Attrezzature per l’elenco)':''}.</p><p>Certificati: {count(medical)} posizioni da verificare in <Link href="/gestionale/moduli/certificati">Certificati medici</Link>.</p><p>Quote: {count(pending)} posizioni in <Link href="/gestionale/moduli/quote">Quote associative</Link>.</p></section>
 {financialError&&<p className="notice error">Rendiconto non disponibile: controlla la migrazione 0005 e i permessi.</p>}
 {financial&&<section className="panel"><h2>Economia anno corrente</h2><div className="kpi-grid"><article className="kpi"><span>Entrate</span><strong>{formatValue(financial.entrate,'importo')}</strong></article><article className="kpi"><span>Uscite</span><strong>{formatValue(financial.uscite,'importo')}</strong></article><article className="kpi"><span>Saldo</span><strong>{formatValue(financial.saldo,'importo')}</strong></article></div><p className="tiny muted">Totali aggregati nel database, senza campionamento. <Link href="/gestionale/economia">Apri il rendiconto completo</Link>. Non sostituisce la contabilità ufficiale.</p></section>}
 <p className="muted tiny">I conteggi sono calcolati dal database; l’elenco dei codici attrezzatura è limitato a 80 elementi. I certificati conteggiati sono documenti registrati, non persone uniche.</p>
 </>;
}
