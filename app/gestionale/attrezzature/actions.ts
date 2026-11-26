'use server';
import {requireStaff} from '@/lib/security';
import {UUID_RE} from '@/lib/course-tools';
import {validPaymentDate} from '@/lib/payment-tools';
import {todayRome} from '@/lib/area-soci';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
export async function returnEquipment(form:FormData){
 const {supabase}=await requireStaff(),id=String(form.get('id')??''),date=String(form.get('restituita_il')??'');
 if(!UUID_RE.test(id)||!validPaymentDate(date)||date>todayRome()||form.get('conferma')!=='on')return {error:'Controlla data e conferma della restituzione.'};
 const {data:loan,error:readError}=await supabase.from('assegnazioni_attrezzature').select('assegnata_il,restituita_il').eq('id',id).maybeSingle();
 if(readError||!loan||loan.restituita_il||date<loan.assegnata_il)return {error:'Prestito non disponibile, già restituito o data non valida.'};
 const {data,error}=await supabase.from('assegnazioni_attrezzature').update({restituita_il:date}).eq('id',id).is('restituita_il',null).select('id').maybeSingle();
 if(error||!data)return {error:'Restituzione non confermata: verifica se è già stata registrata.'};
 revalidatePath('/gestionale/moduli/consegne');revalidatePath('/gestionale/moduli/attrezzature');revalidatePath('/gestionale/soci','layout');redirect('/gestionale/moduli/consegne?msg=salvato');
}
