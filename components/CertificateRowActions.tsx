'use client';
import {useState,useRef,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {cambiaEsitoCertificato,sollecitaCertificatoMancante} from '@/app/gestionale/moduli/[modulo]/certificate-actions';

export function EsitoCertificato({id,documento,precedente,iniziale,nome}:{id:string;documento:string;precedente:string;iniziale:string;nome:string}){
 const router=useRouter(),lock=useRef(false);
 const [value,setValue]=useState(iniziale),[pending,setPending]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(lock.current||value===iniziale)return;
  lock.current=true;setPending(true);setMessage('');
  try{const result=await cambiaEsitoCertificato(id,documento,precedente,value);setError(Boolean(result.error));setMessage(result.error??result.message??'');if(!result.error)router.refresh();}
  catch{setError(true);setMessage('Salvataggio non riuscito. Riprova.');}
  finally{lock.current=false;setPending(false);}
 }
 return <form onSubmit={submit} aria-busy={pending}><div style={{display:'flex',gap:6,alignItems:'center'}}><select aria-label={'Esito di '+nome} value={value} onChange={e=>{setValue(e.target.value);setMessage('');}} disabled={pending} style={{minWidth:140}}><option value="in_attesa">Da verificare</option><option value="valido">Valido</option><option value="non_valido">Non valido</option></select><button className="button ghost" disabled={pending||value===iniziale} type="submit">{pending?'Salvo…':'Salva'}</button></div>{message&&<span role={error?'alert':'status'} className="hint">{message}</span>}</form>;
}
export function SollecitoCertificato({persona,nome}:{persona:string;nome:string}){
 const lock=useRef(false);const [pending,setPending]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false),[done,setDone]=useState(false);
 async function send(){
  if(lock.current||done||!window.confirm('Inviare un sollecito di documentazione a '+nome+'?'))return;
  lock.current=true;setPending(true);
  try{const result=await sollecitaCertificatoMancante(persona);setError(Boolean(result.error));setMessage(result.error??result.message??'');setDone(!result.error);}
  catch{setError(true);setMessage('Notifica non riuscita. Riprova.');}
  finally{lock.current=false;setPending(false);}
 }
 return <div><button type="button" className="button ghost" onClick={send} disabled={pending||done}>{pending?'Invio…':done?'Sollecitato':'Invia notifica'}</button>{message&&<span style={{display:'block'}} className="hint" role={error?'alert':'status'}>{message}</span>}</div>;
}
