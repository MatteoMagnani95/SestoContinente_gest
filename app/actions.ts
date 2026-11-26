'use server';

import {validBirthDate,minorAge,imageChoice} from '@/lib/application-input';
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
  if (!email.includes('@'))return {error:'Inserisci un indirizzo email valido.',field:'email'};
  if (password.length < 10 || password !== passwordText(form, 'confirm')) {
    return {error:'La password deve avere almeno 10 caratteri e corrispondere alla conferma.',field:'password'};
  }
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) return {error:'Registrazione temporaneamente non disponibile. Contatta la segreteria.'};
  const legal=informativaRegistrazione(),scelta=imageChoice(form);
  if(asText(form,'privacy_versione_vista')!==legal.versione||asText(form,'immagini_versione_vista')!==(legal.test?'TEST-COLLAUDO-1':versioneImmagini))return {error:'L’informativa è stata aggiornata. Ricarica la registrazione e leggila nuovamente.'};
  if(!legal.url||form.get('presa_visione')!=='on'||!['','si','no'].includes(scelta))return {error:'Apri l’informativa e conferma la presa visione.',field:'presa_visione'};
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data:{presa_visione:'si',versione_privacy:legal.versione,immagini:scelta,versione_immagini:legal.test?'TEST-COLLAUDO-1':versioneImmagini},emailRedirectTo: `${origin}/auth/callback?next=%2Frichiesta%2Fnuova` },
  });
  if (error) return {error:'Registrazione non completata. Controlla i dati o riprova.'};
  if (data.session) redirect('/smista');
  redirect('/registrati?ok=verifica');
}

export async function loginAction(form: FormData) {
  const supabase = await createClient();
  const { data,error } = await supabase.auth.signInWithPassword({
    email: asText(form, 'email').toLowerCase(), password: passwordText(form, 'password'),
  });
  if (error) return {error:error.code==='email_not_confirmed'?'Verifica prima la tua email. Puoi richiedere un nuovo messaggio nella pagina Accedi.':'Email o password non corrette, oppure accesso temporaneamente non disponibile.'};
  if(!data?.session)return {error:'Accesso temporaneamente non disponibile. Riprova.'};
  // Il redirect Next.js lancia un segnale che un catch del form può scambiare
  // per un errore. Restituiamo invece un esito esplicito dopo il login riuscito.
  return {next:'/smista' as const};
}

export async function logoutAction() {
  const supabase = await createClient();
  const {error}=await supabase.auth.signOut();
  if(error)redirect('/?msg=uscita_non_riuscita');
  redirect('/accedi?msg=uscita');
}

export async function recoverAction(form: FormData) {
  const email = asText(form, 'email').toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return {error:'Controlla l’indirizzo email.',field:'email'};
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  let callback: URL;
  try {
    if(!origin)throw new Error('missing-site-url');
    const site = new URL(origin);
    if(site.username||site.password||(site.protocol!=='https:'&&!(site.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(site.hostname))))throw new Error('invalid-site-url');
    callback=new URL('/auth/callback?next=%2Fnuova-password',site.origin);
  } catch {
    return {error:'Recupero password temporaneamente non disponibile. Contatta la segreteria.'};
  }
  // Non distinguere account esistenti, mancanti o rifiutati dal provider.
  // Non registrare indirizzi email, token o il testo dell'errore del provider.
  try {
    const supabase=await createClient();
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:callback.href});
    if(error)console.warn('[auth.recovery] richiesta non completata',{code:typeof error.code==='string'&&/^[a-z0-9_]{1,80}$/.test(error.code)?error.code:'unknown',status:typeof error.status==='number'?error.status:undefined});
  } catch {
    console.warn('[auth.recovery] errore di comunicazione con il servizio di autenticazione');
  }
  return {notice:'Se l’account esiste e l’invio va a buon fine, riceverai un messaggio per recuperare la password. Controlla la posta indesiderata e apri il collegamento nello stesso browser e dispositivo usati per questa richiesta. Se non ricevi il messaggio, verifica l’indirizzo e riprova dopo qualche minuto oppure contatta la segreteria.'};
}

export async function resendVerificationAction(form:FormData){
 const email=asText(form,'email');const origin=process.env.NEXT_PUBLIC_SITE_URL;
 if(!origin||!email.includes('@'))return {error:'Controlla l’indirizzo email.'};
 const supabase=await createClient();
 await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:origin+'/auth/callback?next=%2Frichiesta%2Fnuova'}});
 return {notice:'Se l’account richiede una verifica e la richiesta è stata accettata, riceverai un nuovo messaggio.'};
}

export async function newPasswordAction(form: FormData) {
  const password = passwordText(form, 'password');
  if (password.length < 10 || password !== passwordText(form, 'confirm')) return {error:'La password deve avere almeno 10 caratteri e corrispondere alla conferma.',field:'password'};
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return {error:'Password non aggiornata. Richiedi un nuovo collegamento di recupero se necessario.'};
  redirect('/smista');
}

