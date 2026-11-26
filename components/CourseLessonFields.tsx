'use client';
import {useEffect,useRef,useState} from 'react';
import CourseLanePicker,{type PoolOption,type LaneOption} from '@/components/CourseLanePicker';
export default function CourseLessonFields({pools,lanes,initialPool=''}:{pools:PoolOption[];lanes:LaneOption[];initialPool?:string}){
 const [kind,setKind]=useState(initialPool?'piscina':'teoria'),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{const form=root.current?.closest('form');const reset=()=>setKind(initialPool?'piscina':'teoria');form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[initialPool]);
 return <div ref={root} className="stack"><label>Tipo di lezione<select name="tipo_lezione" value={kind} onChange={e=>setKind(e.target.value)}><option value="teoria">Teoria / senza piscina</option><option value="piscina">In piscina</option></select></label>
 {kind==='piscina'?<CourseLanePicker pools={pools} lanes={lanes} initialPool={initialPool} requirePool/>:<input type="hidden" name="piscina_id" value=""/>}
 <label>Esercizi<textarea name="esercizi" rows={3} maxLength={2000}/></label><label>Materiale necessario<textarea name="materiale" rows={2} maxLength={1000}/></label>
 <p className="tiny muted">Dopo il salvataggio puoi associare i moduli didattici alla lezione. Lezione e prenotazioni vengono create insieme.</p>
 <button type="submit" className="button">{kind==='piscina'?'Crea lezione e prenota corsie':'Crea lezione senza piscina'}</button></div>;
}
