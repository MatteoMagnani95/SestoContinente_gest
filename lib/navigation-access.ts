import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { accountFirstName, guestAccess, type NavigationAccess } from '@/lib/navigation';
/** Presentation only: never use this as a replacement for requireUser/Staff/Admin/Board or RLS. */
export const getNavigationAccess=cache(async():Promise<NavigationAccess>=>{
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return guestAccess;
 const {data:enabled,error:enableError}=await supabase.rpc('account_corrente_abilitato');
 if(enableError||enabled!==true)return {...guestAccess,signedIn:true};
 const [roles,member,request,links]=await Promise.all([
  supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id),
  supabase.rpc('area_soci_accesso'),
  supabase.from('richieste').select('stato').eq('utente_id',user.id).maybeSingle(),
  supabase.from('collegamenti_persone').select('persona_id',{count:'exact',head:true}).eq('utente_id',user.id)
 ]);
 const allowed=new Set(roles.error?[]:(roles.data??[]).map(r=>r.ruolo));
 const admin=allowed.has('amministratore'),staff=admin||allowed.has('segreteria');
 const personal=!request.error&&!links.error&&(request.data?.stato==='approvata'||(links.count??0)>0);
 const [alerts,owners]=await Promise.all([personal?supabase.from('notifiche').select('id',{head:true,count:'exact'}).eq('utente_id',user.id).is('letta_il',null):null,supabase.from('collegamenti_persone').select('persona_id').eq('utente_id',user.id).eq('relazione','titolare').limit(2)]);
 const ownerIds=owners.error?[]:(owners.data??[]).map(r=>r.persona_id);
 const owner=ownerIds.length===1?await supabase.from('persone').select('nome,cognome').eq('id',ownerIds[0]).maybeSingle():null;
 const firstName=owner&&!owner.error&&owner.data?accountFirstName([owner.data]):undefined;
 const surname=firstName&&typeof owner?.data?.cognome==='string'?owner.data.cognome.trim():'';
 const lastInitial=/^\p{L}/u.test(surname)?Array.from(surname)[0]:undefined;
 return {signedIn:true,enabled:true,staff,admin,instructor:allowed.has('istruttore'),board:staff||allowed.has('consigliere_cda'),personal,member:!member.error&&member.data===true,unread:alerts&&!alerts.error?alerts.count:null,firstName,lastInitial};
});
