'use server';
import {requireUser} from '@/lib/security';
import {imageChoice} from '@/lib/application-input';
import {versioneImmagini} from '@/lib/scelte';
import {applicationLegalConfig} from '@/lib/application-config';
import {revalidatePath} from 'next/cache';
export async function cambiaScelta(form:FormData){
 const {supabase,user}=await requireUser();const v=imageChoice(form);
 if(v!=='si'&&v!=='no')return {error:'Seleziona una scelta.',field:'immagini'};
 const version=applicationLegalConfig(user.id).testMode?'TEST-COLLAUDO-1':versioneImmagini;
 const expected=String(form.get('immagini_scelta_attesa')??'');
 if(form.get('immagini_versione_vista')!==version||!form.has('immagini_scelta_attesa')||(expected&&!/^[1-9]\d{0,18}$/.test(expected)))return {error:'Modulo non aggiornato. Ricarica il profilo e verifica la dichiarazione.'};
 const {error}=await supabase.rpc('scegli_immagini_verificata',{p_scelta:v==='si',p_versione:version,p_scelta_attesa:expected||null});
 if(error)return {error:error.code==='P3508'?'La scelta è stata modificata. Ricarica il profilo prima di salvarla.':'Scelta non salvata. Riprova.'};revalidatePath('/area-personale/profilo');
}
