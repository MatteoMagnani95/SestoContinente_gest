import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/security';
export default async function Smista() {
  const { supabase, user } = await requireUser();
  const { data: roles } = await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id);
  if (roles?.some(role => ['amministratore','segreteria'].includes(role.ruolo))) redirect('/gestionale');
  const { data: request } = await supabase.from('richieste').select('id,stato').eq('utente_id',user.id).maybeSingle();
  if (roles?.some(role => role.ruolo==='istruttore')) redirect('/istruttore');
  if (request?.stato === 'approvata') redirect('/area-personale');
  const {count:linked} = await supabase.from('collegamenti_persone').select('persona_id',{count:'exact',head:true}).eq('utente_id',user.id);
  if ((linked??0)>0) redirect('/area-personale');
  if (request) redirect('/richiesta/stato');
  redirect('/richiesta/nuova');
}
