// Utility pure condivise tra le schermate e le azioni server della Fase 3.2.
export const COURSE_STATES=['programmato','attivo','concluso','annullato'] as const;
export const ENROLLMENT_STATES=['in_attesa','iscritto','ritirato','concluso','respinto'] as const;
export const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function textValue(form:FormData,name:string,max=200):string{
 const value=String(form.get(name)??'').trim();
 if(value.length>max)throw new Error('Campo troppo lungo');
 return value;
}
export function uuidValue(form:FormData,name:string):string{
 const v=textValue(form,name,40);if(!UUID_RE.test(v))throw new Error('Identificativo non valido');return v;
}
export function dateValue(form:FormData,name:string):string{
 const v=textValue(form,name,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(`${v}T12:00:00Z`).toISOString().slice(0,10)!==v)
  throw new Error('Data non valida');
 return v;
}
export function asRomeISO(local:string):string{
 // L'input datetime-local non comprende il fuso. Interpretarlo esplicitamente come ora di Roma,
 // rifiutando gli orari inesistenti o ambigui al cambio tra ora solare e legale.
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
 if(!m)throw new Error('Indicare data e ora in formato valido');
 const [y,mo,d,h,min]=m.slice(1).map(Number);
 if(mo<1||mo>12||d<1||d>31||h>23||min>59)throw new Error('Data e ora non valide');
 const naive=Date.UTC(y,mo-1,d,h,min);
 const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const candidates=[1,2].map(offset=>new Date(naive-offset*3600_000)).filter(candidate=>{
  const p=Object.fromEntries(fmt.formatToParts(candidate).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
  return p.year===y&&p.month===mo&&p.day===d&&p.hour===h&&p.minute===min;
 });
 if(candidates.length!==1)throw new Error('Ora inesistente o ambigua per il cambio di orario italiano');
 return candidates[0].toISOString();
}
export function formatRome(value:string|null|undefined):string{
 if(!value)return '—';
 return new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
}
export function courseName(type:string,level:number|null){return type==='ARA'?`ARA · Livello ${level??'—'}`:type==='APNEA'?'Apnea':'Nuoto libero';}
export function detailHref(id:string,msg?:string){return `/gestionale/corsi/${encodeURIComponent(id)}${msg?`?msg=${encodeURIComponent(msg)}`:''}`;}
