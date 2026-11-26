'use client';
import {useEffect,useId,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {Button,Alert} from '@/components/ui/Primitives';
type Result={error?:string;field?:string;notice?:string;next?:'/smista'|'/registrati?ok=verifica'}|void;
export default function AuthForm({action,children,label,pendingLabel,disabled=false}:{action:(form:FormData)=>Promise<Result>;children:ReactNode;label:string;pendingLabel:string;disabled?:boolean}){
 const formRef=useRef<HTMLFormElement>(null),errorId=useId();
 const [errorField,setErrorField]=useState<string|undefined>();
 const busy=useRef(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  if(!error||pending)return;
  const field=errorField?formRef.current?.elements.namedItem(errorField):null;
  if(!(field instanceof HTMLElement)){document.getElementById(errorId)?.focus();return;}
  const previous=field.getAttribute('aria-describedby');field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',[previous,errorId].filter(Boolean).join(' '));field.focus();
  return()=>{field.removeAttribute('aria-invalid');if(previous)field.setAttribute('aria-describedby',previous);else field.removeAttribute('aria-describedby');};
 },[error,errorField,errorId,pending]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||disabled)return;
  const form=event.currentTarget,data=new FormData(form);busy.current=true;setPending(true);setError('');setErrorField(undefined);setNotice('');
  let navigating=false;
  try{
   const result=await action(data);
   if(result?.error){setError(result.error);setErrorField(result.field);}
   else if(result?.next==='/smista'||result?.next==='/registrati?ok=verifica'){
    // Navigazione completa: i cookie di sessione appena scritti sono disponibili
    // al server e il router non mostra una pagina anonima in cache.
    window.location.replace(result.next);navigating=true;
   }else if(result?.notice)setNotice(result.notice);
  }
  catch{setError('Operazione non completata. Riprova.');}
  finally{if(!navigating){busy.current=false;setPending(false);}}
 }
 return <form ref={formRef} data-dirty-ignore className="sc-auth-form" onSubmit={submit} aria-busy={pending}><fieldset className="edit-fields" disabled={pending||disabled}>{children}<Button type="submit" disabled={pending||disabled}>{pending?pendingLabel:label}</Button></fieldset>{error&&<div id={errorId} tabIndex={-1}><Alert tone="danger" announce>{error}</Alert></div>}{notice&&<Alert tone="info" announce>{notice}</Alert>}</form>;
}
