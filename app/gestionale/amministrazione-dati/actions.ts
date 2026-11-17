'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/security';
import {accountUuid} from '@/lib/admin-accounts';
const value=(f:FormData,k:string)=>String(f.get(k)??'').trim();
const finish=(msg:string):never=>{revalidatePath('/gestionale/amministrazione-dati');revalidatePath('/gestionale/soci');redirect(`/gestionale/amministrazione-dati?msg=${msg}`);};
export async function manageFamilyLink(form:FormData){
 const {supabase}=await requireAdmin();const child=value(form,'minore_id'),parent=value(form,'tutore_id'),relation=value(form,'parentela'),op=value(form,'op');
 if(!accountUuid.test(child)||!accountUuid.test(parent)||child===parent||!['save','delete'].includes(op)||form.get('conferma')!=='on')finish('dati');
 if(op==='delete'){
  const {data,error}=await supabase.from('relazioni_tutori').delete().eq('minore_id',child).eq('tutore_id',parent).select('minore_id').maybeSingle();finish(error||!data?'errore':'rimosso');
 }
 if(!relation||relation.length>100)finish('dati');
 const {error}=await supabase.from('relazioni_tutori').upsert({minore_id:child,tutore_id:parent,parentela:relation},{onConflict:'minore_id,tutore_id'});finish(error?'errore':'salvato');
}
export async function removeNotification(form:FormData){
 const {supabase}=await requireAdmin();const id=value(form,'id');if(!accountUuid.test(id)||form.get('conferma')!=='on')finish('dati');
 const {data,error}=await supabase.from('notifiche').delete().eq('id',id).select('id').maybeSingle();finish(error||!data?'errore':'rimosso');
}
// Modifica solo il contenuto di notifiche già esistenti; non genera nuovi invii email.
export async function editNotification(form:FormData){
 const {supabase}=await requireAdmin();const id=value(form,'id'),title=value(form,'titolo'),message=value(form,'messaggio');
 if(!accountUuid.test(id)||!title||title.length>160||!message||message.length>4000||form.get('conferma')!=='on')finish('dati');
 const {data,error}=await supabase.from('notifiche').update({titolo:title,messaggio:message}).eq('id',id).select('id').maybeSingle();finish(error||!data?'errore':'salvato');
}
