'use server';

import {informativaRegistrazione} from '@/lib/registrazione';
import {versioneImmagini} from '@/lib/scelte';
import {validaCF} from '@/lib/codice-fiscale';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStaff, requireUser } from '@/lib/security';
import {applicationLegalConfig,isTestApplication} from '@/lib/application-config';
import {decisionValidation,isReviewDecision,reviewError,type DecisionResult} from '@/lib/application-review';
import {identityFromForm,identityFields,verificaAnagrafica,type Identity,type CFResult} from '@/lib/verifica-anagrafica';

const asText = (form: FormData, field: string) => String(form.get(field) ?? '').trim();
// Le password sono credenziali opache: anche gli spazi sono significativi.
const passwordText = (form: FormData, field: string) => String(form.get(field) ?? '');
const go = (path: string, msg: string) => redirect(`${path}?msg=${msg}`);

export async function registerAction(form: FormData) {
  const email = asText(form, 'email').toLowerCase();
  const password = passwordText(form, 'password');
  if (!email.includes('@') || password.length < 10 || password !== passwordText(form, 'confirm')) {
    go('/registrati', 'password');
  }
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) go('/registrati', 'registrazione');
  const legal=informativaRegistrazione(),scelta=asText(form,'immagini');
  if(!legal.url||form.get('presa_visione')!=='on'||!['','si','no'].includes(scelta))go('/registrati','privacy');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data:{presa_visione:'si',versione_privacy:legal.versione,immagini:scelta,versione_immagini:legal.test?'TEST-COLLAUDO-1':versioneImmagini},emailRedirectTo: `${origin}/auth/callback?next=%2Frichiesta%2Fnuova` },
  });
  if (error) go('/registrati', 'registrazione');
  if (data.session) redirect('/smista');
  redirect('/registrati?ok=verifica');
}

export async function loginAction(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: asText(form, 'email'), password: passwordText(form, 'password'),
  });
  if (error) go('/accedi', 'credenziali');
  redirect('/smista');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/accedi?msg=uscita');
}

