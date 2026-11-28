import type {SupabaseClient} from '@supabase/supabase-js';
export const MEDICAL_FILTERS=['in_attesa','in_scadenza','scaduto','mancante','non_valido','valido'] as const;
export type MedicalFilter=typeof MEDICAL_FILTERS[number];
export type MedicalRow=Record<string,unknown>&{id:string;persona_id:string;sort_nome:string;sort_cognome:string;stato_certificato:string;documento_id:string|null};
export type MedicalPerson={id:string;nome:string;cognome:string};
export function medicalDisplayState(row:MedicalRow,today:string,limit:string){
 return row.stato_certificato==='valido'&&typeof row.scade_il==='string'&&row.scade_il>=today&&row.scade_il<=limit?'in_scadenza':row.stato_certificato;
}
export function medicalDates(now=new Date()){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const end=new Date(today+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+30);
 return {today,limit:end.toISOString().slice(0,10)};
}
export function selectMedicalRoster(people:MedicalPerson[],certificates:MedicalRow[],today:string,limit:string){
 const latest=new Map<string,MedicalRow>();
 // Ultimo documento effettivamente caricato; una registrazione senza file non nasconde un documento esistente.
 for(const row of certificates){
  const old=latest.get(row.persona_id);
  if(!old||Number(Boolean(row.documento_id))>Number(Boolean(old.documento_id))||
   (Boolean(row.documento_id)===Boolean(old.documento_id)&&
    (String(row.creato_il??'')>String(old.creato_il??'')||
    (row.creato_il===old.creato_il&&row.id>old.id))))latest.set(row.persona_id,row);
 }
 return people.map(person=>{
  const cert=latest.get(person.id);
  if(cert)return {...cert,sort_nome:person.nome,sort_cognome:person.cognome,stato_certificato:medicalDisplayState(cert,today,limit)};
  return {id:person.id,persona_id:person.id,sort_nome:person.nome,sort_cognome:person.cognome,stato_certificato:'mancante',documento_id:null,senza_registrazione:true} as MedicalRow;
 }).sort((a,b)=>a.sort_cognome.localeCompare(b.sort_cognome,'it')||a.sort_nome.localeCompare(b.sort_nome,'it')||a.persona_id.localeCompare(b.persona_id));
}
export async function medicalRoster(db:SupabaseClient){
 const people=new Map<string,MedicalPerson>();
 const {data:seasons,error:seasonError}=await db.from('stagioni').select('id').eq('attiva',true);
 if(seasonError)throw Error('Stagioni non disponibili');
 const ids=(seasons??[]).map(s=>s.id);
 if(!ids.length)return [];
 // Tutte le adesioni non cessate della stagione attiva, più gli allievi iscritti ai corsi della stessa stagione.
 for(let offset=0;;offset+=500){
  const {data,error}=await db.from('schede_soci').select('adesione_id,persona_id,nome,cognome').in('stagione_id',ids).in('stato',['attiva','da_perfezionare','sospesa']).order('adesione_id').range(offset,offset+499);
  if(error)throw Error('Soci non disponibili');
  for(const p of data??[])people.set(p.persona_id,{id:p.persona_id,nome:p.nome,cognome:p.cognome});
  if((data??[]).length<500)break;
 }
 for(let offset=0;;offset+=500){
  const {data,error}=await db.from('iscrizioni_corsi').select('id,persona_id,persona:persone!inner(id,nome,cognome),edizione:edizioni_corsi!inner(stagione_id)').in('edizione.stagione_id',ids).in('stato',['in_attesa','iscritto','concluso']).order('id').range(offset,offset+499);
  if(error)throw Error('Allievi non disponibili');
  for(const p of data??[]){const person=p.persona as unknown as MedicalPerson;if(person)people.set(p.persona_id,person);}
  if((data??[]).length<500)break;
 }
 const keys=[...people.keys()],certificates:MedicalRow[]=[];
 for(let i=0;i<keys.length;i+=100){
  for(let offset=0;;offset+=500){
   const {data,error}=await db.from('stato_certificati').select('id,persona_id,documento_id,sort_nome,sort_cognome,stato_certificato,esito_verifica,idoneita_verificata,scade_il,creato_il').in('persona_id',keys.slice(i,i+100)).order('id').range(offset,offset+499);
   if(error)throw Error('Certificati non disponibili');
   certificates.push(...((data??[]) as MedicalRow[]));
   if((data??[]).length<500)break;
  }
 }
 const {today,limit}=medicalDates();
 return selectMedicalRoster([...people.values()],certificates,today,limit);
}
