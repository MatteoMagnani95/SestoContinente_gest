import Link from 'next/link';
import {requireStaff} from '@/lib/security';
import {italianLocalToISO} from '@/lib/format';
const days=['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
function parseDay(value:string|undefined):Date{
 if(value&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
  const d=new Date(`${value}T12:00:00Z`);
  if(!Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value)return d;
 }
 const italyDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return new Date(`${italyDate}T12:00:00Z`);
}
function addDays(date:Date,days:number){const d=new Date(date);d.setUTCDate(d.getUTCDate()+days);return d;}
function iso(date:Date){return date.toISOString().slice(0,10);}
function monday(date:Date){return addDays(date,-((date.getUTCDay()+6)%7));}
function weekLabel(date:Date){return new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short'}).format(date);}
export default async function CalendarView({searchParams}:{searchParams:Promise<{giorno?:string;vista?:string}>}){
 const {supabase}=await requireStaff();
 const {giorno,vista}=await searchParams;const selected=parseDay(giorno);
 const monthView=vista==='mese';
 const firstOfMonth=new Date(Date.UTC(selected.getUTCFullYear(),selected.getUTCMonth(),1,12));
 const first=monthView?monday(firstOfMonth):monday(selected);
 const dates=Array.from({length:monthView?42:7},(_,i)=>addDays(first,i));
 const last=addDays(dates[dates.length-1],1);
 const {data:lessons,error}=await supabase.from('lezioni')
  .select('id,titolo,edizione_id,inizio,fine,piscina_id').gte('inizio',italianLocalToISO(`${iso(first)}T00:00`))
  .lt('inizio',italianLocalToISO(`${iso(last)}T00:00`)).order('inizio').limit(500);
 const editionIds=[...new Set(lessons?.map(x=>x.edizione_id)??[])];
 const {data:editions}=editionIds.length?await supabase.from('edizioni_corsi').select('id,nome').in('id',editionIds):{data:[]};
 const base=monthView?firstOfMonth:selected;
 const prev=monthView?new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()-1,1,12)):addDays(base,-7);
 const next=monthView?new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,1,12)):addDays(base,7);
 const current=`/gestionale/calendario-visivo?giorno=${iso(selected)}`;
 return <><div className="page-intro"><p className="eyebrow">Impianti · Agenda</p><h1>Calendario attività</h1><p>Vista {monthView?'mensile':'settimanale'} delle lezioni (orario italiano).</p></div>
 <div className="module-toolbar"><div className="buttons">
 <Link className="button ghost" href={`?giorno=${iso(prev)}&vista=${monthView?'mese':'settimana'}`}>← Precedente</Link>
 <span className="button ghost" aria-label="Periodo">{weekLabel(dates[0])} – {weekLabel(dates[dates.length-1])}</span>
 <Link className="button ghost" href={`?giorno=${iso(next)}&vista=${monthView?'mese':'settimana'}`}>Successivo →</Link></div>
 <div className="buttons"><Link className="button ghost" href={`${current}&vista=settimana`}>Settimana</Link>
 <Link className="button ghost" href={`${current}&vista=mese`}>Mese</Link>
 <Link className="button" href="/gestionale/moduli/calendario">Gestisci lezioni</Link>
 <Link className="button ghost" href="/gestionale/moduli/prenotazioni">Prenota corsie</Link></div></div>
 {error?<p className="notice error">Non è stato possibile leggere le lezioni.</p>:<div className={`calendar-grid ${monthView?'calendar-month':''}`}>
 {days.map(d=><div className="calendar-head" key={d}>{d}</div>)}
 {dates.map(day=>{
 const date=iso(day);const events=lessons?.filter(l=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date(l.inizio))===date)??[];
 return <div key={date} className={`calendar-day ${day.getUTCMonth()!==selected.getUTCMonth()?'calendar-muted':''}`}>
 <div className="calendar-date">{day.getUTCDate()} <small>{day.toLocaleDateString('it-IT',{month:'short',timeZone:'UTC'})}</small></div>
 {events.map(e=><div key={e.id} className="calendar-event"><strong>{new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'}).format(new Date(e.inizio))}</strong>
 <span>{e.titolo}</span><small>{editions?.find(x=>x.id===e.edizione_id)?.nome??''}</small></div>)}
 </div>;
 })}</div>}
 <p className="muted tiny">La prenotazione delle corsie viene validata dal database: due corsi non possono occupare la stessa corsia nello stesso intervallo orario.</p>
 </>;
}
