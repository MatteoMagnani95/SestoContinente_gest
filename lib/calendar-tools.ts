// Calendario senza dipendenza dal fuso del server Vercel.
import {asRomeISO,UUID_RE} from './course-tools';
export const calendarViews=[['giorno','Giorno'],['settimana','Settimana'],['mese','Mese'],['agenda','Agenda']] as const;
export type CalendarView=typeof calendarViews[number][0];
// L’agenda è la vista iniziale anche su desktop: niente rilevamento UA o doppio caricamento.
export function calendarView(value?:string):CalendarView{return calendarViews.find(([v])=>v===value)?.[0]??(value?'settimana':'agenda');}
export function validDay(value:string|undefined):string{
 if(value&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
  const date=new Date(`${value}T12:00:00Z`);
  if(!Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value)return value;
 }
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
export function dateUTC(day:string):Date{return new Date(`${day}T12:00:00Z`);}
export function asDay(d:Date):string{return d.toISOString().slice(0,10);}
export function shiftDay(day:string,days:number):string{
 const date=dateUTC(day);date.setUTCDate(date.getUTCDate()+days);return asDay(date);
}
export function monday(day:string):string{return shiftDay(day,-((dateUTC(day).getUTCDay()+6)%7));}
export function dateWindow(day:string,view:CalendarView){
 const first=view==='mese'?monday(`${day.slice(0,7)}-01`):view==='settimana'?monday(day):day;
 const days=Array.from({length:view==='mese'?42:view==='giorno'?1:7},(_,n)=>shiftDay(first,n));
 return {days,from:asRomeISO(`${days[0]}T00:00`),to:asRomeISO(`${shiftDay(days[days.length-1],1)}T00:00`)};
}
export function changePeriod(day:string,view:CalendarView,amount:number):string{
 if(view==='giorno')return shiftDay(day,amount);
 if(view==='settimana'||view==='agenda')return shiftDay(day,amount*7);
 const d=dateUTC(`${day.slice(0,7)}-01`);
 d.setUTCMonth(d.getUTCMonth()+amount);
 return asDay(d);
}
export function romeDay(value:string):string{
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function romeTime(value:string):string{
 return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}

export type CalendarContext={giorno:string;vista:CalendarView;piscina:string;edizione:string;annullate:boolean};
export function calendarContext(input:{giorno?:string;vista?:string;piscina?:string;edizione?:string;annullate?:string}):CalendarContext{
 return {giorno:validDay(input.giorno),vista:calendarView(input.vista),piscina:input.piscina&&UUID_RE.test(input.piscina)?input.piscina:'',edizione:input.edizione&&UUID_RE.test(input.edizione)?input.edizione:'',annullate:input.annullate==='1'};
}
export function calendarFormContext(form:FormData):CalendarContext{
 return calendarContext({giorno:String(form.get('cal_giorno')??''),vista:String(form.get('cal_vista')??''),piscina:String(form.get('cal_piscina')??''),edizione:String(form.get('cal_edizione')??''),annullate:String(form.get('cal_annullate')??'')});
}
export function calendarParams(context:CalendarContext){
 const q=new URLSearchParams({giorno:context.giorno,vista:context.vista});if(context.piscina)q.set('piscina',context.piscina);if(context.edizione)q.set('edizione',context.edizione);if(context.annullate)q.set('annullate','1');return q;
}
export function calendarHref(context:CalendarContext,extra:{msg?:string;lezione?:string;nuovo?:boolean;creaGiorno?:string}={}){
 const q=calendarParams(context);if(extra.msg)q.set('msg',extra.msg);if(extra.lezione&&UUID_RE.test(extra.lezione))q.set('lezione',extra.lezione);if(extra.nuovo)q.set('nuovo','1');if(extra.creaGiorno)q.set('crea_giorno',validDay(extra.creaGiorno));return '/gestionale/calendario-visivo?'+q.toString();
}
export function calendarLessonHref(id:string,context:CalendarContext,msg?:string){
 const q=calendarParams(context);if(msg)q.set('msg',msg);return '/gestionale/calendario-visivo/'+encodeURIComponent(id)+'?'+q.toString();
}
export function overlaps(start:string,end:string,from:string,to:string){
 return Date.parse(start)<Date.parse(to)&&Date.parse(end)>Date.parse(from);
}
export function dayBounds(day:string){return {from:asRomeISO(day+'T00:00'),to:asRomeISO(shiftDay(day,1)+'T00:00')};}
export function intervalOnDay(start:string,end:string,day:string){
 const {from,to}=dayBounds(day);
 if(!overlaps(start,end,from,to))return null;
 return {start:Date.parse(start)<Date.parse(from)?'00:00':romeTime(start),end:Date.parse(end)>=Date.parse(to)?'24:00':romeTime(end),continuesBefore:Date.parse(start)<Date.parse(from),continuesAfter:Date.parse(end)>Date.parse(to)};
}
export type LaneConflict={id:string;corsia_id:string;lezione_id:string;inizio:string;fine:string};
export type LanePreview={status:'ready';conflicts:LaneConflict[];checkedAt:string}|{status:'error';message:string};
