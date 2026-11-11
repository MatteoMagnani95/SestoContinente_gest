import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/security';
export default async function Smista() {
  const { supabase, user } = await requireUser();
  const { data: roles } = await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id);
  if (roles?.some(role => ['amministratore','segreteria'].includes(role.ruolo))) redirect('/gestionale');
  const { data: request } = await supabase.from('richieste').select('id,stato').eq('utente_id',user.id).maybeSingle();
  if (request?.stato === 'approvata') redirect('/area-personale');
  if (request) redirect('/richiesta/stato');
  redirect('/richiesta/nuova');
}
