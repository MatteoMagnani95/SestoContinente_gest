'use client';
import {useState,useRef,useEffect} from 'react';
export default function BoardAdmissions({options}:{options:{id:string;label:string}[]}){
 const [query,setQuery]=useState(''),[selected,setSelected]=useState<string[]>([]),[review,setReview]=useState(false),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>{setQuery('');setSelected([]);setReview(false);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[]);
 const visible=options.filter(p=>p.label.toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it')));
 return <div ref={root} className="stack"><label>Cerca adesione<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <fieldset><legend>Adesioni da ammettere ({selected.length})</legend>{!visible.length&&<p>Nessuna adesione corrispondente.</p>}{visible.map(a=><label key={a.id} className="check-label"><input type="checkbox" checked={selected.includes(a.id)} onChange={e=>{setSelected(s=>e.target.checked?[...s,a.id]:s.filter(id=>id!==a.id));setReview(false);}}/>{a.label}</label>)}</fieldset>
 {selected.map(id=><input key={id} type="hidden" name="adesione_id" value={id}/>)}<input type="hidden" data-dirty-track data-dirty-initial="[]" value={JSON.stringify(selected)} readOnly/>
 <section className="sc-card"><h3>Riepilogo prima della votazione</h3>{selected.length?<ul>{options.filter(a=>selected.includes(a.id)).map(a=><li key={a.id}>{a.label}</li>)}</ul>:<p>Nessuna adesione selezionata.</p>}<label className="check-label"><input name="riepilogo" type="checkbox" required checked={review} onChange={e=>setReview(e.target.checked)}/> Ho verificato la selezione</label></section></div>;
}
