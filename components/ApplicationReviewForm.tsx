'use client';

import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {markFormSaved} from '@/lib/dirty-navigation';
import {decideApplicationAction} from '@/app/actions';
import {decisionValidation,type ReviewCheck} from '@/lib/application-review';

export default function ApplicationReviewForm({id,testMode,checks}:{id:string;testMode:boolean;checks:ReviewCheck[]}){
 const router=useRouter();
 const [confirmed,setConfirmed]=useState(false);
 const [message,setMessage]=useState('');
 const [note,setNote]=useState('');
 const [error,setError]=useState('');
 const [pending,setPending]=useState(false);
 const submitting=useRef(false);
 const blocked=checks.some(c=>c.status==='blocked');
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(submitting.current)return;
  const button=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
  const action=button?.value??'';
  const validation=decisionValidation(action,confirmed,message,note);
  if(validation){setError(validation);return;}
  if(action==='approvata'&&blocked){setError('Risolvi i controlli bloccanti prima di approvare.');return;}
  const form=e.currentTarget;const data=new FormData(form);data.set('action',action);
  submitting.current=true;setPending(true);setError('');
  let succeeded=false;
  try{
   const result=await decideApplicationAction(data);
   if(result.error){setError(result.error);return;}
   if(result.next){markFormSaved(form);router.push(result.next);router.refresh();succeeded=true;}
  }catch{setError('Esito non verificabile. Le note sono ancora presenti: ricarica lo stato della pratica prima di ripetere l’operazione.');}
  finally{if(!succeeded){submitting.current=false;setPending(false);}}
 }
 return <div className="stack">
  <h3>Verifiche preliminari</h3>
  <div className="stack" aria-label="Controlli automatici della pratica">
   {checks.map(c=><div key={c.label} className={`notice ${c.status==='ok'?'success':c.status==='blocked'?'error':'warning'}`} style={{margin:0}}><strong>{c.label} — {c.status==='ok'?'OK':c.status==='blocked'?'Da risolvere':'Da verificare'}</strong><div>{c.detail}</div></div>)}
  </div>
  <p className="muted tiny">Controlli indicativi al caricamento della scheda. Il database ripete le verifiche previste quando registri la decisione. Se modifichi i dati in un’altra scheda, ricarica questa pagina.</p>
  <div className="notice warning"><strong>{testMode?'Verifiche simulate — COLLAUDO':'Verifiche manuali obbligatorie'}</strong><p>Controlla identità, poteri del tutore (se previsto), possibili duplicati, competenza statutaria e documentazione. {testMode?'Usa soltanto dati di prova: la conferma non attesta verifiche reali.':'La conferma non sostituisce le verifiche effettive della segreteria.'}</p></div>
  <h3>Decisione della segreteria</h3>
  <form data-dirty-form onSubmit={submit} className="stack">
   <input type="hidden" name="id" value={id}/>
   <label>Messaggio per eventuale integrazione<textarea name="messaggio" rows={3} value={message} onChange={e=>setMessage(e.target.value)} disabled={pending} placeholder="Indica le informazioni da correggere (minimo 10 caratteri)"/></label>
   <label>Motivazione interna (obbligatoria per il rifiuto)<textarea name="motivo_interno" rows={3} value={note} onChange={e=>setNote(e.target.value)} disabled={pending} placeholder="Visibile soltanto alla segreteria"/></label>
   <label className="check-label"><input name="verifiche_confermate" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={pending}/><span>{testMode?'Confermo di aver simulato le verifiche preliminari sui dati di collaudo (identità, duplicati e competenza a deliberare).':'Confermo di aver effettuato le verifiche previste prima dell’approvazione, incluse identità, duplicati e competenza a deliberare.'}</span></label>
   <div id="review-feedback" aria-live="polite">
    {!confirmed&&<p className="notice warning">Per abilitare «{testMode?'Approva (collaudo)':'Approva'}», seleziona la conferma delle verifiche preliminari.</p>}
    {blocked&&<p className="notice error">L’approvazione richiede la risoluzione dei controlli bloccanti sopra indicati. Puoi comunque chiedere un’integrazione o respingere.</p>}
    {error&&<p role="alert" className="notice error">{error}</p>}
    {pending&&<p role="status">Registrazione della decisione in corso…</p>}
   </div>
   <div className="form-actions wrap"><button className="button" name="action" value="approvata" type="submit" disabled={pending||!confirmed||blocked} aria-describedby="review-feedback" style={{opacity:pending||!confirmed||blocked?0.55:1}}>{testMode?'Approva (collaudo)':'Approva'}</button><button className="button ghost" name="action" value="integrazione" type="submit" disabled={pending}>Chiedi integrazione</button><button className="button danger" name="action" value="respinta" type="submit" disabled={pending}>Respingi</button></div>
  </form>
 </div>;
}
