'use client';
import {useState,useRef,type FormEvent} from 'react';
import {sendAssociationMail} from '@/app/comunicazioni/actions';
import type {MailTemplate,MailMode} from '@/lib/email-tools';
import type {MailResult} from '@/lib/email-service';
export default function AssociationMailForm({kind,id,nonce,fingerprint,templates,mode,count}:{kind:'course'|'member';id:string;nonce:string;fingerprint:string;templates:MailTemplate[];mode:MailMode;count:number}){
 const [template,setTemplate]=useState(templates[0].id),[subject,setSubject]=useState(templates[0].subject),[body,setBody]=useState(templates[0].body),[confirm,setConfirm]=useState(false),[pending,setPending]=useState(false),[finished,setFinished]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);const busy=useRef(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy.current||finished||!confirm||!count)return;
  busy.current=true;setPending(true);setMessage('');
  try{
   const form=new FormData(e.currentTarget);const result=await sendAssociationMail(form);
   if('mode' in result){const r=result as MailResult;setFailed(Boolean(r.error));setFinished(true);setMessage(r.error?`${r.error} Accettate dal provider: ${r.accepted}.`:(r.mode==='simulate'?`Simulazione completata: ${r.planned} indirizzi, nessuna email inviata.`:r.mode==='test'?'Email di prova accettata dal provider, nessun invio ai destinatari originali.':`${r.accepted}/${r.planned} email accettate dal provider. La consegna effettiva va verificata nei log Resend.`));}
   else{setFailed(true);setMessage(result.error??'Operazione non completata.');}
  }catch{setFailed(true);setFinished(true);setMessage('Esito incerto: controlla lo storico del provider prima di ripetere.');}
  finally{busy.current=false;setPending(false);}
 }
 return <form className="panel stack" onSubmit={submit}>
  <h2>Scrivi email</h2><p className="notice">{mode==='simulate'?'Modalità simulazione: nessuna email reale verrà inviata.':mode==='test'?'Modalità test: una copia verrà inviata soltanto alla casella di collaudo configurata.':'Invio reale ai recapiti indicati. Usa esclusivamente comunicazioni associative di servizio.'}</p>
  <input type="hidden" name="kind" value={kind}/><input type="hidden" name="id" value={id}/><input type="hidden" name="nonce" value={nonce}/><input type="hidden" name="fingerprint" value={fingerprint}/>
  <label>Modello<select name="template" value={template} disabled={pending||finished} onChange={e=>{const t=templates.find(t=>t.id===e.target.value)!;setTemplate(t.id);setSubject(t.subject);setBody(t.body);setConfirm(false);}}>{templates.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
  <label>Oggetto<input name="subject" value={subject} required maxLength={180} disabled={pending||finished} onChange={e=>{setSubject(e.target.value);setConfirm(false);}}/></label>
  <label>Messaggio<textarea name="body" rows={12} required maxLength={12000} value={body} disabled={pending||finished} onChange={e=>{setBody(e.target.value);setConfirm(false);}}/></label>
  <label><input name="confirm" type="checkbox" checked={confirm} disabled={pending||finished} onChange={e=>setConfirm(e.target.checked)}/> Confermo destinatari e contenuto ({count} indirizzi unici).</label>
  <button className="button" disabled={!confirm||!count||count>500||pending||finished}>{pending?'Elaborazione...':mode==='simulate'?'Simula invio':mode==='test'?'Invia prova':'Invia email'}</button>
  {message&&<p role="status" className={`notice ${failed?'error':'success'}`}>{message}</p>}{finished&&<p className="tiny muted">Per una nuova comunicazione ricarica la pagina. Se l’esito è incerto verifica prima i log del servizio email.</p>}
 </form>;
}
