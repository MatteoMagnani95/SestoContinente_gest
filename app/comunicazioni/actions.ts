'use server';
import {getCourseMail,getMemberMail,contextKey,contextRecipients,mailUuid} from '@/lib/email-context';
import {deliverMail} from '@/lib/email-service';
import {validMessage} from '@/lib/email-tools';
import {createHash} from 'node:crypto';
export async function sendAssociationMail(form:FormData){
 const read=(key:string)=>String(form.get(key)??'');
 const kind=read('kind'),id=read('id'),nonce=read('nonce'),subject=read('subject').trim(),body=read('body').trim();
 if(!['course','member'].includes(kind)||!mailUuid.test(id)||!mailUuid.test(nonce)||read('confirm')!=='on'||!validMessage(subject,body))return {error:'Dati non validi o conferma mancante.'};
 // Non accettiamo mai indirizzi dal client; permessi e dati sono rivalutati dalla sessione corrente.
 const c=kind==='course'?await getCourseMail(id):await getMemberMail(id);
 if(!c)return {error:'Destinatari non disponibili o autorizzazione mancante.'};
 if(contextKey(c)!==read('fingerprint'))return {error:'Iscrizioni, recapiti o saldi cambiati. Ricarica e verifica il riepilogo prima di inviare.'};
 if(!c.templates.some(t=>t.id===read('template')))return {error:'Modello non più disponibile.'};
 const recipients=contextRecipients(c);
 const key=createHash('sha256').update(`${kind}:${id}:${nonce}:${read('fingerprint')}`).digest('hex');
 return await deliverMail({recipients,subject,body,key});
}
