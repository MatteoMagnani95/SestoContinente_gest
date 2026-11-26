import {requireUser} from '@/lib/security';
import {redirect} from 'next/navigation';
export async function requireEventManager(){
 const {supabase,user}=await requireUser();const {data:roles,error}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id);
 const staff=roles?.some(r=>['amministratore','segreteria'].includes(r.ruolo))??false,admin=roles?.some(r=>r.ruolo==='amministratore')??false;
 if(error||(!staff&&!roles?.some(r=>r.ruolo==='istruttore')))redirect('/smista');
 return {supabase,user,staff,admin};
}
