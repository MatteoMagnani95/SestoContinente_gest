'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireUser} from '@/lib/security';
const uuid=/^[0-9a-f-]{36}$/i;
export async function recordAttendance(form:FormData){
 const {supabase,user}=await requireUser();
 const {data:role}=await supabase.from('ruoli_utente').select('ruolo').eq('utente_id',user.id).eq('ruolo','istruttore').maybeSingle();
 if(!role)redirect('/?msg=permessi');
 const lezione_id=String(form.get('lezione_id')??'');
 const persona_id=String(form.get('persona_id')??'');
 const scelta=String(form.get('presente')??'');
 if(!['si','no'].includes(scelta))return {field:'presente',error:'Seleziona esplicitamente presente oppure assente.'};
 const presente=scelta==='si';
 const nota_didattica=String(form.get('nota_didattica')??'').trim().slice(0,2000);
 if(!uuid.test(lezione_id)||!uuid.test(persona_id))return {error:'Lezione o allievo non valido.'};
 const {data:lesson,error:lessonError}=await supabase.from('lezioni').select('id,edizione_id,annullata_il').eq('id',lezione_id).maybeSingle();
 if(lessonError||!lesson||lesson.annullata_il)return {error:'Lezione annullata o non accessibile.'};
 const [assigned,enrolled]=await Promise.all([supabase.rpc('insegna_edizione',{p_edizione:lesson.edizione_id}),supabase.from('iscrizioni_corsi').select('id').eq('edizione_id',lesson.edizione_id).eq('persona_id',persona_id).in('stato',['iscritto','concluso']).maybeSingle()]);
 if(assigned.error||assigned.data!==true||enrolled.error||!enrolled.data)return {error:'Allievo non autorizzato per questa lezione.'};
 const {error}=await supabase.from('presenze').upsert({lezione_id,persona_id,presente,nota_didattica},{onConflict:'lezione_id,persona_id'});
 if(error)return {error:'Presenza non salvata. Verifica assegnazione e iscrizione.'};
 revalidatePath('/istruttore');redirect('/istruttore?'+new URLSearchParams({tab:'presenze',edizione:lesson.edizione_id,lezione:lezione_id,p:String(Math.max(1,Math.min(100000,Number.parseInt(String(form.get('pagina')??'1'),10)||1))),msg:'ok'}));
}
