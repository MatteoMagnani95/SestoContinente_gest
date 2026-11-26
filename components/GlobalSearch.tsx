'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {globalSearch} from '@/app/global-search-actions';
import {searchWords,type SearchResponse} from '@/lib/global-search';
import {Icon} from '@/components/ui/Icon';
const initial:SearchResponse={results:[],partial:false};
export default function GlobalSearch(){
 const path=usePathname(),dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[response,setResponse]=useState(initial),[loading,setLoading]=useState(false);
 const serial=useRef(0);
 function close(restore=true){serial.current++;dialog.current?.close();setOpen(false);setQuery('');setResponse(initial);setLoading(false);if(restore)trigger.current?.focus();}
 function show(){if(document.querySelector('dialog[open]'))return;dialog.current?.showModal();setOpen(true);input.current?.focus();}
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!e.altKey&&!e.shiftKey){if(document.querySelector('dialog[open]'))return;e.preventDefault();show();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useEffect(()=>{close(false);},[path]);
 useEffect(()=>{
  if(!open||!searchWords(query).length){setLoading(false);return;}
  const token=++serial.current;
  const timer=window.setTimeout(async()=>{try{const result=await globalSearch(query);if(serial.current===token)setResponse(result);}catch{if(serial.current===token)setResponse({results:[],partial:true});}finally{if(serial.current===token)setLoading(false);}},300);
  return()=>{window.clearTimeout(timer);serial.current++;};
 },[query,open]);
 const groups=[...new Set(response.results.map(r=>r.category))];
 const links=()=>Array.from(dialog.current?.querySelectorAll<HTMLAnchorElement>('[data-search-result]')??[]);
 return <>
 <button ref={trigger} type="button" className="sc-global-search-trigger" aria-label="Ricerca globale" aria-haspopup="dialog" aria-expanded={open} aria-keyshortcuts="Control+K Meta+K" onClick={show}><Icon name="search"/><span>Cerca nel gestionale</span><kbd>⌘/Ctrl K</kbd></button>
 <dialog ref={dialog} className="sc-global-search-dialog" aria-labelledby="sc-global-search-title" onCancel={e=>{e.preventDefault();close();}} onClose={()=>{setOpen(false);}} onClick={e=>{if(e.target===e.currentTarget)close();}} onKeyDown={e=>{
  if(e.key!=='ArrowDown'&&e.key!=='ArrowUp'&&e.key!=='Enter')return;
  const entries=links();if(!entries.length)return;const i=entries.indexOf(document.activeElement as HTMLAnchorElement);
  if(e.key==='Enter'){if(document.activeElement===input.current){e.preventDefault();entries[0].click();}return;}
  if(document.activeElement!==input.current&&i<0)return;
  e.preventDefault();if(e.key==='ArrowDown')entries[Math.min(i+1,entries.length-1)].focus();else if(i<=0)input.current?.focus();else entries[i-1].focus();
 }}>
 <div className="sc-global-search-inner"><header><h2 id="sc-global-search-title">Cerca nel gestionale</h2><button type="button" className="sc-icon-button" aria-label="Chiudi ricerca" onClick={()=>close()}><Icon name="close"/></button></header>
 <label htmlFor="sc-global-query">Nome, corso, evento, documento o attrezzatura</label>
 <input id="sc-global-query" ref={input} type="search" autoComplete="off" maxLength={80} value={query} placeholder="Digita almeno 2 caratteri" onChange={e=>{serial.current++;setQuery(e.target.value);setResponse(initial);setLoading(searchWords(e.target.value).length>0);}}/>
 <div className="sc-global-search-results" aria-busy={loading}>
 <p role="status" aria-live="polite">{!searchWords(query).length?'Inserisci almeno due caratteri.':loading?'Ricerca in corso…':response.denied?'Ricerca non autorizzata. Accedi nuovamente.':response.partial?'Risultati limitati o parzialmente non disponibili.':response.results.length?response.results.length+' risultati':'Nessun risultato accessibile.'}</p>
 {!loading&&groups.map(group=><section key={group}><h3>{group}</h3>{response.results.filter(r=>r.category===group).map(r=>r.category==='Documenti'?<a key={r.href} data-search-result href={r.href} onClick={()=>close(false)}><Icon name="document"/><span>{r.label}</span><Icon name="chevron-right"/></a>:<Link prefetch={false} key={r.href} data-search-result href={r.href} onClick={()=>close(false)}><Icon name={group==='Corsi'?'course':group==='Eventi'?'calendar':group==='Attrezzature'?'equipment':'users'}/><span>{r.label}</span><Icon name="chevron-right"/></Link>)}</section>)}
 </div><p className="sc-search-help">Solo risultati autorizzati · ↑ ↓ per navigare · Invio per aprire · Esc per chiudere</p></div>
 </dialog></>;
}
