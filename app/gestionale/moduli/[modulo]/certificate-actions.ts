'use server';
import {requireStaff} from '@/lib/security';
import {createAuthAdmin} from '@/lib/supabase/admin';
import {revalidatePath} from 'next/cache';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const base='/gestionale/moduli/certificati';

export async function cambiaEsitoCertificato(id:string,documento:string,precedente:string,esito:string){
 const {supabase}=await requireStaff();
 if(!uuid.test(id)||!uuid.test(documento)||!['','valido','non_valido','in_attesa'].includes(precedente)||!['valido','non_valido','in_attesa'].includes(esito))return {error:'Dati non validi o certificato mancante.'};
 let query=supabase.from('certificati_medici').update({esito_verifica:esito}).eq('id',id).eq('documento_id',documento);
 query=precedente?query.eq('esito_verifica',precedente):query.is('esito_verifica',null);
 const {data,error}=await query.select('id').maybeSingle();
 if(error||!data)return {error:'Il certificato è cambiato o non è accessibile. Aggiorna la pagina e riprova.'};
 revalidatePath(base);revalidatePath('/area-personale');revalidatePath('/gestionale');
 return {message:'Esito salvato.'};
}

export async function sollecitaCertificatoMancante(persona:string){
 const {supabase}=await requireStaff();
 if(!uuid.test(persona))return {error:'Persona non valida.'};
 // La sessione staff deve poter leggere la persona e lo stato; nessun destinatario fornito dal browser.
 const [{data:person,error:personError},{data:missing,error:missingError},{data:records,error:recordsError}]=await Promise.all([
  supabase.from('persone').select('id').eq('id',persona).maybeSingle(),
  supabase.from('allievi_senza_certificato').select('id').eq('id',persona).maybeSingle(),
  supabase.from('stato_certificati').select('id,documento_id').eq('persona_id',persona).not('documento_id','is',null).limit(1)
 ]);
 if(personError||missingError||recordsError||!person)return {error:'Impossibile verificare il destinatario.'};
 if(records?.length)return {error:'Un documento è già presente. Aggiorna la pagina.'};
 if(!missing){
  const {data,error}=await supabase.from('stato_certificati').select('id').eq('persona_id',persona).eq('stato_certificato','mancante').limit(1);
  if(error)return {error:'Impossibile verificare il certificato.'};
  if(!data?.length){
   const {data:membership,error:membershipError}=await supabase.from('schede_soci').select('adesione_id,stagione_id').eq('persona_id',persona).in('stato',['attiva','da_perfezionare','sospesa']);
   const {data:seasons,error:seasonError}=await supabase.from('stagioni').select('id').eq('attiva',true);
   if(membershipError||seasonError||!membership?.some(m=>seasons?.some(s=>s.id===m.stagione_id)))return {error:'La persona non risulta nell’elenco dei certificati mancanti.'};
  }
 }
 const admin=createAuthAdmin();
 if(!admin)return {error:'Servizio notifiche non disponibile.'};
 const {data:links,error:linkError}=await admin.from('collegamenti_persone').select('utente_id').eq('persona_id',persona);
 if(linkError)return {error:'Impossibile individuare gli account collegati.'};
 const recipients=[...new Set((links??[]).map(l=>l.utente_id))];
 if(!recipients.length)return {error:'Nessun account collegato: contatta la persona tramite segreteria.'};
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 // Contenuto generico anche se il cron email è attivo. Deduplicazione atomica per persona/account/giorno.
 const {data,error}=await admin.from('notifiche').upsert(recipients.map(utente_id=>({utente_id,tipo:'sollecito_certificato',riferimento:persona+':'+day,titolo:'Documentazione da completare',messaggio:'Accedi alla tua area personale e controlla la documentazione richiesta dalla segreteria.'})),{onConflict:'utente_id,tipo,riferimento',ignoreDuplicates:true}).select('id');
 if(error)return {error:'Notifica non registrata. Riprova.'};
 revalidatePath('/area-personale');revalidatePath(base);
 return {message:data?.length?'Notifica registrata nell’area personale.':'Sollecito già registrato oggi.'};
}
