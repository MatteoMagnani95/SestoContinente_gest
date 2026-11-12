import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireStaff} from '@/lib/security';

type Category={tipo:'entrata'|'uscita';categoria:string;totale:number|string;movimenti:number};
type Month={mese:string;entrate:number|string;uscite:number|string;saldo:number|string};
type Financial={entrate:number|string;uscite:number|string;saldo:number|string;registrazioni:number;categorie:Category[];mesi:Month[]};
const money=(v:number|string)=>Number(v).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
function integerYear(value:string|undefined){const n=Number(value);return Number.isInteger(n)&&n>=2015&&n<=2100?n:new Date().getFullYear();}
export default async function Finance({searchParams}:{searchParams:Promise<{anno?:string}>}){
 const {supabase,user}=await requireStaff();
 const {data:admin}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
 if(!admin)redirect('/gestionale?msg=permessi');
 const year=integerYear((await searchParams).anno);
 const {data,error}=await supabase.rpc('riepilogo_contabile_periodo',{p_dal:`${year}-01-01`,p_al:`${year}-12-31`});
 const report=error||!data?null:data as unknown as Financial;
 const maxMonth=Math.max(1,...(report?.mesi??[]).map(m=>Math.max(Number(m.entrate),Number(m.uscite))));
 return <>
 <div className="page-intro"><p className="eyebrow">Amministrazione · Fase 3.3</p><h1>Rendiconto economico</h1><p>Report interno calcolato su tutti i movimenti del periodo, senza limiti di campionamento.</p></div>
 <form className="calendar-filter-form panel finance-year" action="/gestionale/economia" method="get">
 <label>Anno di riferimento<input type="number" name="anno" min="2015" max="2100" defaultValue={year}/></label>
 <button className="button" type="submit">Visualizza</button><Link href="/gestionale/moduli/contabilita">Gestisci movimenti</Link><Link href="/gestionale/esporta/contabilita">Esporta CSV</Link>
 </form>
 {!report?<div className="notice error">Non è stato possibile calcolare il rendiconto. Verifica che la migrazione 0005 sia stata eseguita su Supabase e che il tuo ruolo sia amministratore. Non vengono mostrati totali parziali.</div>:
 <>
 <div className="kpi-grid"><article className="kpi"><span>Entrate {year}</span><strong>{money(report.entrate)}</strong></article><article className="kpi"><span>Uscite {year}</span><strong>{money(report.uscite)}</strong></article><article className="kpi"><span>Saldo periodo</span><strong>{money(report.saldo)}</strong></article><article className="kpi"><span>Movimenti</span><strong>{report.registrazioni}</strong></article></div>
 <section className="panel"><h2>Andamento mensile</h2>{report.mesi.length===0?<p>Nessun movimento per il periodo selezionato.</p>:<div className="finance-months">
 {report.mesi.map(m=><div className="finance-month" key={m.mese}><strong>{m.mese}</strong><div className="finance-bar-group"><div className="finance-bar finance-bar-in" style={{width:`${Math.max(0,Math.min(100,Number(m.entrate)/maxMonth*100))}%`}} title={`Entrate ${money(m.entrate)}`}/><div className="finance-bar finance-bar-out" style={{width:`${Math.max(0,Math.min(100,Number(m.uscite)/maxMonth*100))}%`}} title={`Uscite ${money(m.uscite)}`}/></div><span className="finance-month-total">{money(m.saldo)}</span></div>)}
 <p className="tiny muted">Barra blu: entrate · barra arancione: uscite. Valori esatti nella tabella dei movimenti.</p></div>}</section>
 <section className="panel"><h2>Ripartizione per categoria</h2><div className="table-panel"><table><thead><tr><th>Tipo</th><th>Categoria</th><th>Registrazioni</th><th>Totale</th></tr></thead><tbody>
 {report.categorie.length===0?<tr><td colSpan={4}>Nessun movimento.</td></tr>:report.categorie.map(c=><tr key={`${c.tipo}-${c.categoria}`}><td>{c.tipo==='entrata'?'Entrata':'Uscita'}</td><td>{c.categoria}</td><td>{c.movimenti}</td><td><strong>{money(c.totale)}</strong></td></tr>)}
 </tbody></table></div></section>
 <p className="muted tiny">Questo rendiconto rappresenta esclusivamente i movimenti registrati nel gestionale e non sostituisce la contabilità ufficiale dell'associazione. Le operazioni contabilizzate sono mantenute nel database.</p>
 </>}
 </>;
}
