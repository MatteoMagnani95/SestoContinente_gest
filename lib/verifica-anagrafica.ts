// Archivio Belfiore incorporato: nessun dato anagrafico viene inviato a servizi esterni.
// Fonti del dataset: Ministero dell'Interno e AdE (CC BY 4.0), ISTAT (CC BY 3.0).
import {generaCF,validaCF,confrontaCF} from './codice-fiscale';
export const identityFields=['nome','cognome','data_nascita','luogo_nascita','provincia_nascita','stato_nascita','sesso_cf','codice_fiscale'] as const;
export type Identity=Partial<Record<(typeof identityFields)[number],unknown>>;
const str=(v:unknown)=>String(v??'').trim();
const norm=(v:unknown)=>str(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ');
export function identityFromForm(form:FormData):Identity{return Object.fromEntries(identityFields.map(k=>[k,str(form.get(k))]));}
export function identityUnchanged(current:Identity,previous:Identity){return identityFields.every(k=>norm(current[k])===norm(previous[k]));}
export type CFResult={code:string|null;status:'ok'|'omocodia'|'mismatch'|'invalid'|'incomplete'|'place'|'unavailable'|'empty';message:string};
let loader:Promise<import('@marketto/codice-fiscale-utils').CodiceFiscaleUtils>|undefined;
async function parser(){
 if(!loader)loader=Promise.all([import('@marketto/codice-fiscale-utils'),import('@marketto/belfiore-connector-embedded')]).then(([{CodiceFiscaleUtils},connector])=>new CodiceFiscaleUtils(connector.default)).catch(e=>{loader=undefined;throw e;});
 return (await loader).parser;
}
export async function verificaAnagrafica(d:Identity):Promise<CFResult>{
 const cf=str(d.codice_fiscale).toUpperCase(),birth=str(d.data_nascita),country=norm(d.stato_nascita),province=norm(d.provincia_nascita),town=str(d.luogo_nascita),sex=norm(d.sesso_cf);
 const italy=country==='ITALIA'||country==='IT';
 const result=(status:CFResult['status'],message:string,code:string|null=null):CFResult=>({status,message,code});
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!country||(italy&&(!town||!/^[A-Z]{2}$/.test(province)||province==='EE')))return result(cf?'incomplete':'empty','Inserisci data di nascita, Comune, provincia (sigla) e Stato di nascita.');
 const date=new Date(`${birth}T12:00:00Z`);
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==birth||birth>new Date().toISOString().slice(0,10))return result('incomplete','Data di nascita non valida.');
 let code:string;
 try{
  const lookup=await parser();
  const place=italy?town:str(d.stato_nascita);
  // Le versioni del parser non trattano sempre Date e date ISO allo stesso modo.
  // Se la ricerca con data non riesce, la ricerca per nome è ammessa soltanto
  // quando il record contiene un intervallo storico che comprende la nascita.
  type Place={belfioreCode?:unknown;province?:unknown;creationDate?:unknown;expirationDate?:unknown};
  const candidates=new Set<string>();
  let completed=0;
  const timestamp=(value:unknown)=>value instanceof Date?value.getTime():typeof value==='string'?Date.parse(value):NaN;
  function accept(found:unknown,dated:boolean){
   const p=found as Place|null;
   if(!p||typeof p!=='object')return;
   const candidate=norm(p.belfioreCode);
   if(!/^[A-Z][0-9]{3}$/.test(candidate)||(italy?(norm(p.province)!==province||candidate.startsWith('Z')):!candidate.startsWith('Z')))return;
   const start=timestamp(p.creationDate),end=timestamp(p.expirationDate),when=date.getTime();
   if((Number.isFinite(start)&&when<start)||(Number.isFinite(end)&&when>end))return;
   if(!dated&&(!Number.isFinite(start)||!Number.isFinite(end)))return;
   candidates.add(candidate);
  }
  const names=Array.from(new Set([place,place.toUpperCase()]));
  for(const name of names){
   const attempts: Array<[()=>Promise<unknown>,boolean]>=[
    [()=>lookup.placeToCf(birth,name),true],
    [()=>lookup.placeToCf([date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()],name),true],
    [()=>lookup.placeToCf(date,name),true],
    [()=>lookup.placeToCf(name),false],
   ];
   for(const [attempt,dated] of attempts){
    try{const found=await attempt();completed++;accept(found,dated);}catch{/* Prova il successivo formato supportato. */}
   }
   if(candidates.size>0)break;
  }
  if(!completed)return result('unavailable','Archivio dei luoghi non disponibile: verifica non completata.');
  if(candidates.size!==1)return result('place','Comune/Stato non individuato univocamente per provincia e data. Controlla la denominazione storica.');
  code=Array.from(candidates)[0];
 }catch{return result('unavailable','Archivio dei luoghi non disponibile: verifica non completata.');}
 if(cf&&!validaCF(cf))return result('invalid','Formato o carattere di controllo del codice fiscale non valido.',code);
 if(!cf)return result('empty','Codice catastale individuato. Inserisci il codice fiscale ufficiale per verificarlo.',code);
 if(!str(d.nome)||!str(d.cognome)||!['M','F'].includes(sex))return result('incomplete','Completa nome, cognome e sesso anagrafico ai fini del CF.',code);
 const data={nome:str(d.nome),cognome:str(d.cognome),data_nascita:birth,sesso_cf:sex,codice_catastale_nascita:code};
 try{generaCF(data);}catch{return result('incomplete','Dati anagrafici non validi.',code);}
 const warning=confrontaCF(cf,data);
 return warning.startsWith('Omocodia:')?result('omocodia','Omocodia coerente: verifica il documento ufficiale e registra la motivazione.',code):warning?result('mismatch','Il CF non coincide con nome, cognome, data, sesso e luogo di nascita.',code):result('ok','Codice fiscale coerente con i dati inseriti. Non è una verifica di attribuzione ufficiale.',code);
}
// I record storici incompleti possono essere aggiornati nei recapiti senza attribuire un nuovo CF.
export async function validaSalvataggioAnagrafica(d:Identity,previous:(Identity&{codice_catastale_nascita?:unknown;cf_omocodia_verificata?:unknown;cf_override_motivo?:unknown})|null,attested:boolean,reason:string){
 const result=await verificaAnagrafica(d);
 if(previous&&identityUnchanged(d,previous)&&!['ok','omocodia'].includes(result.status))
  return {error:null,code:str(previous.codice_catastale_nascita)||result.code,omocodia:previous.cf_omocodia_verificata===true,reason:str(previous.cf_override_motivo)||null};
 if(result.status==='omocodia'&&(!attested||reason.length<8||reason.length>500))return {error:'omocodia',code:result.code,omocodia:false,reason:null};
 if(str(d.codice_fiscale)&&!['ok','omocodia'].includes(result.status))return {error:'cf',code:result.code,omocodia:false,reason:null};
 return {error:null,code:result.code,omocodia:result.status==='omocodia',reason:result.status==='omocodia'?reason:null};
}
