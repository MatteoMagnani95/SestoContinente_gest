'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
import {identityFromForm,validaSalvataggioAnagrafica} from '@/lib/verifica-anagrafica';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const read=(form:FormData,key:string)=>String(form.get(key)??'').trim();
const memberUrl=(id:string,msg:string)=>`/gestionale/soci/${encodeURIComponent(id)}?msg=${encodeURIComponent(msg)}`;
function optional(value:string,max:number):string|null{
 if(value.length>max)throw new Error('Campo troppo lungo');
 return value||null;
}
function optionalDate(value:string):string|null{
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Data non valida');
 const date=new Date(`${value}T12:00:00Z`);
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value||value>new Date().toISOString().slice(0,10))throw new Error('Data non valida');
 return value;
}
export async function updateMemberProfile(form:FormData){
 const {supabase}=await requireStaff();
 const id=read(form,'id');
 if(!uuid.test(id))redirect('/gestionale/soci');
 const {data:previous,error:previousError}=await supabase.from('persone').select('nome,cognome,data_nascita,luogo_nascita,provincia_nascita,stato_nascita,sesso_cf,codice_fiscale,codice_catastale_nascita,cf_omocodia_verificata,cf_override_motivo').eq('id',id).single();
 if(previousError||!previous)redirect(memberUrl(id,'errore'));
 const check=await validaSalvataggioAnagrafica(identityFromForm(form),previous,read(form,'cf_omocodia_verificata')==='on',read(form,'cf_override_motivo'));
 if(check.error)redirect(memberUrl(id,check.error));
 let changes:Record<string,string|boolean|null>;
 try{
  const nome=read(form,'nome');const cognome=read(form,'cognome');
  if(!nome||!cognome||nome.length>100||cognome.length>100)throw new Error('Nome o cognome non valido');
  const cf=read(form,'codice_fiscale').toUpperCase();
  const province=(name:string)=>{const x=read(form,name).toUpperCase();if(x&&!/^[A-Z]{2}$/.test(x))throw new Error('Provincia non valida');return x||null;};
  const country=(name:string)=>{const x=read(form,name);if(x.length>(name==='stato_nascita'?100:15))throw new Error('Stato non valido');return x?x[0].toUpperCase()+x.slice(1).toLowerCase():null;};
  const email=read(form,'email');
  if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new Error('Email non valida');
  changes={nome,cognome,codice_fiscale:cf||null,email:email||null,
   data_nascita:optionalDate(read(form,'data_nascita')),
   luogo_nascita:optional(read(form,'luogo_nascita'),150),
   indirizzo:optional(read(form,'indirizzo'),250),
   cap:optional(read(form,'cap'),10),
   comune:optional(read(form,'comune'),100),
   provincia_nascita:province('provincia_nascita'),stato_nascita:country('stato_nascita'),
   provincia_residenza:province('provincia_residenza'),stato_residenza:country('stato_residenza'),
   sesso_cf:read(form,'sesso_cf')||null,codice_catastale_nascita:check.code,
   cf_omocodia_verificata:check.omocodia,cf_override_motivo:check.reason,
   telefono:optional(read(form,'telefono'),30)};
 }catch{redirect(memberUrl(id,'dati'));}
 const {error}=await supabase.from('persone').update(changes).eq('id',id).select('id').single();
 if(error)redirect(memberUrl(id,error.code==='23505'?'duplicato':'errore'));
 revalidatePath('/gestionale/soci');
 revalidatePath(`/gestionale/soci/${id}`);
 redirect(memberUrl(id,'salvato'));
}
export async function createMemberAdhesion(form:FormData){
 const {supabase}=await requireStaff();
 const id=read(form,'id');const stagione=read(form,'stagione_id');
 if(!uuid.test(id)||!uuid.test(stagione))redirect('/gestionale/soci');
 // Non attribuisce automaticamente lo stato attivo: pagamento e tesseramento sono separati.
 const {error}=await supabase.from('adesioni').insert({persona_id:id,stagione_id:stagione,stato:'da_perfezionare'});
 if(error)redirect(memberUrl(id,error.code==='23505'?'adesione_esistente':'errore'));
 revalidatePath('/gestionale/soci');
 revalidatePath(`/gestionale/soci/${id}`);
 redirect(memberUrl(id,'adesione_creata'));
}
