'use client';
import {useRef,useState,type FormEvent,type ReactNode} from 'react';
import {Button,Alert} from '@/components/ui/Primitives';
type Result={error:string;field?:string;notice?:string}|void;
export default function AuthForm({action,children,label,pendingLabel,disabled=false}:{action:(form:FormData)=>Promise<Result>;children:ReactNode;label:string;pendingLabel:string;disabled?:boolean}){
 const busy=useRef(false),[pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||disabled)return;
  const form=event.currentTarget,data=new FormData(form);busy.current=true;setPending(true);setError('');setNotice('');
  try{const result=await action(data);if(result?.error){setError(result.error);if(result.field){const field=form.elements.namedItem(result.field);if(field instanceof HTMLElement)requestAnimationFrame(()=>field.focus());}}else if(result?.notice)setNotice(result.notice);}
  catch{setError('Operazione non completata. Riprova.');}
  finally{busy.current=false;setPending(false);}
 }
 return <form data-dirty-ignore className="sc-auth-form" onSubmit={submit} aria-busy={pending}><fieldset className="edit-fields" disabled={pending||disabled}>{children}<Button type="submit" disabled={pending||disabled}>{pending?pendingLabel:label}</Button></fieldset>{error&&<Alert tone="danger" announce>{error}</Alert>}{notice&&<Alert tone="info" announce>{notice}</Alert>}</form>;
}
