'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {requestDiscard} from '@/lib/dirty-navigation';
import {Icon} from './Icon';

type Props={title:string;trigger:string;children:ReactNode;initialOpen?:boolean;variant?:'drawer'|'modal';primary?:boolean;danger?:boolean};
/** Only the trigger is rendered in the table. The form mounts in the body portal on demand. */
export function Drawer({title,trigger,children,initialOpen=false,variant='drawer',primary=false,danger=false}:Props){
 const [open,setOpen]=useState(initialOpen),[mounted,setMounted]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const titleId=useId(),path=usePathname();
 const openedRoute=useRef('');
 const previousInitial=useRef(initialOpen);
 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{if(previousInitial.current!==initialOpen){previousInitial.current=initialOpen;setOpen(initialOpen);}},[initialOpen]);
 function finish(){
  if(dialog.current?.open)dialog.current.close();
  setOpen(false);
  requestAnimationFrame(()=>button.current?.focus());
 }
 function close(){
  const panel=dialog.current;if(!panel)return;
  if(panel.querySelector('[aria-busy="true"]'))return;
  requestDiscard({container:panel,trigger:closeButton.current,proceed:finish});
 }
 useEffect(()=>{
  const panel=dialog.current;
  if(!open||!mounted||!panel)return;
  openedRoute.current=window.location.pathname+window.location.search;
  if(!panel.open)panel.showModal();
  closeButton.current?.focus();
  const onCloseRequest=(event:Event)=>{event.preventDefault();close();};
  const saved=(event:Event)=>{const form=(event as CustomEvent<HTMLFormElement>).detail;if(form instanceof HTMLFormElement&&panel.contains(form))finish();};
  document.addEventListener('sc:form-saved',saved);
  panel.addEventListener('sc:panel-close',onCloseRequest);
  return()=>{document.removeEventListener('sc:form-saved',saved);panel.removeEventListener('sc:panel-close',onCloseRequest);if(panel.open)panel.close();};
 },[open,mounted]);
 useEffect(()=>{
  if(!open||!mounted)return;
  const check=()=>{
   const current=window.location.pathname+window.location.search;
   if(current===openedRoute.current)return;
   const msg=new URLSearchParams(window.location.search).get('msg')??'';
   if(window.location.pathname!==openedRoute.current.split('?')[0]||['ok','salvato','eliminato','modificato','rimosso','iscritto','moduli_salvati','lezione_creata','salvata','annullata','pagato','rettificato','componente_ok','avviata','bozza_ok','modificata','approvato'].includes(msg))finish();
  };
  const observer=new MutationObserver(check);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('popstate',check);
  return()=>{observer.disconnect();window.removeEventListener('popstate',check);};
 },[path,open,mounted]);
 return <>
 <button ref={button} type="button" className={'sc-button '+(danger?'sc-button-danger':primary?'sc-button-primary':'sc-button-secondary')} aria-haspopup="dialog" onClick={()=>setOpen(true)}>{trigger}</button>
 {mounted&&open&&createPortal(<dialog ref={dialog} data-sc-panel className={'sc-editor-dialog sc-editor-'+variant} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <div className="sc-editor-inner">
   <header className="sc-editor-header"><h2 id={titleId}>{title}</h2><button ref={closeButton} type="button" className="sc-icon-button" aria-label="Chiudi pannello" onClick={close}><Icon name="close"/></button></header>
   <div className="sc-editor-body">{children}</div>
  </div>
 </dialog>,document.body)}
 </>;
}
export function Modal(props:Omit<Props,'variant'>){return <Drawer {...props} variant="modal"/>;}
export function ConfirmDialog(props:Omit<Props,'variant'|'danger'>){return <Drawer {...props} variant="modal" danger/>;}
