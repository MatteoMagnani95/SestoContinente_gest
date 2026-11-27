'use client';
import {useRouter} from 'next/navigation';
import {useTransition} from 'react';
import {requestDiscard} from '@/lib/dirty-navigation';

/** Load the existing server-rendered editor only when a row is requested. */
export default function DeferredEditorButton({href,label}:{href:string;label:string}){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 return <button type="button" className="sc-button sc-button-secondary" aria-haspopup="dialog" aria-busy={pending||undefined} disabled={pending}
  onClick={event=>{const trigger=event.currentTarget;requestDiscard({trigger,proceed:()=>startTransition(()=>router.push(href,{scroll:false}))});}}>
  {pending?'Caricamento…':label}
 </button>;
}
