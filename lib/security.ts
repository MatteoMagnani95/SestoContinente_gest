import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Stato = 'bozza'|'inviata'|'in_verifica'|'integrazione_richiesta'|'approvata'|'respinta';
export const statoLabel: Record<Stato,string> = {
  bozza:'Bozza', inviata:'Da verificare', in_verifica:'In verifica',
  integrazione_richiesta:'Integrazione richiesta', approvata:'Approvata', respinta:'Respinta',
};
export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('it-IT');
}
export function queryMessage(search?: string) {
  const values: Record<string,string> = {
    privacy:'Apri l’informativa e conferma la presa visione per registrarti.',
    credenziali:'Email o password non corrette.',
    registrazione:'Impossibile completare la registrazione. Verifica i dati o riprova.',
    password:'La password deve avere almeno 10 caratteri e corrispondere alla conferma.',
    account:'Per procedere devi prima accedere.',
    account_disattivato:'Account non abilitato oppure non verificabile. Contatta la segreteria.',
    email:'Devi verificare il tuo indirizzo email prima di inviare la domanda.',
    verifica:'Non è stato possibile confermare l’email. Richiedi un nuovo messaggio di verifica.',
    cf:'Il CF inserito non coincide con i dati anagrafici oppure il luogo di nascita non è verificabile. Controlla il documento ufficiale, il Comune/Stato e la provincia.',
    domanda:'Controlla i dati obbligatori della domanda e riprova.',
    permessi:'Non hai i permessi per eseguire questa operazione.',
    stato:'Questa operazione non è consentita nello stato attuale.',
    database:'Operazione non completata. Controlla eventuali duplicati o contatta la segreteria.',
    confermata:'Indirizzo email verificato. Puoi proseguire.',
    uscita:'Hai effettuato la disconnessione.',
    inviata:'Domanda inviata correttamente alla segreteria.',
    salvata:'Bozza salvata.',
    presa:'Domanda presa in carico.',
    approvata:'Domanda approvata e anagrafica collegata.',
    integrazione:'Richiesta di integrazione registrata.',
    respinta:'Domanda respinta.',
    recupero:'Se l’account esiste, riceverai un messaggio per recuperare la password.',
  };
  return search ? (values[search] ?? '') : '';
}
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/accedi?msg=account');
  const {data:enabled,error:statusError}=await supabase.rpc('account_corrente_abilitato');
  if(statusError||enabled!==true)redirect('/accedi?msg=account_disattivato');
  return { supabase, user };
}
export async function requireStaff() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('ruoli_utente').select('ruolo').eq('utente_id', user.id);
  if (error || !data?.some(item => ['amministratore','segreteria'].includes(item.ruolo))) {
    redirect('/?msg=permessi');
  }
  return { supabase, user };
}

export async function requireBoard(){
 const {supabase,user}=await requireUser();
 const {data}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).in('ruolo',['amministratore','segreteria','consigliere_cda']);
 if(!data?.length)redirect('/?msg=permessi');
 return {supabase,user,isStaff:data.some(r=>['amministratore','segreteria'].includes(r.ruolo))};
}

export async function requireAdmin(){
 const {supabase,user}=await requireUser();
 const {data,error}=await supabase.rpc('is_admin');
 if(error||data!==true)redirect('/gestionale?msg=permessi');
 return {supabase,user};
}
