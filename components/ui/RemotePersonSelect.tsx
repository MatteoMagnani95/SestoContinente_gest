'use client';
import {useEffect,useId,useRef,useState} from 'react';
type Option={value:string;label:string};
type Result={count:number;options:Option[];selected:Option|null};
export default function RemotePersonSelect({id,name,label,value='',initial}:{id:string;name:string;label:string;value?:string;initial:Result}){
 const searchId=useId(),root=useRef<HTMLDivElement>(null);
 const [query,setQuery]=useState(''),[page,setPage]=useState(1),[selected,setSelected]=useState(value),[result,setResult]=useState(initial),[chosen,setChosen]=useState<Option|null>(initial.selected??initial.options.find(o=>o.value===value)??null),[busy,setBusy]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{setSelected(value);setChosen(initial.selected??initial.options.find(o=>o.value===value)??null);setResult(initial);setQuery('');setPage(1);},[value,initial]);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setQuery('');setPage(1);setSelected(value);setChosen(initial.selected??null);setResult(initial);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[initial,value]);
 useEffect(()=>{
  if(!query&&page===1&&retry===0){setResult(initial);setBusy(false);setError(false);return;}
  const controller=new AbortController();let live=true;setBusy(true);setError(false);
  const timer=setTimeout(async()=>{
   try{
    const params=new URLSearchParams({q:query,p:String(page),selected});
    const response=await fetch('/gestionale/incassi/person-options?'+params,{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw Error('search');
    const data=await response.json() as Result;
    if(!live)return;setResult(data);if(data.selected)setChosen(data.selected);setBusy(false);
   }catch{if(live&&!controller.signal.aborted){setError(true);setBusy(false);}}
  },250);
  return()=>{live=false;clearTimeout(timer);controller.abort();};
 },[query,page,selected,initial,retry]);
 const options=chosen&&chosen.value===selected&&!result.options.some(o=>o.value===selected)?[chosen,...result.options]:result.options;
 return <div ref={root} className="sc-reference-select">
  <label htmlFor={searchId} className="sc-field-hint">Cerca tra le opzioni: {label}</label>
  <input id={searchId} type="search" value={query} maxLength={120} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="Filtra l’elenco" data-dirty-ignore/>
  <span className="sc-field-hint" aria-live="polite">{busy?'Ricerca in corso…':error?'Ricerca non disponibile. Riprova.':result.count+' opzioni'}</span>
  <select id={id} name={name} aria-label={label} value={selected} data-dirty-initial={value} onChange={e=>{setSelected(e.target.value);setChosen(options.find(o=>o.value===e.target.value)??null);}}>
   <option value="">Seleziona…</option>{selected&&!options.some(o=>o.value===selected)&&<option value={selected}>Valore attuale non disponibile</option>}{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
  {error?<button type="button" className="sc-button sc-button-secondary" data-dirty-ignore onClick={()=>setRetry(n=>n+1)}>Riprova ricerca</button>:result.count>50&&<div className="sc-actions"><button type="button" className="sc-button sc-button-secondary" disabled={page<=1||busy} data-dirty-ignore onClick={()=>setPage(p=>p-1)}>Precedente</button><button type="button" className="sc-button sc-button-secondary" disabled={page*50>=result.count||busy} data-dirty-ignore onClick={()=>setPage(p=>p+1)}>Successiva</button></div>}
 </div>;
}
