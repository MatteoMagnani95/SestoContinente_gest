'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/security';
const uuid=/^[0-9a-f-]{36}$/i;
export async function recordAttendance(form:FormData){
 const {supabase,user}=await requireUser();
 const {data:role}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','istruttore').maybeSingle();
 if(!role)redirect('/?msg=permessi');
 const lezione_id=String(form.get('lezione_id')??'');
 const persona_id=String(form.get('persona_id')??'');
 const presente=String(form.get('presente')??'')==='si';
 const nota_didattica=String(form.get('nota_didattica')??'').trim().slice(0,2000);
 if(!uuid.test(lezione_id)||!uuid.test(persona_id))redirect('/istruttore?msg=errore');
 const {error}=await supabase.from('presenze').upsert({lezione_id,persona_id,presente,nota_didattica},{onConflict:'lezione_id,persona_id'});
 if(error)redirect('/istruttore?msg=errore');
 revalidatePath('/istruttore');redirect('/istruttore?msg=ok');
}
