// Calcolo teorico interno del CF per il solo confronto. Non assegna il CF ufficiale.
// Il codice Belfiore è individuato tramite verifica-anagrafica e archivio dei luoghi.
const mesi='ABCDEHLMPRST';
const pari='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const dispari=[1,0,5,7,9,13,15,17,19,21,1,0,5,7,9,13,15,17,19,21,2,4,18,20,11,3,6,8,12,14,16,10,22,25,24,23];
const omocodia:Record<string,string>={L:'0',M:'1',N:'2',P:'3',Q:'4',R:'5',S:'6',T:'7',U:'8',V:'9'};
const posOmocodia=[6,7,9,10,12,13,14];
const letters=(value:string)=>value.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z]/g,'');
function surname(value:string){const s=letters(value),c=s.replace(/[AEIOU]/g,''),v=s.replace(/[^AEIOU]/g,'');return (c+v+'XXX').slice(0,3);}
function firstname(value:string){const s=letters(value),c=s.replace(/[AEIOU]/g,''),v=s.replace(/[^AEIOU]/g,'');return (c.length>=4?c[0]+c[2]+c[3]:(c+v+'XXX').slice(0,3));}
export function controlloCF(partial:string){
 if(!/^[A-Z0-9]{15}$/.test(partial))throw Error('Parte fiscale non valida');
 const n=Array.from(partial).reduce((sum,ch,i)=>{
  const idx=pari.indexOf(ch);
  if(idx<0)throw Error('Carattere non valido');
  const even=/^[0-9]$/.test(ch)?Number(ch):ch.charCodeAt(0)-65;
  return sum+(i%2===0?dispari[idx]:even);
 },0);
 return String.fromCharCode(65+n%26);
}
export function validaCF(code:string){const cf=code.trim().toUpperCase();return /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf)&&controlloCF(cf.slice(0,15))===cf[15];}
export type DatiCF={nome:string;cognome:string;data_nascita:string;sesso_cf:string;codice_catastale_nascita:string};
export function generaCF(d:DatiCF){
 const date=/^\d{4}-\d{2}-\d{2}$/.test(d.data_nascita)?new Date(`${d.data_nascita}T12:00:00Z`):null;
 if(!date||Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==d.data_nascita||
 !['M','F'].includes(d.sesso_cf)||!/^[A-Z][0-9]{3}$/.test(d.codice_catastale_nascita.toUpperCase())||!letters(d.nome)||!letters(d.cognome))
 throw Error('Per generare il CF servono nome, cognome, data, sesso anagrafico e codice catastale ufficiale.');
 const m=date.getUTCMonth(),day=date.getUTCDate()+(d.sesso_cf==='F'?40:0);
 const base=surname(d.cognome)+firstname(d.nome)+String(date.getUTCFullYear()).slice(-2)+mesi[m]+String(day).padStart(2,'0')+d.codice_catastale_nascita.toUpperCase();
 return base+controlloCF(base);
}
export function confrontaCF(cf:string,d:DatiCF){
 if(!validaCF(cf))return 'Codice fiscale con formato o carattere di controllo non valido';
 try{
  const expected=generaCF(d);
  const clean=cf.toUpperCase().trim();
  const norm=Array.from(clean.slice(0,15)).map((c,i)=>posOmocodia.includes(i)?(omocodia[c]??c):c).join('');
  return norm===expected.slice(0,15)?(clean.slice(0,15)===expected.slice(0,15)?'':'Omocodia: confermare la verifica con documentazione'):'Il CF non coincide con i dati anagrafici.';
 }catch{return 'Dati anagrafici incompleti: impossibile verificare il CF';}
}
