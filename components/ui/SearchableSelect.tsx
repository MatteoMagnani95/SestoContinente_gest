'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
type Option={value:string;label:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('it');
export default function SearchableSelect({name,id,options,value='',required=false,label,'aria-describedby':describedBy}:{name:string;id:string;options:Option[];value?:string;required?:boolean;label:string;'aria-describedby'?:string}){
 const searchId=useId(),root=useRef<HTMLDivElement>(null);
 const [query,setQuery]=useState(''),[selected,setSelected]=useState(value);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setQuery('');setSelected(value);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[value]);
 useEffect(()=>setSelected(value),[value]);
 const indexed=useMemo(()=>options.map(option=>({option,normalized:normalize(option.label)})),[options]);
 const normalizedQuery=normalize(query.trim());
 const visible=useMemo(()=>normalizedQuery?indexed.filter(({option,normalized})=>option.value===selected||normalized.includes(normalizedQuery)).map(({option})=>option):options,[indexed,normalizedQuery,options,selected]);
 return <div ref={root} className="sc-reference-select">
 {options.length>12&&<><label htmlFor={searchId} className="sc-field-hint">Cerca tra le opzioni: {label}</label><input id={searchId} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtra l’elenco" data-dirty-ignore/><span className="sc-field-hint" aria-live="polite">{visible.length} opzioni</span></>}
 <select aria-label={label} aria-describedby={describedBy} id={id} name={name} required={required} value={selected} data-dirty-initial={value} onChange={e=>setSelected(e.target.value)}>
 <option value="">Seleziona…</option>{selected&&!options.some(o=>o.value===selected)&&<option value={selected}>Valore attuale non disponibile</option>}{visible.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
 </select></div>;
}
