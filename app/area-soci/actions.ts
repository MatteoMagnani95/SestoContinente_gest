'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {eventReturn} from '@/lib/event-ui';
import {requireUser,requireAdmin} from '@/lib/security';
const text=(f:FormData,n:string)=>String(f.get(n)??'').trim();
const validId=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const msg=(error:{code?:string}|null)=>!error?'ok':error.code==='P3416'?'posti':error.code==='P3415'?'stato':error.code==='42501'?'permessi':'errore';
function finish(path:string,status:string){revalidatePath('/area-soci');revalidatePath('/gestione-eventi');redirect(`${path}?msg=${status}`);}
export async function joinEvent(form:FormData){
 const {supabase}=await requireUser();const event=text(form,'evento_id'),person=text(form,'persona_id');
 if(!validId(event)||!validId(person))finish('/area-soci','errore');
 const {error}=await supabase.rpc('area_soci_iscrivi',{p_evento:event,p_persona:person});finish('/area-soci',msg(error));
}
export async function withdrawEvent(form:FormData){
 const {supabase}=await requireUser();const event=text(form,'evento_id'),id=text(form,'iscrizione_id');
 if(!validId(event)||!validId(id)||form.get('conferma')!=='on')finish('/area-soci','errore');
 const {error}=await supabase.rpc('area_soci_decidi',{p_evento:event,p_iscrizione:id,p_esito:'ritirata'});finish('/area-soci',msg(error));
}
export async function saveEvent(form:FormData){
 const {supabase}=await requireUser();const id=text(form,'id'),titolo=text(form,'titolo'),destinazione=text(form,'destinazione'),descrizione=text(form,'descrizione'),dal=text(form,'dal'),al=text(form,'al'),stato=text(form,'stato')||'aperto';
 const cost=text(form,'costo'),capacity=text(form,'posti'),costo=Number(cost),posti=Number(capacity);
 if((id&&!validId(id))||!titolo||titolo.length>160||!destinazione||destinazione.length>200||!descrizione||descrizione.length>5000||!/^\d{4}-\d{2}-\d{2}$/.test(dal)||!/^\d{4}-\d{2}-\d{2}$/.test(al)||al<dal||!cost||!Number.isFinite(costo)||costo<0||!capacity||!Number.isInteger(posti)||posti<1||posti>1000||!['aperto','chiuso','annullato'].includes(stato)||(stato==='annullato'&&form.get('conferma')!=='on'))return {error:'Controlla titolo, date, importo, capienza e conferma.'};
 const {data:created,error}=await supabase.rpc('area_soci_salva_evento',{p_id:id||null,p_titolo:titolo,p_destinazione:destinazione,p_descrizione:descrizione,p_dal:dal,p_al:al,p_costo:costo,p_posti:posti,p_stato:stato});if(error)return {error:msg(error)==='posti'?'Capienza inferiore ai posti già riservati.':msg(error)==='stato'?'Evento non modificabile o data non valida.':'Salvataggio non riuscito: verifica autorizzazioni e dati.'};
 revalidatePath('/area-soci');revalidatePath('/gestione-eventi');redirect(eventReturn(form,id||String(created??''),'ok'));
}
export async function decideEvent(form:FormData){
 const {supabase}=await requireUser();const event=text(form,'evento_id'),id=text(form,'iscrizione_id'),decision=text(form,'esito');
 if(!validId(event)||!validId(id)||!['approvata','respinta','annullata'].includes(decision))finish('/gestione-eventi','dati');
 const {error}=await supabase.rpc('area_soci_decidi',{p_evento:event,p_iscrizione:id,p_esito:decision});revalidatePath('/area-soci');revalidatePath('/gestione-eventi');redirect(eventReturn(form,event,msg(error)));
}

export async function removeEventRecord(form:FormData){
 const {supabase}=await requireAdmin();const event=text(form,'evento_id'),id=text(form,'iscrizione_id');
 if(!validId(event)||(id&&!validId(id))||form.get('conferma')!=='on')finish('/gestione-eventi','dati');
 const {error}=await supabase.rpc('admin_rimuovi_evento',{p_evento:event,p_iscrizione:id||null});
 revalidatePath('/area-soci');revalidatePath('/gestione-eventi');redirect(id||error?eventReturn(form,event,error?'rimozione_collegati':'rimosso'):'/gestione-eventi?msg=rimosso');
}
