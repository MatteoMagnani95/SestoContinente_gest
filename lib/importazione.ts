import {validaCF} from './codice-fiscale';
export const SOCI_HEADERS=['codice_fiscale','nome','cognome','data_nascita','luogo_nascita','provincia_nascita','stato_nascita','provincia_residenza','stato_residenza','email','telefono'] as const;
export const CORSI_HEADERS=['codice_fiscale','edizione_id','brevetto','data_brevetto'] as const;
export type TipoImportazione='soci'|'corsi';
export function headings(tipo:TipoImportazione){return tipo==='soci'?[...SOCI_HEADERS]:[...CORSI_HEADERS];}
export const IMPORT_EDITION_UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function realIsoDate(value:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000-'))return false;
 const parsed=new Date(value+'T12:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
export function normalizzaRiga(raw:Record<string,unknown>,tipo:TipoImportazione){
 const mapped:Record<string,string>={};for(const h of headings(tipo))mapped[h]=String(raw[h]??'').trim();
 mapped.codice_fiscale=mapped.codice_fiscale.toUpperCase();
 if(tipo==='corsi')mapped.edizione_id=mapped.edizione_id.toLowerCase();
 for(const h of ['provincia_nascita','provincia_residenza'])if(mapped[h])mapped[h]=mapped[h].toUpperCase();
 return mapped;
}
export function erroriRiga(row:Record<string,string>,tipo:TipoImportazione):string[]{
 const errors:string[]=[];
 if(!validaCF(row.codice_fiscale??''))errors.push('CF di 16 caratteri o carattere di controllo non valido');
 if(tipo==='soci'){
  if(!row.nome||!row.cognome)errors.push('Nome o cognome mancante');
  if(row.data_nascita&&!realIsoDate(row.data_nascita))errors.push('Data nascita non valida (AAAA-MM-GG)');
  for(const f of ['provincia_nascita','provincia_residenza'])if(row[f]&&!/^[A-Z]{2}$/.test(row[f]))errors.push(f+' non valida');
  for(const f of ['stato_nascita','stato_residenza'])if(row[f]&&row[f].length>15)errors.push(f+' troppo lungo');
  if(row.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))errors.push('Email non valida');
 }else{
  if(!IMPORT_EDITION_UUID.test(row.edizione_id??''))errors.push('ID edizione non valido');
  if(row.data_brevetto&&!realIsoDate(row.data_brevetto))errors.push('Data brevetto non valida (AAAA-MM-GG)');
 }
 return errors;
}
