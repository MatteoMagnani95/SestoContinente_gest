/** Dates are calendar dates, never UTC ages measured in hours. */
export function todayRome(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)?.value??'';
 return part('year')+'-'+part('month')+'-'+part('day');
}
export function validBirthDate(value:string,today=todayRome()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>today)return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function minorAge(value:string,today=todayRome()){
 if(!validBirthDate(value,today))return false;
 // Same cutoff as the existing database function: current_date - interval '18 years'.
 const [year,month,day]=today.split('-').map(Number);
 const cutoffYear=year-18,cutoffDay=Math.min(day,new Date(Date.UTC(cutoffYear,month,0)).getUTCDate());
 const cutoff=[String(cutoffYear),String(month).padStart(2,'0'),String(cutoffDay).padStart(2,'0')].join('-');
 return value>cutoff;
}
export function imageChoice(form:FormData){
 const v=String(form.get('immagini')??'').trim();
 return form.get('immagini_checkbox')==='1'&&v===''?'no':v;
}
export function consentStatus(value:boolean|null|undefined,previousPositive=false){
 return value===true?'Consenso acquisito':value===false?(previousPositive?'Consenso revocato':'Consenso non prestato'):'Consenso storico non acquisito';
}
export const applicationSections=['Dati anagrafici','Residenza e recapiti','Privacy e dichiarazioni','Riepilogo'] as const;