export async function recoverAction(form: FormData) {
  const email = asText(form, 'email');
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (origin && email) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=%2Fnuova-password`,
    });
  }
  redirect('/accedi?msg=recupero');
}

export async function newPasswordAction(form: FormData) {
  const password = passwordText(form, 'password');
  if (password.length < 10 || password !== passwordText(form, 'confirm')) go('/nuova-password','password');
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) go('/nuova-password', 'database');
  redirect('/smista');
}

export async function saveApplicationAction(form: FormData) {
  const { supabase, user } = await requireUser();
  if (!user.email_confirmed_at) return {error:'Conferma prima l’indirizzo email.'};
  const birth = asText(form, 'data_nascita');
  const send = asText(form, 'intent') === 'invia';
  if(!birth || birth<'1900-01-01'||birth>new Date().toISOString().slice(0,10))return {error:'Data di nascita non valida.'};
  const required = ['nome','cognome','luogo_nascita','indirizzo','cap','comune','telefono'];
  if (required.some(k => asText(form, k).length < 2) || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
    return {error:'Completa correttamente i dati obbligatori, inclusi quelli del tutore se necessario.'};
  }
  const minor = new Date(`${birth}T12:00:00`).getTime() >
    new Date(new Date().setFullYear(new Date().getFullYear()-18)).getTime();
  if (minor && ['nome_tutore','cognome_tutore','parentela_tutore'].some(k => !asText(form,k))) {
    return {error:'Completa correttamente i dati obbligatori, inclusi quelli del tutore se necessario.'};
  }
  const flagStatuto=form.get('flag_statuto')==='on';
  const flagPrivacy=form.get('flag_privacy')==='on';
  if(!flagStatuto||!flagPrivacy)return {error:'Conferma la presa visione di statuto e informativa privacy.'};
  const legal=applicationLegalConfig(user.id);
  if(!legal.configured)return {error:'Registrazione temporaneamente non disponibile: statuto o informativa privacy non configurati. Contatta la segreteria.'};
  const {data:prior,error:priorError}=await supabase.from('richieste').select('versione_statuto,versione_privacy').eq('utente_id',user.id).maybeSingle();
  if(priorError)return {error:'Impossibile verificare la pratica esistente.'};
  if(prior&&(prior.versione_statuto||prior.versione_privacy)&&isTestApplication(prior)!==legal.testMode)return {error:'Non è possibile convertire una pratica reale in collaudo o viceversa. Contatta la segreteria.'};
  const cf=asText(form,'codice_fiscale').toUpperCase();
  const paese=asText(form,'stato_nascita'),provincia=asText(form,'provincia_nascita').toUpperCase(),sesso=asText(form,'sesso_cf');
  if(!paese||paese.length>100||(provincia&&!/^[A-Z]{2}$/.test(provincia))||(sesso&&!['M','F'].includes(sesso)))return {error:'Completa Stato, provincia e sesso anagrafico.'};
  if(cf&&!validaCF(cf))return {error:'Controlla il formato e il carattere di controllo del codice fiscale.'};
  if(cf){const check=await verificaAnagrafica(identityFromForm(form));if(check.status==='mismatch')return {error:check.message};}
  const immagini=asText(form,'immagini');if(!['','si','no'].includes(immagini))return {error:'Scelta foto e video non valida.'};
  const payload = {
    p_nome: asText(form, 'nome'), p_cognome: asText(form, 'cognome'),
    p_data_nascita: birth, p_luogo_nascita: asText(form,'luogo_nascita'),
    p_codice_fiscale: cf, p_indirizzo: asText(form,'indirizzo'),
    p_provincia_nascita:provincia||null,p_stato_nascita:paese,p_sesso_cf:sesso||null,p_emergenza_nome:asText(form,'emergenza_nome'),p_emergenza_telefono:asText(form,'emergenza_telefono'),
    p_cap: asText(form,'cap'), p_comune: asText(form,'comune'), p_telefono: asText(form,'telefono'),
    p_nome_tutore: asText(form,'nome_tutore'), p_cognome_tutore: asText(form,'cognome_tutore'),
    p_parentela_tutore: asText(form,'parentela_tutore'),
    p_flag_statuto:flagStatuto,p_flag_privacy:flagPrivacy,p_flag_immagini:immagini===''?null:immagini==='si',p_versione_immagini:legal.testMode?'TEST-COLLAUDO-1':versioneImmagini,
    p_versione_statuto:legal.statutoVersion,
    p_versione_privacy:legal.privacyVersion,p_invia:send,
  };
  const { error } = await supabase.rpc('salva_domanda_v19', payload);
  if (error) {
    // Non esporre all'utente dettagli SQL o anagrafiche potenzialmente duplicate.
    console.error('salva_domanda_v19 non completata', {code:error.code});
    return {error:error.code==='PGRST202'?'Funzione di registrazione non disponibile: la segreteria deve verificare l’allineamento delle migrazioni.':error.code==='23505'?'Esiste già una pratica o un record con questi dati. Contatta la segreteria.':error.code==='23514'?'Uno o più dati non rispettano i requisiti della domanda.':error.code==='42501'?'La sessione non è autorizzata a salvare questa domanda.': 'Domanda non salvata. Verifica i dati e lo stato della pratica; se persiste, contatta la segreteria.'};
  }
  revalidatePath('/richiesta/stato');
  return {next:`/richiesta/stato?msg=${send ? 'inviata' : 'salvata'}`};
}

export async function takeApplicationAction(form: FormData) {
  const { supabase } = await requireStaff();
  const id = asText(form, 'id');
  const { error } = await supabase.rpc('prendi_in_carico', { p_id: id });
  if (error) go('/gestionale/richieste', 'stato');
  revalidatePath('/gestionale/richieste');
  redirect(`/gestionale/richieste/${id}?msg=presa`);
}

export async function decideApplicationAction(form: FormData): Promise<DecisionResult> {
  const { supabase } = await requireStaff();
  const id = asText(form, 'id');
  const action = asText(form, 'action');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return {error:'Riferimento della pratica non valido.'};
  const message = asText(form,'messaggio');
  const internal = asText(form,'motivo_interno');
  const confirmed = form.get('verifiche_confermate') === 'on';
  const validation = decisionValidation(action,confirmed,message,internal);
  if(validation || !isReviewDecision(action)) return {error:validation??'Seleziona una decisione valida.'};
  const { error } = await supabase.rpc('valuta_domanda', {
    p_id: id, p_esito: action, p_messaggio: message || null, p_nota_interna: internal || null,
    p_verifiche_confermate: confirmed,
  });
  if (error) {
    const mapped=reviewError(error);
    const reference=id.slice(0,8).toUpperCase();
    // Do not log raw SQL errors, application data, consents or internal notes.
    console.error('valuta_domanda non completata',{pratica:reference,esito:action,code:error.code,reason:mapped.key});
    return {error:`${mapped.message} (Pratica ${reference})`};
  }
  revalidatePath('/gestionale/richieste');
  revalidatePath(`/gestionale/richieste/${id}`);
  revalidatePath('/gestionale/soci');
  revalidatePath('/richiesta/stato');
  return {next:`/gestionale/richieste/${id}?msg=${action}`};
}

// Authenticated lookup on the server, with the same data and algorithm used at submission.
export async function checkIdentityAction(input:Identity):Promise<CFResult>{
 const client=await createClient();const {data:{user}}=await client.auth.getUser();
 if(!user)return {status:'unavailable',code:null,message:'Sessione scaduta: accedi di nuovo.'};
 const identity=Object.fromEntries(identityFields.map(k=>[k,String(input?.[k]??'').trim().slice(0,250)]));
 return verificaAnagrafica(identity);
}
