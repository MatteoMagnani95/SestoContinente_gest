'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireStaff, requireUser } from '@/lib/security';

const asText = (form: FormData, field: string) => String(form.get(field) ?? '').trim();
const go = (path: string, msg: string) => redirect(`${path}?msg=${msg}`);

export async function registerAction(form: FormData) {
  const email = asText(form, 'email').toLowerCase();
  const password = asText(form, 'password');
  if (!email.includes('@') || password.length < 10 || password !== asText(form, 'confirm')) {
    go('/registrati', 'password');
  }
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) go('/registrati', 'registrazione');
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=%2Frichiesta%2Fnuova` },
  });
  if (error) go('/registrati', 'registrazione');
  redirect('/registrati?ok=verifica');
}

export async function loginAction(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: asText(form, 'email'), password: asText(form, 'password'),
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
  const password = asText(form, 'password');
  if (password.length < 10 || password !== asText(form, 'confirm')) go('/nuova-password','password');
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) go('/nuova-password', 'database');
  redirect('/smista');
}

export async function saveApplicationAction(form: FormData) {
  const { supabase, user } = await requireUser();
  if (!user.email_confirmed_at) go('/richiesta/nuova','email');
  const birth = asText(form, 'data_nascita');
  const send = asText(form, 'intent') === 'invia';
  const required = ['nome','cognome','luogo_nascita','indirizzo','cap','comune','telefono'];
  if (required.some(k => asText(form, k).length < 2) || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) {
    go('/richiesta/nuova', 'domanda');
  }
  const minor = new Date(`${birth}T12:00:00`).getTime() >
    new Date(new Date().setFullYear(new Date().getFullYear()-18)).getTime();
  if (minor && ['nome_tutore','cognome_tutore','parentela_tutore'].some(k => !asText(form,k))) {
    go('/richiesta/nuova', 'domanda');
  }
  const flagStatuto=form.get('flag_statuto')==='on';
  const flagPrivacy=form.get('flag_privacy')==='on';
  if(!flagStatuto||!flagPrivacy||!process.env.STATUTO_VERSION||!process.env.PRIVACY_VERSION||
    !process.env.NEXT_PUBLIC_STATUTO_URL||!process.env.NEXT_PUBLIC_PRIVACY_URL)go('/richiesta/nuova','domanda');
  const payload = {
    p_nome: asText(form, 'nome'), p_cognome: asText(form, 'cognome'),
    p_data_nascita: birth, p_luogo_nascita: asText(form,'luogo_nascita'),
    p_codice_fiscale: asText(form, 'codice_fiscale'), p_indirizzo: asText(form,'indirizzo'),
    p_cap: asText(form,'cap'), p_comune: asText(form,'comune'), p_telefono: asText(form,'telefono'),
    p_nome_tutore: asText(form,'nome_tutore'), p_cognome_tutore: asText(form,'cognome_tutore'),
    p_parentela_tutore: asText(form,'parentela_tutore'),
    p_flag_statuto:flagStatuto,p_flag_privacy:flagPrivacy,p_flag_immagini:form.get('flag_immagini')==='on',
    p_versione_statuto:process.env.STATUTO_VERSION??'DA_CONFIGURARE',
    p_versione_privacy:process.env.PRIVACY_VERSION??'DA_CONFIGURARE',p_invia:send,
  };
  const { error } = await supabase.rpc('salva_domanda_v12', payload);
  if (error) {
    // Non esporre all'utente dettagli SQL o anagrafiche potenzialmente duplicate.
    go('/richiesta/nuova','database');
  }
  revalidatePath('/richiesta/stato');
  redirect(`/richiesta/stato?msg=${send ? 'inviata' : 'salvata'}`);
}

export async function takeApplicationAction(form: FormData) {
  const { supabase } = await requireStaff();
  const id = asText(form, 'id');
  const { error } = await supabase.rpc('prendi_in_carico', { p_id: id });
  if (error) go('/gestionale/richieste', 'stato');
  revalidatePath('/gestionale/richieste');
  redirect(`/gestionale/richieste/${id}?msg=presa`);
}

export async function decideApplicationAction(form: FormData) {
  const { supabase } = await requireStaff();
  const id = asText(form, 'id');
  const action = asText(form, 'action');
  if (!['approvata','integrazione','respinta'].includes(action)) {
    go(`/gestionale/richieste/${id}`, 'stato');
  }
  const message = asText(form,'messaggio');
  const internal = asText(form,'motivo_interno');
  if (action === 'integrazione' && message.length < 10) go(`/gestionale/richieste/${id}`,'domanda');
  if (action === 'respinta' && internal.length < 10) go(`/gestionale/richieste/${id}`,'domanda');
  const { error } = await supabase.rpc('valuta_domanda', {
    p_id: id, p_esito: action, p_messaggio: message || null, p_nota_interna: internal || null,
    p_verifiche_confermate: form.get('verifiche_confermate') === 'on',
  });
  if (error) go(`/gestionale/richieste/${id}`, 'database');
  revalidatePath('/gestionale/richieste');
  revalidatePath('/gestionale/soci');
  revalidatePath('/richiesta/stato');
  redirect(`/gestionale/richieste/${id}?msg=${action}`);
}
