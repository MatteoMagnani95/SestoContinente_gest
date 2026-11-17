'use client';
import {useEffect,useRef,useState} from 'react';
import {identityFromForm,verificaAnagrafica,type CFResult} from '@/lib/verifica-anagrafica';
// Suggerisce soltanto il codice catastale: il CF resta quello ufficiale digitato dall'utente.
export default function CodiceFiscaleAssist(){
 const anchor=useRef<HTMLDivElement>(null);
 const [result,setResult]=useState<CFResult|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  const form=anchor.current?.closest('form');if(!form)return;
  let seq=0,timer:ReturnType<typeof setTimeout>;
  const details=[...document.querySelectorAll<HTMLDetailsElement>('details')].filter(el=>el.contains(form));
  const update=()=>{const ticket=++seq;clearTimeout(timer);if(details.some(el=>!el.open)){setBusy(false);return;}setResult(null);setBusy(true);timer=setTimeout(async()=>{const r=await verificaAnagrafica(identityFromForm(new FormData(form)));if(ticket===seq){setResult(r);setBusy(false);}},300);};
  form.addEventListener('input',update);form.addEventListener('change',update);details.forEach(el=>el.addEventListener('toggle',update));update();
  return ()=>{++seq;clearTimeout(timer);form.removeEventListener('input',update);form.removeEventListener('change',update);details.forEach(el=>el.removeEventListener('toggle',update));};
 },[]);
 return <div ref={anchor} className="stack" aria-live="polite"><p className="tiny muted">Inserisci il CF riportato sul documento ufficiale. Per nascita all’estero usa il nome italiano dello Stato alla data di nascita; per l’Italia indica il Comune e la sigla della provincia.</p>
 <p className="tiny"><strong>Codice catastale:</strong> {busy?'Verifica…':result?.code??'—'}</p>
 {result&&<p className={`notice ${result.status==='ok'?'success':result.status==='empty'?'':'warning'}`}>{result.message}</p>}</div>;
}
