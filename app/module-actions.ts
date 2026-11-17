'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
import {modules,isModuleKey,type Field,type Module} from '@/lib/modules';
import {italianLocalToISO} from '@/lib/format';
import {identityFromForm,validaSalvataggioAnagrafica} from '@/lib/verifica-anagrafica';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const errorPath=(key:string,code:string)=>`/gestionale/moduli/${encodeURIComponent(key)}?msg=${code}`;
export async function saveModuleRecord(form:FormData) {
 const key=text(form,'modulo');
 if(!isModuleKey(key)) redirect('/gestionale?msg=permessi');
 if(key==='pagamenti') redirect('/gestionale/incassi');
 const module:Module=modules[key];
 const {supabase,user}=await requireStaff();
 if(module.adminOnly){
  const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','amministratore').maybeSingle();
  if(!data) redirect('/gestionale?msg=permessi');
 }
 const id=text(form,'id');
 if(id && (!uuid.test(id)||module.appendOnly)) redirect(errorPath(key,'permessi'));
 const changes:Record<string,unknown>={};
 for(const field of module.fields) {
  const raw=text(form,field.name);
  if(field.type==='checkbox') {changes[field.name]=form.get(field.name)==='on';continue;}
  if(field.required&&!raw) redirect(errorPath(key,'dati'));
  if(!raw){changes[field.name]=null;continue;}
  if(raw.length>8000) redirect(errorPath(key,'dati'));
  if(field.options&&!field.options.includes(raw)) redirect(errorPath(key,'dati'));
  if(field.type==='reference'&&!uuid.test(raw)) redirect(errorPath(key,'dati'));
  if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) redirect(errorPath(key,'dati'));
  if(field.type==='days'){
   const values=raw.split(',').map(x=>x.trim());
   if(values.length<1||values.length>10||values.some(x=>!/^\d{1,3}$/.test(x)))redirect(errorPath(key,'dati'));
   const days=[...new Set(values.map(Number))];
   if(days.some(x=>x>365))redirect(errorPath(key,'dati'));
   changes[field.name]=days.sort((a,b)=>b-a);continue;
  }
  if(field.type==='number'){
   const num=Number(raw.replace(',','.'));
   if(!Number.isFinite(num)||(field.min!==undefined&&num<field.min)||(field.step==='1'&&!Number.isInteger(num)))
    redirect(errorPath(key,'dati'));
   changes[field.name]=num;continue;
  }
  if(field.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(raw))redirect(errorPath(key,'dati'));
  if(field.type==='datetime'){
   try{changes[field.name]=italianLocalToISO(raw);}catch{redirect(errorPath(key,'dati'));}
   continue;
  }
  changes[field.name]=raw;
 }
 if(key==='anagrafiche') {
  for(const fld of ['provincia_nascita','provincia_residenza']) {
   const val=String(changes[fld]??'').toUpperCase();
   if(val&&!/^[A-Z]{2}$/.test(val))redirect(errorPath(key,'dati'));
   changes[fld]=val||null;
  }
  for(const fld of ['stato_nascita','stato_residenza']){
   const val=String(changes[fld]??'');
   if(val.length>(fld==='stato_nascita'?100:15))redirect(errorPath(key,'dati'));
   changes[fld]=val?val[0].toUpperCase()+val.slice(1).toLowerCase():null;
  }
  let previous:import('@/lib/verifica-anagrafica').Identity & {codice_catastale_nascita?:unknown;cf_omocodia_verificata?:unknown;cf_override_motivo?:unknown}|null=null;
  if(id){
   const {data,error}=await supabase.from('persone').select('nome,cognome,data_nascita,luogo_nascita,provincia_nascita,stato_nascita,sesso_cf,codice_fiscale,codice_catastale_nascita,cf_omocodia_verificata,cf_override_motivo').eq('id',id).single();
   if(error||!data)redirect(errorPath(key,'database'));
   previous=data;
  }
  const check=await validaSalvataggioAnagrafica(identityFromForm(form),previous,form.get('cf_omocodia_verificata')==='on',text(form,'cf_override_motivo'));
  if(check.error)redirect(errorPath(key,check.error));
  changes.codice_catastale_nascita=check.code;
  changes.cf_omocodia_verificata=check.omocodia;
  changes.cf_override_motivo=check.reason;
  changes.codice_fiscale=String(changes.codice_fiscale??'').toUpperCase()||null;
 }
 if(key==='istruttori'){
  const person=String(changes.persona_id??'');
  const {data:qualified}=await supabase.from('qualifiche_istruttori').select('id').eq('persona_id',person).limit(1);
  if(!qualified?.length)redirect(errorPath(key,'vincolo'));
 }
 if(key==='adesioni'&&changes.verbale_cda_id){
  const {data:verbale}=await supabase.from('cda_verbali').select('id').eq('id',String(changes.verbale_cda_id)).eq('stato','approvato').in('tipo',['Approvazione Adesioni Soci','Misto']).maybeSingle();
  if(!verbale)redirect(errorPath(key,'vincolo'));
 }
 if(key==='comunicazioni'&&!id) changes.autore_id=user.id;
 let query;
 if(id) query=supabase.from(module.table).update(changes).eq('id',id).select('id').single();
 else query=supabase.from(module.table).insert(changes).select('id').single();
 const {error}=await query;
 if(error) {
  // 23P01: violazione del vincolo PostgreSQL EXCLUDE sull'occupazione corsie.
  // Mostrare un'indicazione comprensibile senza esporre dettagli SQL.
  if(key==='prenotazioni'&&error.code==='23P01'){
   const corsiaId=String(changes.corsia_id??'');
   const {data:corsia}=await supabase.from('corsie').select('numero').eq('id',corsiaId).maybeSingle();
   const params=new URLSearchParams({msg:'corsia_occupata'});
   if(corsia?.numero!==undefined&&corsia.numero!==null)params.set('corsia',String(corsia.numero));
   if(typeof changes.inizio==='string')params.set('inizio',changes.inizio);
   if(typeof changes.fine==='string')params.set('fine',changes.fine);
   redirect(`/gestionale/moduli/${encodeURIComponent(key)}?${params.toString()}`);
  }
  if(key==='prenotazioni'&&error.code==='23505')redirect(errorPath(key,'corsia_duplicata'));
  const constraint=['23505','23P01','23503','23514'].includes(error.code??'');
  redirect(errorPath(key,constraint?'vincolo':'database'));
 }
 revalidatePath(`/gestionale/moduli/${key}`);
 revalidatePath('/gestionale');
 redirect(errorPath(key,'salvato'));
}
