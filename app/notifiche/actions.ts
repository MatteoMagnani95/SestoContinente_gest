'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/security';

export async function markAccountNotification(form:FormData){
 const {supabase,user}=await requireUser();
 const p_id=String(form.get('id')??'');
 if(!/^[0-9a-f-]{36}$/i.test(p_id))redirect('/notifiche?msg=errore');
 const {data:owned,error:ownershipError}=await supabase.from('notifiche').select('id').eq('id',p_id).eq('utente_id',user.id).maybeSingle();
 if(ownershipError||!owned)redirect('/notifiche?msg=errore');
 // A lost response can follow a committed update. Confirm the persisted
 // result under the same ownership restriction instead of reporting a false error.
 await supabase.rpc('segna_notifica_letta',{p_id});
 const {data:notification,error:readError}=await supabase.from('notifiche').select('letta_il').eq('id',p_id).eq('utente_id',user.id).maybeSingle();
 revalidatePath('/notifiche');revalidatePath('/area-personale');
 redirect('/notifiche?msg='+(readError||!notification?.letta_il?'errore':'letta'));
}
