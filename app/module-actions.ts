'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/lib/security';
import {modules,isModuleKey,type Field,type Module} from '@/lib/modules';
import {italianLocalToISO} from '@/lib/format';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const errorPath=(key:string,code:string)=>`/gestionale/moduli/${encodeURIComponent(key)}?msg=${code}`;
export async function saveModuleRecord(form:FormData) {
 const key=text(form,'modulo');
 if(!isModuleKey(key)) redirect('/gestionale?msg=permessi');
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
 if(key==='comunicazioni'&&!id) changes.autore_id=user.id;
 let query;
 if(id) query=supabase.from(module.table).update(changes).eq('id',id).select('id').single();
 else query=supabase.from(module.table).insert(changes).select('id').single();
 const {error}=await query;
 if(error) {
  const constraint=['23505','23P01','23503','23514'].includes(error.code??'');
  redirect(errorPath(key,constraint?'vincolo':'database'));
 }
 revalidatePath(`/gestionale/moduli/${key}`);
 revalidatePath('/gestionale');
 redirect(errorPath(key,'salvato'));
}
