import 'server-only';
import {mailMode,uniqueRecipients,validEmail,validMessage} from './email-tools';
export {mailMode};
export type MailResult={mode:'simulate'|'test'|'live';accepted:number;planned:number;error?:string};
export function currentMailMode(){return mailMode(process.env);}
export async function deliverMail(input:{recipients:string[];subject:string;body:string;key:string}):Promise<MailResult>{
 const mode=currentMailMode(),original=uniqueRecipients(input.recipients),planned=original.length;
 const result:MailResult={mode,accepted:0,planned};
 if(!planned||planned>500||!validMessage(input.subject,input.body))return {...result,error:'Messaggio non valido o lista vuota/superiore a 500 indirizzi.'};
 if(mode==='simulate')return result;
 const key=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;
 const test=validEmail(process.env.EMAIL_TEST_RECIPIENT);
 if(!key||!from||(mode==='test'&&!test))return {...result,error:'Configura RESEND_API_KEY, EMAIL_FROM e, in modalità test, EMAIL_TEST_RECIPIENT.'};
 const recipients=mode==='test'?[test!]:original;
 const subject=mode==='test'?`[COLLAUDO] ${input.subject}`:input.subject;
 const text=mode==='test'?`Invio di prova: ${planned} destinatari previsti, nessuna email ai destinatari originali.\n\n${input.body}`:input.body;
 // Una mail per destinatario, senza esporre gli altri indirizzi.
 for(let i=0;i<recipients.length;i+=100){
  const chunk=recipients.slice(i,i+100);
  try{
   const res=await fetch('https://api.resend.com/emails/batch',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`${input.key}/${mode}/${i/100}`},body:JSON.stringify(chunk.map(to=>({from,to:[to],subject,text,...(validEmail(process.env.EMAIL_REPLY_TO)?{reply_to:process.env.EMAIL_REPLY_TO}:{})}))),signal:AbortSignal.timeout(8000)});
   if(!res.ok)return {...result,error:`Invio interrotto dal provider (HTTP ${res.status}). Controlla quota, mittente e log Resend prima di ripetere.`};
   const data=await res.json() as {data?:{id:string}[]};
   if(!Array.isArray(data.data)||data.data.length!==chunk.length){result.accepted+=Array.isArray(data.data)?data.data.length:0;return {...result,error:'Risposta incompleta del provider: controlla lo storico Resend prima di ripetere.'};}
   result.accepted+=data.data.length;
   if(i+100<recipients.length)await new Promise(resolve=>setTimeout(resolve,600));
  }catch{return {...result,error:'Esito incerto: consulta i log del provider; non ripetere automaticamente l’invio.'};}
 }
 return result;
}
