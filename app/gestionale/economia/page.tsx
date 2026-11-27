import {MetricCard,PageHeader,ButtonLink,Alert} from '@/components/ui/Primitives';
import {DataTable} from '@/components/ui/DataTable';
import {fillMonths} from '@/lib/finance-ui';
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
 const months=fillMonths(year,report?.mesi??[]);
 const maxMonth=Math.max(1,...(report?.mesi??[]).map(m=>Math.max(Number(m.entrate),Number(m.uscite))));
 return <>
 <PageHeader area="finance" icon="wallet" marine eyebrow="Amministrazione · Contabilità" title="Rendiconto economico" description="Report interno calcolato su tutti i movimenti del periodo, per l’intero periodo selezionato."/>
 <form className="calendar-filter-form panel finance-year" action="/gestionale/economia" method="get">
 <label>Anno di riferimento<input type="number" name="anno" min="2015" max="2100" defaultValue={year}/></label>
 <button className="button" type="submit">Visualizza</button><Link href={'/gestionale/moduli/contabilita?dal='+year+'-01-01&al='+year+'-12-31'}>Gestisci movimenti del periodo</Link><Link href={'/gestionale/esporta/contabilita?dal='+year+'-01-01&al='+year+'-12-31'}>Esporta CSV del periodo</Link>
 </form>
 {!report?<div className="notice error">Non è stato possibile calcolare il rendiconto. Riprova. Non vengono mostrati totali parziali.</div>:
 <>
 <div className="sc-metrics sc-finance-kpis"><MetricCard area="finance" icon="wallet" label="Entrate" value={money(report.entrate)}/><MetricCard area="finance" icon="wallet" label="Uscite" value={money(report.uscite)}/><MetricCard area="finance" icon="wallet" label="Saldo del periodo" value={money(report.saldo)} note="Non equivale al saldo di banca o cassa"/><MetricCard area="finance" icon="clipboard" label="Movimenti" value={report.registrazioni}/></div>
 <section className="sc-card"><h2>Andamento mensile</h2><p>Entrate e uscite · {year}</p><div className="sc-finance-legend"><span>Entrate</span><span>Uscite</span></div><div className="sc-finance-chart" role="region" aria-label="Grafico mensile entrate e uscite" tabIndex={0}>{months.map(m=><div className="sc-finance-month" key={m.mese}><div className="sc-finance-bars"><div className="sc-finance-in" style={{height:(Number(m.entrate)/maxMonth*100)+'%'}} title={money(m.entrate)}/><div className="sc-finance-out" style={{height:(Number(m.uscite)/maxMonth*100)+'%'}} title={money(m.uscite)}/></div><strong>{m.label}</strong></div>)}</div><DataTable label="Valori mensili" mobileCards><thead><tr><th>Mese</th><th>Entrate</th><th>Uscite</th><th>Saldo</th></tr></thead><tbody>{months.map(m=><tr key={m.mese}><td data-label="Mese">{m.label}</td><td data-label="Entrate">{money(m.entrate)}</td><td data-label="Uscite">{money(m.uscite)}</td><td data-label="Saldo">{money(m.saldo)}</td></tr>)}</tbody></DataTable></section>
 <section className="panel"><h2>Ripartizione per categoria</h2><div className="table-panel"><table><thead><tr><th>Tipo</th><th>Categoria</th><th>Registrazioni</th><th>Totale</th><th>Incidenza sul tipo</th></tr></thead><tbody>
 {report.categorie.length===0?<tr><td colSpan={5}>Nessun movimento.</td></tr>:report.categorie.map(c=><tr key={`${c.tipo}-${c.categoria}`}><td>{c.tipo==='entrata'?'Entrata':'Uscita'}</td><td>{c.categoria}</td><td>{c.movimenti}</td><td><strong>{money(c.totale)}</strong></td><td>{Number(c.tipo==='entrata'?report.entrate:report.uscite)>0?(100*Number(c.totale)/Number(c.tipo==='entrata'?report.entrate:report.uscite)).toLocaleString('it-IT',{maximumFractionDigits:1})+'%':'—'}</td></tr>)}
 </tbody></table></div></section>
 <p className="muted tiny">Questo rendiconto rappresenta esclusivamente i movimenti registrati nel gestionale e non sostituisce la contabilità ufficiale dell'associazione. Le operazioni contabilizzate sono mantenute nel database.</p>
 </>}
 </>;
}
