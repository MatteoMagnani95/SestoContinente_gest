import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/security';
export default async function Smista() {
  const { supabase, user } = await requireUser();
  const { data: roles, error: rolesError } = await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id);
  if (rolesError) redirect('/?msg=instradamento');
  if (roles?.some(role => ['amministratore','segreteria'].includes(role.ruolo))) redirect('/gestionale');
  if (roles?.some(role => role.ruolo==='consigliere_cda')) redirect('/organi-sociali');
  if (roles?.some(role => role.ruolo==='istruttore')) redirect('/istruttore');
  const { data: request, error: requestError } = await supabase.from('richieste').select('id,stato').eq('utente_id',user.id).maybeSingle();
  if (requestError) redirect('/?msg=instradamento');
  if (request?.stato === 'approvata') redirect('/area-personale');
  const {count:linked,error:linksError} = await supabase.from('collegamenti_persone').select('persona_id',{count:'exact',head:true}).eq('utente_id',user.id);
  if (linksError || linked===null) redirect('/?msg=instradamento');
  if ((linked??0)>0) redirect('/area-personale');
  if (request) redirect('/richiesta/stato');
  redirect('/richiesta/nuova');
}
