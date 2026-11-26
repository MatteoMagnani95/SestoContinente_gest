'use client';
import {useEffect,useId,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import {markFormSaved} from '@/lib/dirty-navigation';
export type EditFailure={error:string;field?:string;href?:string};
export default function EditForm({action,children,className='stack'}:{action:(data:FormData)=>Promise<void|EditFailure>;children:ReactNode;className?:string}){
 const busy=useRef(false);
 const formRef=useRef<HTMLFormElement>(null),errorId=useId();
 const [pending,setPending]=useState(false);
 const [failure,setFailure]=useState<EditFailure>();
 const [anchor,setAnchor]=useState<HTMLElement|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current)return;
  const form=event.currentTarget;const data=new FormData(form);
  busy.current=true;setPending(true);setFailure(undefined);
  try{
   const response=await action(data);
   if(response){
    const field=response.field?form.elements.namedItem(response.field):null;
    setAnchor(field instanceof HTMLElement?field.closest('.sc-field')??field.closest('label'):null);
    setFailure(response);if(field instanceof HTMLElement)field.focus();
   }else markFormSaved(form);
  }catch{setAnchor(null);setFailure({error:'Salvataggio non riuscito. Puoi riprovare conservando i dati inseriti.'});}
  finally{busy.current=false;setPending(false);}
 }
 useEffect(()=>{
  const field=failure?.field?formRef.current?.elements.namedItem(failure.field):null;
  if(!(field instanceof HTMLElement))return;
  const previous=field.getAttribute('aria-describedby');field.setAttribute('aria-invalid','true');field.setAttribute('aria-describedby',[previous,errorId].filter(Boolean).join(' '));
  if(!pending)field.focus();
  return()=>{field.removeAttribute('aria-invalid');if(previous)field.setAttribute('aria-describedby',previous);else field.removeAttribute('aria-describedby');};
 },[failure,pending,errorId]);
 const error=failure&&<span id={errorId} role="alert" className="notice error">{failure.error} {failure.href&&<Link href={failure.href}>Apri quello esistente</Link>}</span>;
 return <form ref={formRef} data-dirty-form className={className+' edit-fields-form'} onSubmit={submit} onReset={()=>{setFailure(undefined);setAnchor(null);}} aria-busy={pending}>
 <fieldset className="edit-fields" disabled={pending}>{children}</fieldset>{anchor&&error?createPortal(error,anchor):error}
 {pending&&<p role="status">Salvataggio in corso…</p>}</form>;
}
