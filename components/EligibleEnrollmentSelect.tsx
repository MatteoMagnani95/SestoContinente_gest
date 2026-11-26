"use client";
import {useEffect,useRef,useState} from 'react';
type Edition={id:string;nome:string;stagione_id:string;stato:string};
type Eligible={persona_id:string;stagione_id:string;nome:string;cognome:string};
export default function EligibleEnrollmentSelect({editions,eligible}:{editions:Edition[];eligible:Eligible[]}){
 const [edition,setEdition]=useState('');const [person,setPerson]=useState('');
 const select=useRef<HTMLSelectElement>(null);
 useEffect(()=>{const form=select.current?.closest('form');const reset=()=>{setEdition('');setPerson('');};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[]);
 const season=editions.find(e=>e.id===edition)?.stagione_id;
 const people=eligible.filter(p=>p.stagione_id===season).sort((a,b)=>a.cognome.localeCompare(b.cognome,'it')||a.nome.localeCompare(b.nome,'it'));
 return <><label>Corso stagionale<select ref={select} name="edizione_id" required value={edition} onChange={e=>{setEdition(e.target.value);setPerson('');}}><option value="">Seleziona...</option>{editions.filter(e=>['programmato','attivo'].includes(e.stato)).sort((a,b)=>a.nome.localeCompare(b.nome,'it')).map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></label><label>Socio tesserato<select name="persona_id" required value={person} onChange={e=>setPerson(e.target.value)}><option value="">{people.length?'Seleziona...':'Nessun socio iscrivibile'}</option>{people.map(p=><option key={p.persona_id} value={p.persona_id}>{p.cognome} {p.nome}</option>)}</select></label><label>Stato<input readOnly value="Iscritto"/><input type="hidden" name="stato" value="iscritto"/></label></>;
}
