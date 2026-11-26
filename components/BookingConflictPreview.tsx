'use client';
import {useEffect,useRef,useState} from 'react';
import {checkBookingConflict} from '@/app/gestionale/calendario-visivo/actions';
import {UUID_RE,lessonInterval,formatRome} from '@/lib/course-tools';
import type {LanePreview} from '@/lib/calendar-tools';
type Preview=LanePreview|{status:'idle'}|{status:'pending'}|{status:'cancelled'};
export default function BookingConflictPreview(){
 const root=useRef<HTMLDivElement>(null),[preview,setPreview]=useState<Preview>({status:'idle'}),[revision,setRevision]=useState(0);
 useEffect(()=>{
  const form=root.current?.closest('form');if(!form)return;
  let generation=0,timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
  function refresh(){
   const current=++generation;if(timer)clearTimeout(timer);const data=new FormData(form!);
   if(data.get('stato')==='annullata'){setPreview({status:'cancelled'});return;}
   try{if(!UUID_RE.test(String(data.get('lezione_id')??''))||!UUID_RE.test(String(data.get('corsia_id')??''))||data.get('stato')!=='confermata')throw Error();lessonInterval(data);}catch{setPreview({status:'idle'});return;}
   setPreview({status:'pending'});timer=setTimeout(async()=>{try{const result=await checkBookingConflict(data);if(!disposed&&current===generation)setPreview(result);}catch{if(!disposed&&current===generation)setPreview({status:'error',message:'Verifica non disponibile.'});}},450);
  }
  const changed=(e:Event)=>{const target=e.target;if((target instanceof HTMLInputElement||target instanceof HTMLSelectElement)&&['lezione_id','corsia_id','inizio','fine','stato'].includes(target.name))refresh();};
  const reset=()=>{setTimeout(refresh,0);};form.addEventListener('input',changed);form.addEventListener('change',changed);form.addEventListener('reset',reset);refresh();
  return()=>{disposed=true;generation++;if(timer)clearTimeout(timer);form.removeEventListener('input',changed);form.removeEventListener('change',changed);form.removeEventListener('reset',reset);};
 },[revision]);
 useEffect(()=>{
  const form=root.current?.closest('form'),field=form?.elements.namedItem('fine');
  if(!(field instanceof HTMLInputElement))return;
  field.setCustomValidity(preview.status==='ready'&&preview.conflicts.length?'Corsia già prenotata: modifica l’intervallo.':preview.status==='error'?preview.message:preview.status==='pending'?'Attendi la verifica delle prenotazioni.':'');
  return()=>field.setCustomValidity('');
 },[preview]);
 return <div ref={root} className="sc-card"><strong>Verifica prenotazione</strong><div role="status" aria-live="polite">
 {preview.status==='idle'?'Seleziona lezione, corsia, intervallo e stato.':preview.status==='pending'?'Controllo in corso…':preview.status==='cancelled'?'Una prenotazione annullata non occupa la corsia.':preview.status==='error'?preview.message:preview.conflicts.length?<><p>Conflitto con una prenotazione confermata:</p><ul>{preview.conflicts.map(b=><li key={b.id}>{formatRome(b.inizio)} – {formatRome(b.fine)}</li>)}</ul></>:'Nessuna sovrapposizione registrata nell’intervallo. Disponibilità contrattuale non verificata.'}
 </div><button type="button" className="sc-button sc-button-secondary" onClick={()=>setRevision(n=>n+1)} disabled={preview.status==='pending'}>Aggiorna verifica</button><p className="tiny muted">Il database controlla nuovamente tutti i vincoli al salvataggio.</p></div>;
}
