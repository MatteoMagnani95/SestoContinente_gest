'use client';
import {useEffect,useId,useRef,useState} from 'react';
type Option={value:string;label:string};
export default function SearchableSelect({name,id,options,value='',required=false,label}:{name:string;id:string;options:Option[];value?:string;required?:boolean;label:string}){
 const searchId=useId(),root=useRef<HTMLDivElement>(null);
 const [query,setQuery]=useState(''),[selected,setSelected]=useState(value);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setQuery('');setSelected(value);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[value]);
 useEffect(()=>setSelected(value),[value]);
 const normalize=(s:string)=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('it');
 const visible=options.filter(o=>o.value===selected||normalize(o.label).includes(normalize(query.trim())));
 return <div ref={root} className="sc-reference-select">
 {options.length>12&&<><label htmlFor={searchId} className="sc-field-hint">Cerca tra le opzioni: {label}</label><input id={searchId} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filtra l’elenco" data-dirty-ignore/><span className="sc-field-hint" aria-live="polite">{visible.length} opzioni</span></>}
 <select id={id} name={name} required={required} value={selected} data-dirty-initial={value} onChange={e=>setSelected(e.target.value)}>
 <option value="">Seleziona…</option>{selected&&!options.some(o=>o.value===selected)&&<option value={selected}>Valore attuale non disponibile</option>}{visible.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
 </select></div>;
}
