// Calendario senza dipendenza dal fuso del server Vercel.
import {asRomeISO} from './course-tools';
export type CalendarView='settimana'|'mese';
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
 const first=view==='mese'?monday(`${day.slice(0,7)}-01`):monday(day);
 const days=Array.from({length:view==='mese'?42:7},(_,n)=>shiftDay(first,n));
 return {days,from:asRomeISO(`${days[0]}T00:00`),to:asRomeISO(`${shiftDay(days[days.length-1],1)}T00:00`)};
}
export function changePeriod(day:string,view:CalendarView,amount:number):string{
 if(view==='settimana')return shiftDay(day,amount*7);
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
