import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import {structuralRpc,readAccountSnapshot,markStructuralRpcUsed,structuralQaEnabled} from '@/lib/structural-qa';

export type Stato = 'bozza'|'inviata'|'in_verifica'|'integrazione_richiesta'|'approvata'|'respinta';
export const statoLabel: Record<Stato,string> = {
  bozza:'Bozza', inviata:'Da verificare', in_verifica:'In verifica',
  integrazione_richiesta:'Integrazione richiesta', approvata:'Approvata', respinta:'Respinta',
};
export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  // Date-only fields are calendar dates; instants must be displayed in Italy,
  // regardless of the timezone of the Next.js server.
  const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(value);
  const date=new Date(dateOnly?`${value}T12:00:00Z`:value);
  if(!Number.isFinite(date.getTime())||(dateOnly&&date.toISOString().slice(0,10)!==value))return '—';
  return date.toLocaleDateString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric'});
}
export function queryMessage(search?: string) {
  const values: Record<string,string> = {
    privacy:'Apri l’informativa e conferma la presa visione per registrarti.',
    instradamento:'Accesso effettuato, ma non è stato possibile aprire la tua area. Riprova o contatta la segreteria.',
    credenziali:'Email o password non corrette.',
    registrazione:'Impossibile completare la registrazione. Verifica i dati o riprova.',
    password:'La password deve avere almeno 10 caratteri e corrispondere alla conferma.',
    account:'Accedi per continuare. Se la sessione è scaduta, inserisci nuovamente le credenziali.',
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
    uscita_non_riuscita:'Disconnessione non completata. Riprova dal menu Account.',
    recupero_scaduto:'Collegamento di recupero non valido o scaduto. Richiedine uno nuovo dalla pagina Accedi.',
    inviata:'Domanda inviata correttamente alla segreteria.',
    salvata:'Bozza salvata.',
    presa:'Domanda presa in carico.',
    approvata:'Domanda approvata e anagrafica collegata.',
    integrazione:'Richiesta di integrazione registrata.',
    respinta:'Domanda respinta.',
    recupero:'Se l’account esiste, riceverai un messaggio per recuperare la password.',
  };
  return typeof search==='string'&&Object.hasOwn(values,search)?values[search]:'';
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

/** RSC render only. React cache is scoped to the current server request.
 * Never call these helpers from mutations or route handlers.
 * The original guards below/above remain uncached for those callers. */
export const readAccountForRender=cache(async()=>{
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return {supabase,user:null,status:'guest' as const,snapshot:null};
 const snapshot=readAccountSnapshot(await structuralRpc(supabase,'sc_perf_navigation',{}));
 if(snapshot){markStructuralRpcUsed('navigation-account');return {supabase,user,status:snapshot.enabled?'enabled' as const:'disabled' as const,snapshot};}
 const {data:enabled,error:statusError}=await supabase.rpc('account_corrente_abilitato');
 return {supabase,user,status:statusError||enabled!==true?'disabled' as const:'enabled' as const,snapshot:null};
});
export const readRolesForRender=cache(async(supabase:Awaited<ReturnType<typeof createClient>>,userId:string)=>{
 if(structuralQaEnabled()){
  const account=await readAccountForRender();
  if(account.supabase===supabase&&account.user?.id===userId&&account.status==='enabled'&&account.snapshot?.enabled)return {data:account.snapshot.roles.map(ruolo=>({ruolo})),error:null};
 }
 return await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',userId);
});
export const requireUserForRender=cache(async()=>{
 const account=await readAccountForRender();
 if(account.status==='guest'||!account.user)redirect('/accedi?msg=account');
 if(account.status!=='enabled')redirect('/accedi?msg=account_disattivato');
 return {supabase:account.supabase,user:account.user};
});
export const requireStaffForRender=cache(async()=>{
 const {supabase,user}=await requireUserForRender();
 const {data,error}=await readRolesForRender(supabase,user.id);
 if(error||!data?.some(item=>['amministratore','segreteria'].includes(item.ruolo)))redirect('/?msg=permessi');
 return {supabase,user};
});

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
