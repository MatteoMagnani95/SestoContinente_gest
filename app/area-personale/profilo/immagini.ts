'use server';
import {requireUser} from '@/lib/security';
import {imageChoice} from '@/lib/application-input';
import {versioneImmagini} from '@/lib/scelte';
import {applicationLegalConfig} from '@/lib/application-config';
import {revalidatePath} from 'next/cache';
export async function cambiaScelta(form:FormData){
 const {supabase,user}=await requireUser();const v=imageChoice(form);
 if(v!=='si'&&v!=='no')return {error:'Seleziona una scelta.',field:'immagini'};
 const {error}=await supabase.rpc('scegli_immagini',{p_scelta:v==='si',p_versione:applicationLegalConfig(user.id).testMode?'TEST-COLLAUDO-1':versioneImmagini});
 if(error)return {error:'Scelta non salvata. Riprova.'};revalidatePath('/area-personale/profilo');
}