export async function saveApplicationAction(form: FormData) {
  const { supabase, user } = await requireUser();
  if (!user.email_confirmed_at) return {error:'Conferma prima l’indirizzo email.'};
  const birth = asText(form, 'data_nascita');
  const send = asText(form, 'intent') === 'invia';
  if(!validBirthDate(birth))return {error:'Data di nascita non valida.',field:'data_nascita'};
  const required = ['nome','cognome','luogo_nascita','indirizzo','cap','comune','telefono'];
  const missing=required.find(k=>asText(form,k).length<(k==='telefono'?5:k==='cap'?4:2));
  if(missing)return {error:'Completa correttamente i dati obbligatori.',field:missing};
  if(asText(form,'cap').length>10)return {error:'Controlla il CAP.',field:'cap'};
  const minor = minorAge(birth);
  if (minor && (['nome_tutore','cognome_tutore'].some(k => asText(form,k).length<2)||!['Madre','Padre','Tutore legale'].includes(asText(form,'parentela_tutore')))) {
    return {error:'Completa correttamente i dati obbligatori, inclusi quelli del tutore se necessario.'};
  }
  const flagStatuto=form.get('flag_statuto')==='on';
  const flagPrivacy=form.get('flag_privacy')==='on';
  if(!flagStatuto||!flagPrivacy)return {error:'Conferma la presa visione di statuto e informativa privacy.'};
  const legal=applicationLegalConfig(user.id);
  if(!legal.configured)return {error:'Registrazione temporaneamente non disponibile: statuto o informativa privacy non configurati. Contatta la segreteria.'};
  if(asText(form,'statuto_versione_vista')!==legal.statutoVersion||asText(form,'privacy_versione_vista')!==legal.privacyVersion||asText(form,'immagini_versione_vista')!==(legal.testMode?'TEST-COLLAUDO-1':versioneImmagini))return {error:'I documenti sono stati aggiornati. Ricarica la domanda e conferma nuovamente la presa visione.'};
  const {data:prior,error:priorError}=await supabase.from('richieste').select('versione_statuto,versione_privacy').eq('utente_id',user.id).maybeSingle();
  if(priorError)return {error:'Impossibile verificare la pratica esistente.'};
  if(prior&&(prior.versione_statuto||prior.versione_privacy)&&isTestApplication(prior)!==legal.testMode)return {error:'Non è possibile convertire una pratica reale in collaudo o viceversa. Contatta la segreteria.'};
  const cf=asText(form,'codice_fiscale').toUpperCase();
  const paese=asText(form,'stato_nascita'),provincia=asText(form,'provincia_nascita').toUpperCase(),sesso=asText(form,'sesso_cf');
  if(!paese||paese.length>100||(provincia&&!/^[A-Z]{2}$/.test(provincia))||(sesso&&!['M','F'].includes(sesso)))return {error:'Completa Stato, provincia e sesso anagrafico.'};
  if(cf&&!validaCF(cf))return {error:'Controlla il formato e il carattere di controllo del codice fiscale.',field:'codice_fiscale'};
  if(cf){const check=await verificaAnagrafica(identityFromForm(form));if(check.status==='mismatch')return {error:check.message,field:'codice_fiscale'};}
  const immagini=imageChoice(form);const sceltaAttesa=asText(form,'immagini_scelta_attesa');
  if(!['si','no'].includes(immagini)||!form.has('immagini_scelta_attesa')||(sceltaAttesa&&!/^[1-9]\d{0,18}$/.test(sceltaAttesa)))return {error:'Scelta foto e video non verificabile. Ricarica la domanda.'};
  const payload = {
    p_nome: asText(form, 'nome'), p_cognome: asText(form, 'cognome'),
    p_data_nascita: birth, p_luogo_nascita: asText(form,'luogo_nascita'),
    p_codice_fiscale: cf, p_indirizzo: asText(form,'indirizzo'),
    p_provincia_nascita:provincia||null,p_stato_nascita:paese,p_sesso_cf:sesso||null,p_emergenza_nome:asText(form,'emergenza_nome'),p_emergenza_telefono:asText(form,'emergenza_telefono'),
    p_cap: asText(form,'cap'), p_comune: asText(form,'comune'), p_telefono: asText(form,'telefono'),
    p_nome_tutore: minor?asText(form,'nome_tutore'):'', p_cognome_tutore: minor?asText(form,'cognome_tutore'):'',
    p_parentela_tutore: minor?asText(form,'parentela_tutore'):'',
    p_flag_statuto:flagStatuto,p_flag_privacy:flagPrivacy,p_flag_immagini:immagini==='si',p_scelta_attesa:sceltaAttesa||null,p_versione_immagini:legal.testMode?'TEST-COLLAUDO-1':versioneImmagini,
    p_versione_statuto:legal.statutoVersion,
    p_versione_privacy:legal.privacyVersion,p_invia:send,
  };
  const { error } = await supabase.rpc('salva_domanda_v20', payload);
  if (error) {
    // Non esporre all'utente dettagli SQL o anagrafiche potenzialmente duplicate.
    console.error('salva_domanda_v20 non completata', {code:error.code});
    return {error:error.code==='P3508'?'La scelta foto e video è cambiata. Ricarica la domanda prima di confermarla.':error.code==='P3509'?'Le dichiarazioni di prova e reali non possono essere mescolate.':error.code==='PGRST202'?'Salvataggio temporaneamente non disponibile. Contatta la segreteria.':error.code==='23505'?'Esiste già una pratica con questi dati. Contatta la segreteria.':error.code==='23514'?'Uno o più dati non rispettano i requisiti della domanda.':error.code==='42501'?'La sessione non è autorizzata a salvare questa domanda.': 'Domanda non salvata. Verifica i dati e lo stato della pratica; se persiste, contatta la segreteria.'};
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
