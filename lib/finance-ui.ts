import {validPaymentDate} from './payment-tools';
export const money=(v:number|string)=>Number(v).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
export function cents(v:number|string){const n=Number(v);if(!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n*100)))throw Error('Importo non valido');return BigInt(Math.round(n*100));}
export function balanceTotals(rows:{importo_dovuto:number|string;versato:number|string;residuo:number|string}[]){let due=BigInt(0),paid=BigInt(0),residue=BigInt(0),settled=0;for(const r of rows){due+=cents(r.importo_dovuto);paid+=cents(r.versato);const rem=cents(r.residuo);residue+=rem;if(rem===BigInt(0))settled++;}return {due:Number(due)/100,paid:Number(paid)/100,residue:Number(residue)/100,settled,open:rows.length-settled};}
export const dateFilter=(v?:string)=>v&&validPaymentDate(v)?v:'';
export const methodLabel=(s:string|null)=>s==='bonifico'?'Bonifico bancario':s==='contanti'?'Cassa':s==='pos'?'POS':s||'Non indicata';
export function fillMonths(year:number,rows:{mese:string;entrate:number|string;uscite:number|string;saldo:number|string}[]){return Array.from({length:12},(_,i)=>{const mese=year+'-'+String(i+1).padStart(2,'0');return {...(rows.find(m=>m.mese===mese)??{mese,entrate:0,uscite:0,saldo:0}),label:new Intl.DateTimeFormat('it-IT',{month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(year,i,1)))};});}
export function movementTotals(rows:{tipo:string;importo:string|number}[]){let incoming=BigInt(0),outgoing=BigInt(0);for(const r of rows){if(r.tipo==='entrata')incoming+=cents(r.importo);else if(r.tipo==='uscita')outgoing+=cents(r.importo);else throw Error('Tipo non valido');}return {entrate:Number(incoming)/100,uscite:Number(outgoing)/100,saldo:Number(incoming-outgoing)/100,count:rows.length};}

export type MovementFilter={dal:string;al:string;tipo:string;categoria:string;metodo:string;origine:string;q:string};
export function movementFilter(s:{dal?:string;al?:string;tipo?:string;categoria?:string;metodo?:string;origine?:string;q?:string}):MovementFilter{
 const text=(x?:string)=>String(x??'').trim().slice(0,150);
 return {dal:dateFilter(s.dal),al:dateFilter(s.al),tipo:['entrata','uscita'].includes(s.tipo??'')?s.tipo!:'',categoria:text(s.categoria),metodo:text(s.metodo),origine:['manuale','automatico'].includes(s.origine??'')?s.origine!:'',q:text(s.q).replace(/[%_\\]/g,'')};
}
