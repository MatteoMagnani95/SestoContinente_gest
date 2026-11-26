'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {cancelForm,controlValue,isDirty,reconcile,snapshot,trackedForm,type Snapshot,type DiscardRequest} from '@/lib/dirty-navigation';

const WARNING='Hai effettuato modifiche che non sono ancora state salvate. Vuoi uscire senza salvarle?';
type Pending={proceed:()=>void;trigger:HTMLElement|null};
type HistoryNavigation=EventTarget&{currentEntry?:{key:string};traverseTo?:(key:string)=>unknown};
type TraverseEvent=Event&{navigationType?:string;destination?:{key:string;sameDocument:boolean}};
/** Transitional adapter: legacy forms keep a single Annulla button; actual navigation is separate. */
export default function GlobalCancelButtons(){
 const path=usePathname();
 const dialog=useRef<HTMLDialogElement>(null),pending=useRef<Pending|null>(null),discardButton=useRef<HTMLButtonElement>(null);
 const state=useRef(new Map<HTMLFormElement,Snapshot>());
 const bypass=useRef(false);
 const syncRef=useRef<()=>void>(()=>{});
 const mountedPath=useRef(path);
 function resolve(leave:boolean){
  const request=pending.current;pending.current=null;
  if(dialog.current?.open)dialog.current.close();
  if(!request)return;
  if(!leave){request.trigger?.focus();return;}
  bypass.current=true;
  try{request.proceed();}finally{bypass.current=false;syncRef.current();}
 }
 useEffect(()=>{
  const baselines=state.current;
  let unloadInstalled=false;
  let submitTimer:number|undefined;
  let submitting:HTMLFormElement|null=null;
  const dirtyForms=(scope?:HTMLFormElement)=>{
   const result:HTMLFormElement[]=[];
   for(const [form,baseline] of baselines){
    if(!form.isConnected){baselines.delete(form);continue;}
    if((!scope||scope===form)&&isDirty(form,baseline))result.push(form);
   }
   return result;
  };
  const beforeUnload=(event:BeforeUnloadEvent)=>{
   if(bypass.current||!dirtyForms().some(form=>form!==submitting))return;
   event.preventDefault();event.returnValue='';
  };
  const syncUnload=()=>{
   const needed=dirtyForms().length>0;
   if(needed&&!unloadInstalled){window.addEventListener('beforeunload',beforeUnload);unloadInstalled=true;}
   else if(!needed&&unloadInstalled){window.removeEventListener('beforeunload',beforeUnload);unloadInstalled=false;}
  };
  const installCancel=(form:HTMLFormElement)=>{
   if(form.hasAttribute('data-dirty-form')&&!form.classList.contains('edit-fields-form'))return;
   if(form.querySelector('[data-cancel-form]')||[...form.querySelectorAll('a,button')].some(el=>/^(annulla(?:\s*\/\s*torna indietro)?|torna indietro)$/i.test((el.textContent??'').trim())))return;
   const submit=[...form.querySelectorAll<HTMLButtonElement>('button[type="submit"],button:not([type])')];
   if(!submit.some(b=>/salva|crea |registra |aggiungi |invia alla segreteria|aggiorna |assegna |collega account|sostituisci/i.test(b.textContent??'')))return;
   if(submit.some(b=>/elimina|rimuovi|disiscriviti|annulla lezione|conferma annullamento|storna/i.test(b.textContent??'')))return;
   const button=document.createElement('button');button.type='button';button.className='button ghost global-cancel';button.textContent='Annulla';button.setAttribute('data-cancel-form','');
   button.addEventListener('click',()=>cancelForm(form,button));
   submit[submit.length-1].insertAdjacentElement('afterend',button);
  };
  const scan=()=>{
   for(const form of document.querySelectorAll<HTMLFormElement>('form')){
    if(!trackedForm(form))continue;
    if(!baselines.has(form))baselines.set(form,snapshot(form,true));
    else reconcile(form,baselines.get(form)!);
    installCancel(form);
   }
   syncUnload();
  };
  syncRef.current=scan;
  const ask=(proceed:()=>void,trigger:HTMLElement|null)=>{
   if(pending.current)return;
   if(!dialog.current||typeof dialog.current.showModal!=='function'){if(window.confirm(WARNING)){bypass.current=true;try{proceed();}finally{bypass.current=false;scan();}}return;}
   pending.current={proceed,trigger};
   dialog.current.showModal();
  };
  const onClick=(event:MouseEvent)=>{
   if(bypass.current||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||!(event.target instanceof Element))return;
   const target=event.target;
   const anchor=target.closest<HTMLAnchorElement>('a[href]');
   if(anchor){
    if(anchor.target&&anchor.target!=='_self'||anchor.hasAttribute('download'))return;
    const href=anchor.getAttribute('href')??'';
    if(!href||/^(mailto:|tel:|javascript:)/i.test(href))return;
    const url=new URL(anchor.href,window.location.href);
    if(url.pathname===window.location.pathname&&url.search===window.location.search&&url.hash&&href.startsWith('#'))return;
    if(!dirtyForms().length)return;
    event.preventDefault();event.stopImmediatePropagation();
    ask(()=>{if(anchor.isConnected)anchor.click();},anchor);return;
   }
   const summary=target.closest('summary'),details=summary?.parentElement;
   if(summary&&details instanceof HTMLDetailsElement&&details.open){
    const changed=dirtyForms().filter(form=>details.contains(form));
    if(changed.length){event.preventDefault();event.stopImmediatePropagation();ask(()=>{for(const f of changed)f.reset();details.open=false;summary.focus();},summary);}
    return;
   }
   const reset=target.closest<HTMLButtonElement>('button[type="reset"],input[type="reset"]');
   if(reset?.form&&dirtyForms(reset.form).length){event.preventDefault();event.stopImmediatePropagation();ask(()=>reset.form?.reset(),reset);}
  };
  const onSubmit=(event:SubmitEvent)=>{
   const form=event.target;if(!(form instanceof HTMLFormElement))return;
   if(!bypass.current&&dirtyForms().some(other=>other!==form)){
    event.preventDefault();event.stopImmediatePropagation();
    const submitter=event.submitter as HTMLButtonElement|HTMLInputElement|null;
    ask(()=>{if(form.isConnected)form.requestSubmit(submitter??undefined);},submitter);return;
   }
   // A valid native submit may unload the document. Do not clear the baseline on submit:
   // validation/server failures still need a warning. Release this short exemption automatically.
   submitting=form;
   window.clearTimeout(submitTimer);submitTimer=window.setTimeout(()=>{submitting=null;syncUnload();},1000);
  };
  const onDiscard=(event:Event)=>{
   const request=(event as CustomEvent<DiscardRequest>).detail;
   if(!request)return;event.preventDefault();
   if(bypass.current||!dirtyForms(request.form).length){request.proceed();scan();return;}
   ask(request.proceed,request.trigger??(document.activeElement instanceof HTMLElement?document.activeElement:null));
  };
  const onSaved=(event:Event)=>{
   const form=(event as CustomEvent<HTMLFormElement>).detail;
   if(form instanceof HTMLFormElement){baselines.set(form,snapshot(form));syncUnload();}
  };
  const onInput=()=>scan();
  const onReset=()=>queueMicrotask(scan);
  // The Navigation API can cancel some same-document traversals. Older browsers/uncancellable
  // popstate cannot be reliably stopped without corrupting Next.js history. No history rewriting.
  const navigation=(window as Window&{navigation?:HistoryNavigation}).navigation;
  const onNavigate=(event:Event)=>{
   const nav=event as TraverseEvent;
   if(bypass.current||nav.navigationType!=='traverse'||!nav.cancelable||!nav.destination?.sameDocument||!dirtyForms().length)return;
   if(!window.confirm(WARNING))event.preventDefault();
  };
  scan();
  const observer=new MutationObserver(scan);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',onClick,true);
  document.addEventListener('submit',onSubmit,true);
  document.addEventListener('input',onInput,true);
  document.addEventListener('change',onInput,true);
  document.addEventListener('reset',onReset,true);
  document.addEventListener('sc:discard-request',onDiscard);
  document.addEventListener('sc:form-saved',onSaved);
  navigation?.addEventListener('navigate',onNavigate);
  return()=>{
   observer.disconnect();
   document.removeEventListener('click',onClick,true);document.removeEventListener('submit',onSubmit,true);
   document.removeEventListener('input',onInput,true);document.removeEventListener('change',onInput,true);document.removeEventListener('reset',onReset,true);
   document.removeEventListener('sc:discard-request',onDiscard);document.removeEventListener('sc:form-saved',onSaved);
   navigation?.removeEventListener('navigate',onNavigate);window.removeEventListener('beforeunload',beforeUnload);
   window.clearTimeout(submitTimer);baselines.clear();syncRef.current=()=>{};
  };
 },[]);
 useEffect(()=>{
  if(mountedPath.current!==path){state.current.clear();mountedPath.current=path;if(pending.current)resolve(false);syncRef.current();}
 },[path]);
 return <dialog ref={dialog} className="sc-discard-dialog" aria-labelledby="sc-discard-title" aria-describedby="sc-discard-description" onCancel={event=>{event.preventDefault();resolve(false);}}>
  <h2 id="sc-discard-title">Modifiche non salvate</h2>
  <p id="sc-discard-description">{WARNING}</p>
  <div className="sc-form-actions">
   <button type="button" className="sc-button sc-button-secondary" autoFocus onClick={()=>resolve(false)}>Continua a modificare</button>
   <button type="button" ref={discardButton} className="sc-button sc-button-danger" onClick={()=>resolve(true)}>Esci senza salvare</button>
  </div>
 </dialog>;
}
