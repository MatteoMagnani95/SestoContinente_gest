'use client';
import {useId,useState} from 'react';
export default function PasswordField({name='password',label='Password',newPassword=false}:{name?:string;label?:string;newPassword?:boolean}){
 const id=useId(),[visible,setVisible]=useState(false);
 return <div className="sc-field"><label htmlFor={id}>{label}</label><div className="sc-password-control"><input id={id} name={name} type={visible?'text':'password'} required minLength={newPassword?10:undefined} autoComplete={newPassword?'new-password':'current-password'} autoCapitalize="none" spellCheck={false} data-dirty-ignore/><button type="button" className="sc-button sc-button-secondary" aria-controls={id} aria-label={`${visible?'Nascondi':'Mostra'} ${label.toLocaleLowerCase('it-IT')}`} onClick={()=>setVisible(v=>!v)}>{visible?'Nascondi':'Mostra'}</button></div></div>;
}
