'use client';
import {useEffect,useRef,useState} from 'react';
import {checkIdentityAction} from '@/app/actions';
import type {CFResult,Identity} from '@/lib/verifica-anagrafica';
const identityKeys=['nome','cognome','data_nascita','luogo_nascita','provincia_nascita','stato_nascita','sesso_cf','codice_fiscale'] as const;
export default function CodiceFiscaleAssist({onBlocked}:{onBlocked?:(value:boolean)=>void}={}){
 const anchor=useRef<HTMLDivElement>(null);
 const [result,setResult]=useState<CFResult|null>(null),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const form=anchor.current?.closest('form');if(!form)return;
  let seq=0,timer:ReturnType<typeof setTimeout>;let last='';
  const details=[...document.querySelectorAll<HTMLDetailsElement>('details')].filter(el=>el.contains(form));
  const update=()=>{
   if(details.some(el=>!el.open)){++seq;clearTimeout(timer);last='';setBusy(false);return;}
   const values=new FormData(form),identity:Identity=Object.fromEntries(identityKeys.map(k=>[k,String(values.get(k)??'').trim()]));
   const fingerprint=JSON.stringify(identity);if(fingerprint===last)return;last=fingerprint;
   const ticket=++seq;clearTimeout(timer);setResult(null);
   const hasCf=Boolean(identity.codice_fiscale);onBlocked?.(hasCf);
   if(hasCf&&String(identity.codice_fiscale).length!==16){setBusy(false);setResult({status:'invalid',code:null,message:'Il codice fiscale deve contenere 16 caratteri.'});return;}
   if(!identity.data_nascita||!identity.stato_nascita||!identity.luogo_nascita){setBusy(false);if(hasCf)setResult({status:'incomplete',code:null,message:'Completa i dati di nascita per verificare il codice fiscale.'});return;}
   setBusy(true);timer=setTimeout(async()=>{
    let r:CFResult;try{r=await checkIdentityAction(identity);}catch{r={status:'unavailable',code:null,message:'Verifica temporaneamente non disponibile. Riprova modificando un dato.'};}
    if(ticket===seq){setResult(r);setBusy(false);onBlocked?.(hasCf&&!['ok','omocodia'].includes(r.status));}
   },350);
  };
  form.addEventListener('input',update);form.addEventListener('change',update);details.forEach(el=>el.addEventListener('toggle',update));update();
  return ()=>{++seq;clearTimeout(timer);form.removeEventListener('input',update);form.removeEventListener('change',update);details.forEach(el=>el.removeEventListener('toggle',update));};
 },[onBlocked,retry]);
 return <div ref={anchor} className="stack" aria-live="polite"><p className="tiny muted">Inserisci il CF ufficiale; per l’Italia indica il Comune e la provincia, per l’estero lo Stato alla data di nascita.</p>
 <p className="tiny"><strong>Codice catastale:</strong> {busy?'Verifica…':result?.code??'—'}</p>
 {result&&<p role={['invalid','mismatch','place','unavailable'].includes(result.status)?'alert':'status'} className={`notice ${result.status==='ok'?'success':['invalid','mismatch','place','unavailable'].includes(result.status)?'error':result.status==='empty'?'':'warning'}`}>{result.message}</p>}{result?.status==='unavailable'&&<button type="button" className="button ghost" onClick={()=>setRetry(v=>v+1)}>Ripeti verifica</button>}</div>;
}
