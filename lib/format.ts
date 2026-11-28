import {asRomeISO} from './course-tools';
const currencyFormatter=new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const dateTimeFormatter=new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Rome'});
const inputFormatter=new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Rome'});
export function formatValue(value: unknown, field?: string): string {
 if (value === null || value === undefined || value === '') return '—';
 if (typeof value === 'boolean') return value ? 'Sì' : 'No';
 if (field && ['importo','importo_dovuto','costo'].includes(field) && typeof value === 'number')
  return currencyFormatter.format(value);
 if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
  const [y,m,d] = value.split('-'); return `${d}/${m}/${y}`;
 }
 if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
  const date=new Date(value);
  if(!Number.isNaN(date.getTime())) return dateTimeFormatter.format(date);
 }
 return String(value);
}
export function datetimeForInput(value: unknown): string {
 if (typeof value !== 'string'||!value) return '';
 const parsed = new Date(value);
 if(Number.isNaN(parsed.getTime())) return '';
 const parts=inputFormatter.format(parsed);
 return parts.replace(' ','T');
}
export function italianLocalToISO(value: string): string {
  // Una sola conversione, con validazione degli orari inesistenti o ambigui al cambio DST.
  return asRomeISO(value);
}
