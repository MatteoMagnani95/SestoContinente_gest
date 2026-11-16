export function formatValue(value: unknown, field?: string): string {
 if (value === null || value === undefined || value === '') return '—';
 if (typeof value === 'boolean') return value ? 'Sì' : 'No';
 if (field && ['importo','importo_dovuto','costo'].includes(field) && typeof value === 'number')
  return value.toLocaleString('it-IT',{style:'currency',currency:'EUR'});
 if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
  const [y,m,d] = value.split('-'); return `${d}/${m}/${y}`;
 }
 if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
  const date=new Date(value);
  if(!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('it-IT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Rome'}).format(date);
 }
 return String(value);
}
export function datetimeForInput(value: unknown): string {
 if (typeof value !== 'string'||!value) return '';
 const parsed = new Date(value);
 if(Number.isNaN(parsed.getTime())) return '';
 const parts=new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Europe/Rome'}).format(parsed);
 return parts.replace(' ','T');
}
export function italianLocalToISO(value: string): string {
 // L'offset è ricavato per la data scelta, non dall'ora del server Vercel.
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Data e ora non valide');
 const guess = new Date(`${value}:00Z`);
 if(Number.isNaN(guess.getTime())) throw new Error('Data e ora non valide');
 const tz=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',timeZoneName:'shortOffset'}).formatToParts(guess)
  .find(p=>p.type==='timeZoneName')?.value ?? 'GMT+1';
 const match=tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
 const offset=match?`${match[1]}${match[2].padStart(2,'0')}:${match[3]??'00'}`:'+01:00';
 const result=new Date(`${value}:00${offset}`);
 if(Number.isNaN(result.getTime())) throw new Error('Data e ora non valide');
 return result.toISOString();
}
