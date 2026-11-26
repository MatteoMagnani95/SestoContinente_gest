import {shiftDay} from './calendar-tools';
import {dateFilter,cents} from './finance-ui';
export type ReportPeriod={mode:string;from:string;to:string;today:string};
export type Task={id:string;category:string;entity:string;description:string;date:string|null;href:string;kind:'deadline'|'activity'|'open';status:string};
export function reportPeriod(today:string,mode?:string,dal?:string,al?:string):ReportPeriod{
 const selected=mode&&['scadute','7','15','30','60','90','personalizzato'].includes(mode)?mode:'30';
 if(selected==='scadute')return {mode:selected,from:'',to:shiftDay(today,-1),today};
 if(selected==='personalizzato'){const from=dateFilter(dal),to=dateFilter(al);return {mode:selected,from,to,today};}
 return {mode:selected,from:today,to:shiftDay(today,Number(selected)),today};
}
export function daysTo(today:string,date:string){return Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);}
export function periodValid(p:ReportPeriod){return p.mode!=='personalizzato'||Boolean(p.from&&p.to&&p.from<=p.to);}
export function inPeriod(t:Task,p:ReportPeriod){if(!periodValid(p))return false;if(t.kind==='open')return p.mode!=='scadute';if(!t.date)return false;if(p.mode==='scadute'&&t.kind!=='deadline')return false;return (!p.from||t.date>=p.from)&&(!p.to||t.date<=p.to);}
export function priority(t:Task,today:string){if(t.kind==='open')return 'Da gestire';const days=t.date?daysTo(today,t.date):null;if(t.kind==='deadline'&&days!==null&&days<0)return 'Scaduta';if(days!==null&&days<=7&&t.kind==='deadline')return 'Imminente';return 'Programmata';}
export function orderTasks(tasks:Task[],today:string){const rank:Record<string,number>={'Scaduta':0,'Imminente':1,'Da gestire':2,'Programmata':3};return [...tasks].sort((a,b)=>rank[priority(a,today)]-rank[priority(b,today)]||(a.date??'9999').localeCompare(b.date??'9999')||a.id.localeCompare(b.id));}
export function debtSummary(rows:{residuo:number|string;scadenza:string|null}[],p:ReportPeriod){return {open:rows.length,overdue:rows.filter(r=>r.scadenza&&r.scadenza<p.today).length,due:rows.filter(r=>r.scadenza&&r.scadenza>=p.today&&r.scadenza<=p.to&&(!p.from||r.scadenza>=p.from)).length,residue:Number(rows.reduce((n,r)=>n+cents(r.residuo),BigInt(0)))/100};}
