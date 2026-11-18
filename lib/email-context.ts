import 'server-only';
import {createHash} from 'node:crypto';
import {requireStaff,requireUser} from '@/lib/security';
import {debtTemplate,uniqueRecipients,validEmail,type MailTemplate} from './email-tools';
import {currentMailMode} from './email-service';
export type MailPerson={id:string;nome:string;cognome:string;email:string|null};
export type MailContext={title:string;people:MailPerson[];templates:MailTemplate[];returnUrl:string};
export const mailUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function contextKey(c:MailContext){return createHash('sha256').update(JSON.stringify([currentMailMode(),c.people.map(p=>[p.id,p.email]),c.templates])).digest('hex');}
export function contextRecipients(c:MailContext){return uniqueRecipients(c.people.map(p=>p.email));}
export async function getCourseMail(id:string):Promise<MailContext|null>{
 if(!mailUuid.test(id))return null;
 const {supabase}=await requireUser();
 const [{data,error},{data:staff}]=await Promise.all([supabase.rpc('mailing_list_corso',{p_edizione:id}),supabase.rpc('is_staff')]);
 if(error||!data||!Array.isArray(data.iscritti))return null;
 const course=data as {nome:string;stato:string;iscritti:MailPerson[]};
 return {title:course.nome,people:course.iscritti,templates:[{id:'libero',label:'Comunicazione ai corsisti',subject:`Comunicazione – ${course.nome}`,body:'Ciao,\n\n\n\nA presto,\nSesto Continente'}],returnUrl:staff===true?`/gestionale/corsi/${id}`:'/istruttore'};
}
export async function getMemberMail(id:string):Promise<MailContext|null>{
 if(!mailUuid.test(id))return null;
 const {supabase}=await requireStaff();
 const [{data:p,error:pe},{data:quota,error:qe},{data:course,error:ce}]=await Promise.all([
  supabase.from('persone').select('id,nome,cognome,email').eq('id',id).maybeSingle(),
  supabase.from('saldi_quote').select('id,stagione_id,residuo,scadenza').eq('persona_id',id).gt('residuo',0).order('id').limit(501),
  supabase.from('saldi_corsi').select('id,edizione_id,residuo,scadenza').eq('persona_id',id).gt('residuo',0).order('id').limit(501)
 ]);
 if(pe||qe||ce||!p||!quota||!course||quota.length>500||course.length>500)return null;
 const seasonIds=[...new Set(quota.map(q=>q.stagione_id))],editionIds=[...new Set(course.map(q=>q.edizione_id))];
 const [seasons,editions]=await Promise.all([seasonIds.length?supabase.from('stagioni').select('id,nome').in('id',seasonIds):Promise.resolve({data:[],error:null}),editionIds.length?supabase.from('edizioni_corsi').select('id,nome').in('id',editionIds):Promise.resolve({data:[],error:null})]);
 if(seasons.error||editions.error)return null;
 const templates:MailTemplate[]=[{id:'benvenuto',label:'Benvenuto',subject:'Benvenuto in Sesto Continente',body:`Ciao ${p.nome},\n\nbenvenuto in Sesto Continente! Puoi consultare le tue informazioni e le attività accedendo al gestionale. Per qualsiasi domanda, contatta la segreteria.\n\nA presto,\nSesto Continente`},{id:'tessera',label:'Promemoria rinnovo tessera',subject:'Promemoria tesseramento',body:`Ciao ${p.nome},\n\nconsulta la tua posizione associativa e controlla il rinnovo della tessera. Per informazioni su costi e modalità di rinnovo, contatta la segreteria.\n\nGrazie,\nSesto Continente`},{id:'libero',label:'Messaggio libero',subject:'Comunicazione Sesto Continente',body:`Ciao ${p.nome},\n\n\n\nSesto Continente`}];
 for(const q of quota){const t=debtTemplate('quota',q.id,p.nome,seasons.data?.find(s=>s.id===q.stagione_id)?.nome??'stagione associativa',q.residuo,q.scadenza);if(t)templates.push(t);}
 for(const q of course){const t=debtTemplate('corso',q.id,p.nome,editions.data?.find(s=>s.id===q.edizione_id)?.nome??'corso',q.residuo,q.scadenza);if(t)templates.push(t);}
 return {title:`${p.cognome} ${p.nome}`,people:[{...p,email:validEmail(p.email)}],templates,returnUrl:`/gestionale/soci/${id}`};
}
