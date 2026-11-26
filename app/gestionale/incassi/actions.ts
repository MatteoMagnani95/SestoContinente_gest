'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {requireStaff,requireAdmin} from '@/lib/security';
import {paymentAmount,validPaymentDate} from '@/lib/payment-tools';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const txt=(form:FormData,name:string)=>String(form.get(name)??'').trim();
const methods=['contanti','bonifico','pos'];
function back(form:FormData,msg:string):never{
 const params=new URLSearchParams({msg});
 const tab=txt(form,'tab');
 if(tab==='quota'||tab==='corso')params.set('tab',tab);
 const stagione=txt(form,'stagione');
 if(uuid.test(stagione))params.set('stagione',stagione);
 const persona=txt(form,'filtro_persona');
 if(uuid.test(persona))params.set('persona',persona);
 const stato=txt(form,'stato');
 if(['tutte','non_pagata','parziale','pagata','residuo'].includes(stato))params.set('stato',stato);
 for(const key of ['dal','al']){const value=txt(form,key);if(validPaymentDate(value))params.set(key,value);}const debt=txt(form,'debito');if(uuid.test(debt))params.set('debito',debt);
 redirect(`/gestionale/incassi?${params.toString()}`);
}
export async function recordGuidedPayment(form:FormData){
 const {supabase}=await requireStaff();
 const tab=txt(form,'tab');
 const charge=txt(form,'debito_id');
 const persona=txt(form,'persona_id');
 const request=txt(form,'richiesta_id');
 const date=txt(form,'data_pagamento');
 const method=txt(form,'metodo');
 const reference=txt(form,'riferimento');
 const note=txt(form,'note');
 const value=paymentAmount(txt(form,'importo'));
 if(!['quota','corso'].includes(tab)||![charge,persona,request].every(x=>uuid.test(x))||
    !validPaymentDate(date)||!methods.includes(method)||value===null||reference.length>150||note.length>1000||
    form.get('conferma')!=='on'){
  return {error:'Controlla importo, data, modalità e conferma di ricezione del versamento.'};
 }
 const {error}=await supabase.rpc('registra_pagamento_guidato',{
  p_persona:persona,p_quota:tab==='quota'?charge:null,
  p_addebito:tab==='corso'?charge:null,
  p_importo:value,p_data:date,p_metodo:method,
  p_riferimento:reference,p_note:note,p_richiesta_id:request,
 });
 if(error){
  const msg=error.code==='P3401'?'eccede':error.code==='P3402'?'duplicato':
    error.code==='P3403'?'dati':error.code==='42501'?'permessi':
    error.code==='23505'?'duplicato':'database';
  return {error:msg==='eccede'?'L’importo supera il residuo. Aggiorna la posizione prima di riprovare.':msg==='duplicato'?'Versamento già registrato o richiesta duplicata. Controlla lo storico prima di ripetere.':msg==='permessi'?'Operazione non autorizzata.':'Registrazione non completata. Controlla la posizione e riprova.'};
 }
 revalidatePath('/gestionale/incassi');
 revalidatePath('/gestionale/soci');
 revalidatePath('/gestionale/economia');
 back(form,'salvato');
}

export async function correctPayment(form:FormData){
 const {supabase}=await requireAdmin();const id=txt(form,'id'),reason=txt(form,'motivo');
 if(!uuid.test(id))redirect('/gestionale/incassi?msg=dati');
 if(form.get('conferma')!=='on'||reason.length<5||reason.length>1000)redirect(`/gestionale/incassi/${id}?msg=dati`);
 const {error}=await supabase.rpc('admin_rettifica_incasso',{p_id:id,p_motivo:reason});
 if(error)redirect(`/gestionale/incassi/${id}?msg=errore`);
 revalidatePath('/', 'layout');redirect('/gestionale/incassi?msg=rettificato');
}
