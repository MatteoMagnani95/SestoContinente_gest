'use client';
import {useFormStatus} from 'react-dom';
import type {ReactNode,FormHTMLAttributes} from 'react';
function Fields({children}:{children:ReactNode}){
 const {pending}=useFormStatus();
 return <><fieldset className="edit-fields" disabled={pending} aria-busy={pending}>{children}</fieldset>{pending&&<p role="status">Operazione in corso…</p>}</>;
}
export default function ActionForm({children,...props}:Omit<FormHTMLAttributes<HTMLFormElement>,'action'>&{action:(form:FormData)=>void|Promise<void>;children:ReactNode}){
 return <form {...props}><Fields>{children}</Fields></form>;
}
