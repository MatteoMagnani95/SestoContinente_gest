'use client';
import {useEffect,useRef,useState} from 'react';
type Option={id:string;editionId:string;course:string;person:string};
export default function CourseEnrollmentSelect({name,options}:{name:string;options:Option[]}){
 const [course,setCourse]=useState('');
 const [enrollment,setEnrollment]=useState('');
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const form=root.current?.closest('form');
  const reset=()=>{setCourse('');setEnrollment('');};
  form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);
 },[]);
 const courses=[...new Map(options.map(o=>[o.editionId,o.course])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'it'));
 const students=options.filter(o=>o.editionId===course).sort((a,b)=>a.person.localeCompare(b.person,'it'));
 return <div ref={root} className="stack">
  <label>Corso stagionale attivo<select required value={course} onChange={e=>{setCourse(e.target.value);setEnrollment('');}}><option value="">{courses.length?'Seleziona un corso…':'Nessun corso attivo con iscritti confermati'}</option>{courses.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <label>Allievo iscritto<select name={name} required disabled={!course} value={enrollment} onChange={e=>setEnrollment(e.target.value)}><option value="">{course?'Seleziona l’allievo…':'Seleziona prima il corso'}</option>{students.map(o=><option key={o.id} value={o.id}>{o.person}</option>)}</select></label>
  <span className="hint">Le quote sono associate a una specifica iscrizione confermata nella stagione attiva.</span>
 </div>;
}
