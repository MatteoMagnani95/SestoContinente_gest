'use client';
import {useEffect,useRef,useState} from 'react';
import CancelEditButton from '@/components/CancelEditButton';
import {saveLessonModules} from '@/app/gestionale/corsi/actions';
type Modulo={id:string;tipo:string;codice:string;titolo:string};
export default function LessonComposer({edizioneId,lezioneId,moduli,initial}:{edizioneId:string;lezioneId:string;moduli:Modulo[];initial:string[]}){
 const [selected,setSelected]=useState(initial);const [choice,setChoice]=useState('');const [drag,setDrag]=useState<string|null>(null);
 const formRef=useRef<HTMLFormElement>(null);
 useEffect(()=>{const form=formRef.current;const reset=()=>{setSelected(initial);setChoice('');setDrag(null);};form?.addEventListener('reset',reset);return()=>form?.removeEventListener('reset',reset);},[initial]);
 function reorder(target:string){if(!drag||drag===target)return;setSelected(prev=>{const a=prev.filter(x=>x!==drag);a.splice(a.indexOf(target),0,drag);return a;});setDrag(null);}
 return <form ref={formRef} action={saveLessonModules} className="stack">
 <input type="hidden" data-dirty-track data-dirty-initial={JSON.stringify(initial)} value={JSON.stringify(selected)} readOnly/>
 <input type="hidden" name="edizione_id" value={edizioneId}/><input type="hidden" name="lezione_id" value={lezioneId}/>
 <div className="course-inline-form"><label>Aggiungi modulo<select value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Seleziona...</option>{moduli.filter(m=>!selected.includes(m.id)).map(m=><option key={m.id} value={m.id}>{m.tipo} · {m.codice} · {m.titolo}</option>)}</select></label>
 <button type="button" className="button ghost" disabled={!choice} onClick={()=>{setSelected(prev=>[...prev,choice]);setChoice('');}}>Aggiungi</button></div>
 <ol className="lesson-module-order">{selected.map((id,i)=>{const m=moduli.find(x=>x.id===id);return <li draggable key={id} onDragStart={()=>setDrag(id)} onDragOver={e=>e.preventDefault()} onDrop={()=>reorder(id)} onDragEnd={()=>setDrag(null)}>
  <input type="hidden" name="modulo_id" value={id}/><span>↕ {i+1}. {m?.codice} · {m?.titolo}</span>
  <button className="button ghost" type="button" disabled={i===0} aria-label="Sposta modulo in alto" onClick={()=>setSelected(v=>{const next=[...v];[next[i-1],next[i]]=[next[i],next[i-1]];return next;})}>Su</button><button className="button ghost" type="button" disabled={i===selected.length-1} aria-label="Sposta modulo in basso" onClick={()=>setSelected(v=>{const next=[...v];[next[i+1],next[i]]=[next[i],next[i+1]];return next;})}>Giù</button><button className="button ghost" type="button" onClick={()=>setSelected(v=>v.filter(x=>x!==id))}>Rimuovi</button></li>;})}</ol>
 <p className="tiny muted">Trascina i moduli o usa Su e Giù per cambiarne l'ordine. La stessa lezione può contenere più moduli di piscina e teoria.</p>
 <div className="form-actions"><button type="submit" className="button">Salva composizione</button><CancelEditButton/></div>
 </form>;
}
